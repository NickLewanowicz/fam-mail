import { join } from 'path'
import { file } from 'bun'
import { handlePostcardCreate } from './routes/postcards'
import { handleEmailWebhook, handleWebhookHealth } from './routes/webhook'
import { getConfig } from './config'
import { Database } from './database'
import { IMAPService } from './services/imap'
import { PostGridService, setPostgridService } from './services/postgrid'
import { OIDCService } from './services/oidcService'
import { JWTService } from './services/jwtService'
import { AuthMiddleware } from './middleware/auth'
import { ApiKeyMiddleware } from './middleware/apiKey'
import { RateLimiter, getClientIp } from './middleware/rateLimit'
import { jsonResponse } from './middleware/headers'
import { applyHeaders, createCorsResponse } from './middleware/headers'
import { setupAuthRoutes } from './routes/auth'
import { DraftRoutes } from './routes/drafts'
import { startScheduledDraftDispatcher } from './services/scheduler'
import type { LLMConfig } from './services/llm'
import { logger } from './utils/logger'
import pkg from '../../package.json'

// Rate limiters — per-endpoint tuning to balance UX and abuse prevention
const authRateLimiter = new RateLimiter(10, 60_000) // 10/min auth
const postcardRateLimiter = new RateLimiter(5, 60_000) // 5/min postcards (costs real money)
const webhookRateLimiter = new RateLimiter(20, 60_000) // 20/min webhooks
const draftRateLimiter = new RateLimiter(30, 60_000) // 30/min drafts
const agentRateLimiter = new RateLimiter(10, 60_000) // 10/min agent API (costs real money)

// Periodic cleanup of expired rate-limit entries and expired sessions
// to prevent memory/DB bloat (#49)
const CLEANUP_INTERVAL_MS = 5 * 60_000 // every 5 minutes

function runPeriodicCleanup(): void {
  // Rate limiter cleanup — remove expired entries from memory
  authRateLimiter.cleanup()
  postcardRateLimiter.cleanup()
  webhookRateLimiter.cleanup()
  draftRateLimiter.cleanup()
  agentRateLimiter.cleanup()

  // Session cleanup — delete expired sessions from DB
  try {
    const deleted = db.deleteExpiredSessions()
    if (deleted > 0) {
      logger.info('Cleaned up expired sessions', { deleted })
    }
  } catch (error) {
    logger.error('Failed to clean up expired sessions', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

// Periodic cleanup runs on an interval; the first run happens after the
// database exists (started below) — calling it earlier would crash on the
// not-yet-initialized `db`.
const cleanupTimer = setInterval(runPeriodicCleanup, CLEANUP_INTERVAL_MS)
// Don't prevent process exit
if (cleanupTimer.unref) cleanupTimer.unref()

/** Helper: check rate limit and return 429 if exceeded. */
function checkRateLimit(limiter: RateLimiter, req: Request): Response | null {
  const { allowed, retryAfterMs } = limiter.check(getClientIp(req))
  if (!allowed) {
    return jsonResponse({ error: 'Too many requests', retryAfter: retryAfterMs }, 429, req)
  }
  return null
}

/**
 * Authenticate a JWT request. Returns the user, or a 401 Response ready to
 * send — callers branch on `instanceof Response`.
 */
async function requireAuth(req: Request): Promise<User | Response> {
  const authResult = await authMiddleware.authenticate(req)
  if (authResult.error) {
    return jsonResponse({ error: authResult.error }, 401, req)
  }
  return authResult.user!
}

const config = getConfig()
const db = new Database(config.database.path)

// First cleanup pass now that the database is open
runPeriodicCleanup()

// Initialize OIDC service (skipped in dev mode)
let oidcService: OIDCService | null = null
if (!config.devMode) {
  oidcService = new OIDCService({
    issuerUrl: config.oidc.issuerUrl,
    clientId: config.oidc.clientId,
    clientSecret: config.oidc.clientSecret,
    redirectUri: config.oidc.redirectUri,
    scopes: config.oidc.scopes,
  }, db)
  await oidcService.initialize()
} else {
  logger.info('DEV_MODE enabled — OIDC authentication bypassed')
}

// Initialize JWT service
const jwtService = new JWTService({
  secret: config.jwt.secret,
  expiresIn: config.jwt.expiresIn,
  refreshExpiresIn: config.jwt.refreshExpiresIn,
})

// Initialize auth middleware
const authMiddleware = new AuthMiddleware(jwtService, db)

// Setup auth routes — ALWAYS constructed (ISSUE-0121: the ticket-exchange
// route must exist in every boot mode). In dev mode the oidc service is
// null and the login/callback routes are pre-empted by the dev branches
// above, so the oidcService parameter is never dereferenced through the
// dispatch.
const authRoutes = setupAuthRoutes(oidcService as OIDCService, jwtService, authMiddleware, db)

// Initialize PostGrid (before DraftRoutes, which depends on it)
const postgrid = new PostGridService({
  mode: config.postgrid.mode,
  testApiKey: config.postgrid.testApiKey,
  liveApiKey: config.postgrid.liveApiKey,
  forceTestMode: config.postgrid.forceTestMode,
  mockMode: config.postgrid.mockMode,
  webhookSecret: config.postgrid.webhookSecret,
  size: config.postgrid.size,
  senderId: config.postgrid.senderId,
  // D3: country-aware price estimates ride the status payload
  pricing: config.postgrid.pricing,
})

// Register the PostGrid service so routes can access it via import
setPostgridService(postgrid)

// Setup drafts routes
const draftRoutes = new DraftRoutes(db, authMiddleware, postgrid)

// Machine API key auth for the /api/v1 agent API
const apiKeyMiddleware = new ApiKeyMiddleware(db, config.apiKeys)

// Fire scheduled postcards (birthdays, anniversaries) on a short interval
startScheduledDraftDispatcher(db, draftRoutes)

// Initialize IMAP service (optional — only if IMAP_HOST is configured)
let imap: IMAPService | null = null
if (config.imap) {
  imap = new IMAPService(
    config.imap,
    db,
    {
      provider: config.llm.provider,
      apiKey: config.llm.apiKey,
      model: config.llm.model,
      endpoint: config.llm.endpoint,
      maxTokens: config.llm.maxTokens,
    } as LLMConfig,
    postgrid
  )

  // Start IMAP polling on server start
  imap.start().catch((error) => logger.error('IMAP service error', { error }))
}

const frontendDistPath = join(import.meta.dir, '../../frontend/dist')

/**
 * Global response wrapper that guarantees security + CORS headers on every
 * response. Acts as a safety net — route handlers now pass `req` to
 * `jsonResponse()` directly, so headers are applied consistently at the
 * point of creation. This wrapper ensures even edge cases (raw Response
 * objects, redirects) get the full header treatment.
 *
 * @see GitHub issue #34
 */
function withSecurityHeaders(response: Response, req: Request): Response {
  // applyHeaders is idempotent — calling it on a response that already has
  // the headers simply overwrites them with the same values.
  return applyHeaders(response, req)
}

/** Create (or reuse) the DEV_MODE user and mint a token pair for it. */
async function devLoginResponse(req: Request): Promise<Response> {
  const devEmail = 'dev@fammail.local'
  let user = db.getUserByEmail?.(devEmail)
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      oidcSub: 'dev-user',
      oidcIssuer: 'dev-mode',
      email: devEmail,
      emailVerified: true,
      firstName: 'Dev',
      lastName: 'User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    db.insertUser(user)
  }
  const accessToken = await jwtService.generateAccessToken(user)
  const refreshToken = await jwtService.generateRefreshToken(user)
  db.insertSession({
    id: crypto.randomUUID(),
    userId: user.id,
    token: accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  })
  return withSecurityHeaders(jsonResponse({ accessToken, refreshToken, user }, 200, req), req)
}

/**
 * ISSUE-0111: DEV_MODE refresh. Dev sessions store a real refresh token
 * (devLoginResponse), but authRoutes is not constructed in dev mode, so
 * refresh used to refuse outright and dev sessions died at access-token
 * expiry. Accept a refresh token backed by a session row and re-issue an
 * access token; the refresh token (and its 7d session window) stays valid.
 * Production OIDC refresh keeps using authRoutes — untouched.
 */
export async function devRefreshResponse(req: Request, db: Database, jwtService: JWTService): Promise<Response> {
  let body: { refreshToken?: string }
  try {
    body = await req.json() as { refreshToken?: string }
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400, req)
  }
  const refreshToken = body.refreshToken
  if (!refreshToken) {
    return jsonResponse({ error: 'Missing refresh token' }, 400, req)
  }

  // Verify the refresh JWT (rejects garbage/expired) and that a session
  // row backs it — both must hold
  try {
    await jwtService.verifyRefreshToken(refreshToken)
  } catch {
    return jsonResponse({ error: 'Invalid or expired refresh token' }, 401, req)
  }
  const session = db.getSessionByRefreshToken(refreshToken)
  if (!session) {
    return jsonResponse({ error: 'Refresh token not found' }, 401, req)
  }
  const user = db.getUserById(session.userId)
  if (!user) {
    return jsonResponse({ error: 'User not found' }, 401, req)
  }

  // Re-issue the access token; the refresh token and 7d session window
  // stay as they are (no rotation in dev — the client keeps its refresh)
  const accessToken = await jwtService.generateAccessToken(user)
  db.deleteSessionById(session.id)
  db.insertSession({
    id: crypto.randomUUID(),
    userId: user.id,
    token: accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  })
  db.deleteExpiredSessions()

  return jsonResponse({ accessToken, refreshToken }, 200, req)
}

export async function handleRequest(req: Request): Promise<Response> {
  try {
    return await routeRequest(req)
  } catch (error) {
    logger.error('Unhandled request error', {
      path: new URL(req.url).pathname,
      method: req.method,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
    })
    return jsonResponse({ error: 'Internal server error' }, 500, req)
  }
}

async function routeRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)

  if (req.method === 'OPTIONS') {
    return withSecurityHeaders(createCorsResponse(req), req)
  }

  // Dev mode: auto-login endpoint that creates/returns a dev user token
  if (config.devMode && url.pathname === '/api/auth/dev-login' && req.method === 'POST') {
    return devLoginResponse(req)
  }

  // Auth endpoints — rate limited to prevent brute-force attacks
  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    if (config.devMode) {
      // In dev mode, login is a convenience alias of dev-login
      const devResponse = await devLoginResponse(req)
      const body = await devResponse.json() as Record<string, unknown>
      return withSecurityHeaders(jsonResponse({ ...body, devMode: true }, 200, req), req)
    }
    const rateLimitResponse = checkRateLimit(authRateLimiter, req)
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)
    return withSecurityHeaders(await authRoutes!.handleAuthLogin(req), req)
  }

  if (url.pathname === '/api/auth/callback' && req.method === 'GET') {
    if (config.devMode) {
      return withSecurityHeaders(jsonResponse({ error: 'OIDC callback not available in dev mode' }, 400, req), req)
    }
    const rateLimitResponse = checkRateLimit(authRateLimiter, req)
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)
    return withSecurityHeaders(await authRoutes!.handleAuthCallback(req), req)
  }

  // ISSUE-0121 / ADR 0003: the SPA exchanges its one-time callback ticket
  // for the token pair here. authRoutes is ALWAYS constructed (see below),
  // so this serves in production and dev alike — dev mode never mints
  // tickets (the callback 400s), so the exchange simply hits the handler's
  // own guard (400/401).
  if (url.pathname === '/api/auth/callback/exchange' && req.method === 'POST') {
    const rateLimitResponse = checkRateLimit(authRateLimiter, req) // 10/min per IP, login-adjacent
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)
    return withSecurityHeaders(await authRoutes!.handleTokenExchange(req), req)
  }

  if (url.pathname === '/api/auth/me' && req.method === 'GET') {
    if (authRoutes) return withSecurityHeaders(await authRoutes.handleGetMe(req), req)
    // Dev mode fallback: use auth middleware directly
    const auth = await requireAuth(req)
    if (auth instanceof Response) return withSecurityHeaders(auth, req)
    return withSecurityHeaders(jsonResponse({ user: auth }, 200, req), req)
  }

  if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
    if (authRoutes) return withSecurityHeaders(await authRoutes.handleLogout(req), req)
    const auth = await requireAuth(req)
    if (auth instanceof Response) return withSecurityHeaders(auth, req)
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.substring(7)
    if (token) db.deleteSession(token)
    return withSecurityHeaders(jsonResponse({ message: 'Logged out successfully' }, 200, req), req)
  }

  if (url.pathname === '/api/auth/refresh' && req.method === 'POST') {
    if (authRoutes) {
      const rateLimitResponse = checkRateLimit(authRateLimiter, req)
      if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)
      return withSecurityHeaders(await authRoutes.handleAuthRefresh(req), req)
    }
    if (config.devMode) {
      // ISSUE-0111: dev sessions die at access-token expiry no more — the
      // dev session's refresh token re-issues an access token
      return withSecurityHeaders(await devRefreshResponse(req, db, jwtService), req)
    }
    return withSecurityHeaders(jsonResponse({ error: 'Token refresh not available in dev mode' }, 400, req), req)
  }

  // Drafts endpoints (all require authentication)
  // Write operations are rate limited (#42)
  if (url.pathname === '/api/drafts' && req.method === 'GET') {
    const auth = await requireAuth(req)
    if (auth instanceof Response) return withSecurityHeaders(auth, req)
    return withSecurityHeaders(await draftRoutes.list(req, auth), req)
  }

  if (url.pathname === '/api/drafts' && req.method === 'POST') {
    const rateLimitResponse = checkRateLimit(draftRateLimiter, req)
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)

    const auth = await requireAuth(req)
    if (auth instanceof Response) return withSecurityHeaders(auth, req)
    return withSecurityHeaders(await draftRoutes.create(req, auth), req)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+$/) && req.method === 'GET') {
    const auth = await requireAuth(req)
    if (auth instanceof Response) return withSecurityHeaders(auth, req)
    return withSecurityHeaders(await draftRoutes.get(req, auth), req)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+$/) && req.method === 'PUT') {
    const rateLimitResponse = checkRateLimit(draftRateLimiter, req)
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)

    const auth = await requireAuth(req)
    if (auth instanceof Response) return withSecurityHeaders(auth, req)
    return withSecurityHeaders(await draftRoutes.update(req, auth), req)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+$/) && req.method === 'DELETE') {
    const rateLimitResponse = checkRateLimit(draftRateLimiter, req)
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)

    const auth = await requireAuth(req)
    if (auth instanceof Response) return withSecurityHeaders(auth, req)
    return withSecurityHeaders(await draftRoutes.delete(req, auth), req)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+\/publish$/) && req.method === 'POST') {
    const rateLimitResponse = checkRateLimit(draftRateLimiter, req)
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)

    const auth = await requireAuth(req)
    if (auth instanceof Response) return withSecurityHeaders(auth, req)
    return withSecurityHeaders(await draftRoutes.publish(req, auth), req)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+\/schedule$/) && req.method === 'POST') {
    const rateLimitResponse = checkRateLimit(draftRateLimiter, req)
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)

    const auth = await requireAuth(req)
    if (auth instanceof Response) return withSecurityHeaders(auth, req)
    return withSecurityHeaders(await draftRoutes.schedule(req, auth), req)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+\/cancel-schedule$/) && req.method === 'POST') {
    const rateLimitResponse = checkRateLimit(draftRateLimiter, req)
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)

    const auth = await requireAuth(req)
    if (auth instanceof Response) return withSecurityHeaders(auth, req)
    return withSecurityHeaders(await draftRoutes.cancelSchedule(req, auth), req)
  }

  if (url.pathname === '/api/health' && req.method === 'GET') {
    // Check database health
    const dbHealth = db.checkHealth()
    
    // Check PostGrid health (async but we'll await it for health endpoint)
    const postgridHealth = await postgrid.checkHealth()
    
    // Determine overall status based on dependencies
    const anyDependencyDown = dbHealth.status === 'down' || postgridHealth.status === 'down'
    const overallStatus = anyDependencyDown ? 'degraded' : 'healthy'
    
    return withSecurityHeaders(
      jsonResponse(
        {
          status: overallStatus,
          version: pkg.version,
          timestamp: new Date().toISOString(),
          dependencies: {
            database: dbHealth,
            postgrid: postgridHealth,
          },
        },
        200,
        req
      ),
      req
    )
  }

  // #29: Debug endpoint only available in development mode
  if (url.pathname === '/api/test' && process.env.NODE_ENV !== 'production') {
    return withSecurityHeaders(jsonResponse({
      message: 'Hello from Fam Mail backend!',
      connected: true,
    }, 200, req), req)
  }

  // #30: Postcard creation requires authentication (PostGrid costs real money)
  // #42: Rate limited to prevent financial exposure
  // Oversized payloads (giant base64 images) would otherwise allocate before
  // validation runs — enforce a hard cap up front.
  if (url.pathname === '/api/postcards' && req.method === 'POST') {
    const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10)
    if (contentLength > 14 * 1024 * 1024) {
      return withSecurityHeaders(
        jsonResponse({ error: 'Request too large — images must be 10 MB or smaller' }, 413, req),
        req,
      )
    }
    const rateLimitResponse = checkRateLimit(postcardRateLimiter, req)
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)

    const auth = await requireAuth(req)
    if (auth instanceof Response) return withSecurityHeaders(auth, req)
    return withSecurityHeaders(await handlePostcardCreate(req, auth, db), req)
  }

  if (url.pathname === '/api/postcards' && req.method === 'GET') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return withSecurityHeaders(jsonResponse({ error: authResult.error }, 401, req), req)
    }
    const limitParam = parseInt(new URL(req.url).searchParams.get('limit') ?? '50', 10)
    const limit = Number.isNaN(limitParam) ? 50 : limitParam
    const postcards = db.listPostcardsByUser(authResult.user!.id, limit).map((record) => {
      // #109/#114: expose the persisted structured address as `to` and the
      // card content as `content`; the raw JSON columns stay internal
      const { recipientAddressJson, contentJson, ...card } = record
      const withContent: Record<string, unknown> = { ...card }
      if (contentJson) {
        try {
          withContent.content = JSON.parse(contentJson)
        } catch {
          /* tolerate a malformed row: omit content */
        }
      }
      if (!recipientAddressJson) return withContent
      try {
        return { ...withContent, to: JSON.parse(recipientAddressJson) }
      } catch {
        return withContent
      }
    })
    return withSecurityHeaders(jsonResponse({ data: postcards }, 200, req), req)
  }

  if (url.pathname === '/api/postgrid/status' && req.method === 'GET') {
    const auth = await requireAuth(req)
    if (auth instanceof Response) return withSecurityHeaders(auth, req)
    return withSecurityHeaders(jsonResponse(postgrid.getStatusPayload(), 200, req), req)
  }

  if (url.pathname === '/api/postgrid/mode' && req.method === 'POST') {
    const auth = await requireAuth(req)
    if (auth instanceof Response) return withSecurityHeaders(auth, req)
    const user = auth as User
    // #70: Only admins can toggle PostGrid test/live mode. When
    // ADMIN_EMAILS is unset we fail closed — an open toggle would let any
    // account on the instance switch to live mailing and spend real money.
    const adminEmails = config.adminEmails
    if (adminEmails.length === 0) {
      logger.warn('POST /api/postgrid/mode rejected: ADMIN_EMAILS is not configured')
      return withSecurityHeaders(jsonResponse({
        error: 'Forbidden: admin access required. Configure ADMIN_EMAILS to enable mode switching.',
      }, 403, req), req)
    }
    if (!adminEmails.includes(user.email.toLowerCase())) {
      return withSecurityHeaders(jsonResponse({ error: 'Forbidden: admin access required' }, 403, req), req)
    }
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return withSecurityHeaders(jsonResponse({ error: 'Invalid JSON body' }, 400, req), req)
    }
    const mode = (body as { mode?: unknown }).mode
    if (mode !== 'test' && mode !== 'live') {
      return withSecurityHeaders(
        jsonResponse({ error: 'mode must be "test" or "live"' }, 400, req),
        req
      )
    }
    try {
      postgrid.setRuntimeMode(mode)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set PostGrid mode'
      return withSecurityHeaders(jsonResponse({ error: message }, 400, req), req)
    }
    return withSecurityHeaders(jsonResponse(postgrid.getStatusPayload(), 200, req), req)
  }

  // ---------------------------------------------------------------------------
  // Agent API (/api/v1) — machine API key auth for integrations like Hermes,
  // OpenClaw, and automation scripts. API keys only; JWTs are not accepted.
  // Docs: docs/agent-api.md
  // ---------------------------------------------------------------------------

  if (url.pathname === '/api/v1/postcards' && req.method === 'POST') {
    const rateLimitResponse = checkRateLimit(agentRateLimiter, req)
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)

    const keyAuth = apiKeyMiddleware.authenticate(req)
    if (keyAuth.error) {
      return withSecurityHeaders(jsonResponse({ error: keyAuth.error }, 401, req), req)
    }
    // Same validation + PostGrid pipeline as the interactive web route.
    return withSecurityHeaders(await handlePostcardCreate(req, keyAuth.user, db), req)
  }

  if (url.pathname === '/api/v1/postcards' && req.method === 'GET') {
    const keyAuth = apiKeyMiddleware.authenticate(req)
    if (keyAuth.error) {
      return withSecurityHeaders(jsonResponse({ error: keyAuth.error }, 401, req), req)
    }
    const limitParam = parseInt(new URL(req.url).searchParams.get('limit') ?? '50', 10)
    const limit = Number.isNaN(limitParam) ? 50 : limitParam
    const postcards = db.listPostcardsByUser(keyAuth.user.id, limit)
    return withSecurityHeaders(jsonResponse({
      data: postcards.map((card) => ({
        id: card.id,
        postgridId: card.postgridPostcardId,
        recipientName: card.recipientName,
        recipientAddress: card.recipientAddress,
        status: card.status,
        mode: card.postgridMode,
        createdAt: card.createdAt,
      })),
    }, 200, req), req)
  }

  if (url.pathname.match(/^\/api\/v1\/postcards\/[^/]+$/) && req.method === 'GET') {
    const keyAuth = apiKeyMiddleware.authenticate(req)
    if (keyAuth.error) {
      return withSecurityHeaders(jsonResponse({ error: keyAuth.error }, 401, req), req)
    }
    const id = url.pathname.split('/')[4]
    const postcard = db.getPostcardForUser(id!, keyAuth.user.id)
    if (!postcard) {
      return withSecurityHeaders(jsonResponse({ error: 'Postcard not found' }, 404, req), req)
    }
    return withSecurityHeaders(jsonResponse({
      data: {
        id: postcard.id,
        postgridId: postcard.postgridPostcardId,
        recipientName: postcard.recipientName,
        recipientAddress: postcard.recipientAddress,
        status: postcard.status,
        mode: postcard.postgridMode,
        createdAt: postcard.createdAt,
      },
    }, 200, req), req)
  }

  if (url.pathname.startsWith('/api/v1/')) {
    return withSecurityHeaders(jsonResponse({ error: 'Not Found' }, 404, req), req)
  }

  // Email webhook endpoints — rate limited (#42)
  if (url.pathname === '/api/webhook/email' && req.method === 'POST') {
    const rateLimitResponse = checkRateLimit(webhookRateLimiter, req)
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)
    return withSecurityHeaders(await handleEmailWebhook(req), req)
  }

  if (url.pathname === '/api/webhook/health' && req.method === 'GET') {
    return withSecurityHeaders(await handleWebhookHealth(req), req)
  }

  if (config.server.nodeEnv === 'production' && !url.pathname.startsWith('/api')) {
    try {
      const filePath = join(frontendDistPath, url.pathname)

      const bunFile = file(filePath)
      if (await bunFile.exists()) {
        return withSecurityHeaders(new Response(bunFile), req)
      }

      const indexFile = file(join(frontendDistPath, 'index.html'))
      if (await indexFile.exists()) {
        return withSecurityHeaders(new Response(indexFile), req)
      }
    } catch (error) {
      logger.error('Error serving static file', { error })
    }
  }

  return withSecurityHeaders(jsonResponse({ error: 'Not Found' }, 404, req), req)
}

// Export for testing
export { db, jwtService, postgrid, imap, config, oidcService }
