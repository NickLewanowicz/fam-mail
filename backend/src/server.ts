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
import { jsonResponse, createCorsResponse } from './utils/response'
import { setupAuthRoutes } from './routes/auth'
import { DraftRoutes } from './routes/drafts'
import type { LLMConfig } from './services/llm'
import { logger } from './utils/logger'

// Rate limiter for auth endpoints: 10 requests per minute per IP
const authRateLimiter = new RateLimiter(10, 60_000)

const config = getConfig()
const db = new Database(config.database.path)

// Initialize OIDC service
const oidcService = new OIDCService({
  issuerUrl: config.oidc.issuerUrl,
  clientId: config.oidc.clientId,
  clientSecret: config.oidc.clientSecret,
  redirectUri: config.oidc.redirectUri,
  scopes: config.oidc.scopes,
}, db)
await oidcService.initialize()

// Initialize JWT service
const jwtService = new JWTService({
  secret: config.jwt.secret,
  expiresIn: config.jwt.expiresIn,
  refreshExpiresIn: config.jwt.refreshExpiresIn,
})

// Initialize auth middleware
const authMiddleware = new AuthMiddleware(jwtService, db)

// Setup auth routes
const authRoutes = setupAuthRoutes(oidcService, jwtService, authMiddleware, db)

// Initialize PostGrid (before DraftRoutes, which depends on it)
const postgrid = new PostGridService({
  mode: config.postgrid.mode,
  testApiKey: config.postgrid.testApiKey,
  liveApiKey: config.postgrid.liveApiKey,
  forceTestMode: config.postgrid.forceTestMode,
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

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)

  if (req.method === 'OPTIONS') {
    return createCorsResponse(req)
  }

  // Auth endpoints — rate limited to prevent brute-force attacks
  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    const { allowed, retryAfterMs } = authRateLimiter.check(getClientIp(req))
    if (!allowed) {
      return jsonResponse({ error: 'Too many requests', retryAfter: retryAfterMs }, 429, req)
    }
    return authRoutes.handleAuthLogin(req)
  }

  if (url.pathname === '/api/auth/callback' && req.method === 'GET') {
    const { allowed, retryAfterMs } = authRateLimiter.check(getClientIp(req))
    if (!allowed) {
      return jsonResponse({ error: 'Too many requests', retryAfter: retryAfterMs }, 429, req)
    }
    return authRoutes.handleAuthCallback(req)
  }

  if (url.pathname === '/api/auth/me' && req.method === 'GET') {
    return authRoutes.handleGetMe(req)
  }

  if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
    return authRoutes.handleLogout(req)
  }

  // Drafts endpoints (all require authentication)
  if (url.pathname === '/api/drafts' && req.method === 'GET') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return jsonResponse({ error: authResult.error }, 401, req)
    }
    return draftRoutes.list(req, authResult.user!)
  }

  if (url.pathname === '/api/drafts' && req.method === 'POST') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return jsonResponse({ error: authResult.error }, 401, req)
    }
    return draftRoutes.create(req, authResult.user!)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+$/) && req.method === 'GET') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return jsonResponse({ error: authResult.error }, 401, req)
    }
    return draftRoutes.get(req, authResult.user!)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+$/) && req.method === 'PUT') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return jsonResponse({ error: authResult.error }, 401, req)
    }
    return draftRoutes.update(req, authResult.user!)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+$/) && req.method === 'DELETE') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return jsonResponse({ error: authResult.error }, 401, req)
    }
    return draftRoutes.delete(req, authResult.user!)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+\/publish$/) && req.method === 'POST') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return jsonResponse({ error: authResult.error }, 401, req)
    }
    return draftRoutes.publish(req, authResult.user!)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+\/schedule$/) && req.method === 'POST') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return jsonResponse({ error: authResult.error }, 401, req)
    }
    return draftRoutes.schedule(req, authResult.user!)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+\/cancel-schedule$/) && req.method === 'POST') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return jsonResponse({ error: authResult.error }, 401, req)
    }
    return draftRoutes.cancelSchedule(req, authResult.user!)
  }

  if (url.pathname === '/api/health') {
    return jsonResponse({
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      message: 'Fam Mail backend is running',
      services: {
        imap: config.imap ? 'connected' : 'not configured',
        postgrid: config.postgrid.forceTestMode ? 'test (forced)' : config.postgrid.mode,
        database: 'connected',
        notifications: 'ready',
        oidc: 'configured',
        jwt: 'configured',
      },
    }, 200, req)
  }

  // #29: Debug endpoint only available in development mode
  if (url.pathname === '/api/test' && process.env.NODE_ENV !== 'production') {
    return jsonResponse({
      message: 'Hello from Fam Mail backend!',
      connected: true,
    }, 200, req)
  }

  // #30: Postcard creation requires authentication (PostGrid costs real money)
  if (url.pathname === '/api/postcards' && req.method === 'POST') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return jsonResponse({ error: authResult.error }, 401, req)
    }
    return handlePostcardCreate(req, authResult.user!, db)
  }

  // Email webhook endpoints
  if (url.pathname === '/api/webhook/email' && req.method === 'POST') {
    return handleEmailWebhook(req)
  }

  if (url.pathname === '/api/webhook/health' && req.method === 'GET') {
    return handleWebhookHealth(req)
  }

  if (config.server.nodeEnv === 'production' && !url.pathname.startsWith('/api')) {
    try {
      const filePath = join(frontendDistPath, url.pathname)

      const bunFile = file(filePath)
      if (await bunFile.exists()) {
        return new Response(bunFile)
      }

      const indexFile = file(join(frontendDistPath, 'index.html'))
      if (await indexFile.exists()) {
        return new Response(indexFile)
      }
    } catch (error) {
      logger.error('Error serving static file', { error })
    }
  }

  return jsonResponse({ error: 'Not Found' }, 404, req)
}

// Export for testing
export { db, postgrid, notifications, imap }
