import { join } from 'path'
import { file } from 'bun'
import { handlePostcardCreate } from './routes/postcards'
import { handleEmailWebhook, handleWebhookHealth } from './routes/webhook'
import { getConfig } from './config'
import { Database } from './database'
import { IMAPService } from './services/imap'
import { PostGridService, setPostgridService } from './services/postgrid'
import { NotificationService } from './services/notifications'
import { OIDCService } from './services/oidcService'
import { JWTService } from './services/jwtService'
import { AuthMiddleware } from './middleware/auth'
import { RateLimiter, getClientIp } from './middleware/rateLimit'
import { jsonResponse } from './utils/response'
import { applyHeaders, createCorsResponse } from './middleware/headers'
import { setupAuthRoutes } from './routes/auth'
import { DraftRoutes } from './routes/drafts'
import type { LLMConfig } from './services/llm'
import { logger } from './utils/logger'

// Rate limiters — per-endpoint tuning to balance UX and abuse prevention
const authRateLimiter = new RateLimiter(10, 60_000) // 10/min auth
const postcardRateLimiter = new RateLimiter(5, 60_000) // 5/min postcards (costs real money)
const webhookRateLimiter = new RateLimiter(20, 60_000) // 20/min webhooks
const draftRateLimiter = new RateLimiter(30, 60_000) // 30/min drafts

// Periodic cleanup of expired rate-limit entries and expired sessions
// to prevent memory/DB bloat (#49)
const CLEANUP_INTERVAL_MS = 5 * 60_000 // every 5 minutes

function runPeriodicCleanup(): void {
  // Rate limiter cleanup — remove expired entries from memory
  authRateLimiter.cleanup()
  postcardRateLimiter.cleanup()
  webhookRateLimiter.cleanup()
  draftRateLimiter.cleanup()

  // Session cleanup — delete expired sessions from DB
  try {
    const deleted = db.deleteExpiredSessions()
    if (deleted > 0) {
      logger.info('Cleaned up expired sessions', { deleted })
    }
  } catch (error) {
    logger.error('Failed to clean up expired sessions', { error })
  }
}

// Run cleanup immediately on startup
runPeriodicCleanup()

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

const config = getConfig()
const db = new Database(config.database.path)

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

// Setup auth routes (uses a dummy OIDC service in dev mode)
const authRoutes = oidcService
  ? setupAuthRoutes(oidcService, jwtService, authMiddleware, db)
  : null

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
})

// Register the PostGrid service so routes can access it via import
setPostgridService(postgrid)

// Setup drafts routes
const draftRoutes = new DraftRoutes(db, authMiddleware, postgrid)

// Initialize notifications
const notifications = new NotificationService({
  smtp: {
    host: process.env.SMTP_HOST || "localhost",
    port: parseInt(process.env.SMTP_PORT || "587"),
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
  },
  from: process.env.EMAIL_FROM || "noreply@fammail.com",
})

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

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)

  if (req.method === 'OPTIONS') {
    return withSecurityHeaders(createCorsResponse(req), req)
  }

  // Dev mode: auto-login endpoint that creates/returns a dev user token
  if (config.devMode && url.pathname === '/api/auth/dev-login' && req.method === 'POST') {
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

  // Auth endpoints — rate limited to prevent brute-force attacks
  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    if (config.devMode) {
      // In dev mode, redirect login to dev-login for convenience
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
      return withSecurityHeaders(jsonResponse({ devMode: true, accessToken, refreshToken, user }, 200, req), req)
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

  if (url.pathname === '/api/auth/me' && req.method === 'GET') {
    if (authRoutes) return withSecurityHeaders(await authRoutes.handleGetMe(req), req)
    // Dev mode fallback: use auth middleware directly
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) return withSecurityHeaders(jsonResponse({ error: authResult.error }, 401, req), req)
    return withSecurityHeaders(jsonResponse({ user: authResult.user }, 200, req), req)
  }

  if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
    if (authRoutes) return withSecurityHeaders(await authRoutes.handleLogout(req), req)
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) return withSecurityHeaders(jsonResponse({ error: authResult.error }, 401, req), req)
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
    return withSecurityHeaders(jsonResponse({ error: 'Token refresh not available in dev mode' }, 400, req), req)
  }

  // Drafts endpoints (all require authentication)
  // Write operations are rate limited (#42)
  if (url.pathname === '/api/drafts' && req.method === 'GET') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return withSecurityHeaders(jsonResponse({ error: authResult.error }, 401, req), req)
    }
    return withSecurityHeaders(await draftRoutes.list(req, authResult.user!), req)
  }

  if (url.pathname === '/api/drafts' && req.method === 'POST') {
    const rateLimitResponse = checkRateLimit(draftRateLimiter, req)
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)

    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return withSecurityHeaders(jsonResponse({ error: authResult.error }, 401, req), req)
    }
    return withSecurityHeaders(await draftRoutes.create(req, authResult.user!), req)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+$/) && req.method === 'GET') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return withSecurityHeaders(jsonResponse({ error: authResult.error }, 401, req), req)
    }
    return withSecurityHeaders(await draftRoutes.get(req, authResult.user!), req)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+$/) && req.method === 'PUT') {
    const rateLimitResponse = checkRateLimit(draftRateLimiter, req)
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)

    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return withSecurityHeaders(jsonResponse({ error: authResult.error }, 401, req), req)
    }
    return withSecurityHeaders(await draftRoutes.update(req, authResult.user!), req)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+$/) && req.method === 'DELETE') {
    const rateLimitResponse = checkRateLimit(draftRateLimiter, req)
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)

    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return withSecurityHeaders(jsonResponse({ error: authResult.error }, 401, req), req)
    }
    return withSecurityHeaders(await draftRoutes.delete(req, authResult.user!), req)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+\/publish$/) && req.method === 'POST') {
    const rateLimitResponse = checkRateLimit(draftRateLimiter, req)
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)

    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return withSecurityHeaders(jsonResponse({ error: authResult.error }, 401, req), req)
    }
    return withSecurityHeaders(await draftRoutes.publish(req, authResult.user!), req)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+\/schedule$/) && req.method === 'POST') {
    const rateLimitResponse = checkRateLimit(draftRateLimiter, req)
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)

    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return withSecurityHeaders(jsonResponse({ error: authResult.error }, 401, req), req)
    }
    return withSecurityHeaders(await draftRoutes.schedule(req, authResult.user!), req)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+\/cancel-schedule$/) && req.method === 'POST') {
    const rateLimitResponse = checkRateLimit(draftRateLimiter, req)
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)

    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return withSecurityHeaders(jsonResponse({ error: authResult.error }, 401, req), req)
    }
    return withSecurityHeaders(await draftRoutes.cancelSchedule(req, authResult.user!), req)
  }

  if (url.pathname === '/api/health' && req.method === 'GET') {
    return withSecurityHeaders(
      jsonResponse(
        { status: 'healthy', version: '1.0.0', timestamp: new Date().toISOString() },
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
  if (url.pathname === '/api/postcards' && req.method === 'POST') {
    const rateLimitResponse = checkRateLimit(postcardRateLimiter, req)
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, req)

    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return withSecurityHeaders(jsonResponse({ error: authResult.error }, 401, req), req)
    }
    return withSecurityHeaders(await handlePostcardCreate(req, authResult.user!, db), req)
  }

  if (url.pathname === '/api/postgrid/status' && req.method === 'GET') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return withSecurityHeaders(jsonResponse({ error: authResult.error }, 401, req), req)
    }
    return withSecurityHeaders(jsonResponse(postgrid.getStatusPayload(), 200, req), req)
  }

  if (url.pathname === '/api/postgrid/mode' && req.method === 'POST') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return withSecurityHeaders(jsonResponse({ error: authResult.error }, 401, req), req)
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
export { db, postgrid, notifications, imap }
