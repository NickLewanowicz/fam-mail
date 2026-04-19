import { join } from 'path'
import { file } from 'bun'
import { handlePostcardCreate } from './routes/postcards'
import { handleEmailWebhook, handleWebhookHealth } from './routes/webhook'
import { getConfig } from './config'
import { Database } from './database'
import { IMAPService } from './services/imap'
import { PostGridService } from './services/postgrid'
import { NotificationService } from './services/notifications'
import { OIDCService } from './services/oidcService'
import { JWTService } from './services/jwtService'
import { AuthMiddleware } from './middleware/auth'
import { setupAuthRoutes } from './routes/auth'
import { DraftRoutes } from './routes/drafts'
import type { LLMConfig } from './services/llm'

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || ''
  const allowed = config.server.allowedOrigins
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || ''
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  }
}

// Security headers using helmet's default configuration
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'",
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'DNS-Prefetch-Control': 'off',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  'Strict-Transport-Security': 'max-age=15552000; includeSubDomains'
}

function addSecurityHeaders(response: Response): Response {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

function createJsonResponse(data: any, status: number = 200, req?: Request): Response {
  const response = new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...(req ? getCorsHeaders(req) : {}),
      },
    }
  )
  return addSecurityHeaders(response)
}

function createCorsResponse(req: Request): Response {
  return addSecurityHeaders(
    new Response(null, {
      status: 204,
      headers: getCorsHeaders(req),
    })
  )
}

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

// Setup drafts routes
const draftRoutes = new DraftRoutes(db, authMiddleware)

// Initialize PostGrid
const postgrid = new PostGridService({
  mode: config.postgrid.mode,
  testApiKey: config.postgrid.testApiKey,
  liveApiKey: config.postgrid.liveApiKey,
  forceTestMode: config.postgrid.forceTestMode,
  webhookSecret: config.postgrid.webhookSecret,
  size: config.postgrid.size,
  senderId: config.postgrid.senderId,
})

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

// Initialize IMAP service
const imap = new IMAPService(
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
imap.start().catch(console.error)

const frontendDistPath = join(import.meta.dir, '../../frontend/dist')

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)

  if (req.method === 'OPTIONS') {
    return createCorsResponse(req)
  }

  // Auth endpoints
  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    return authRoutes.handleAuthLogin(req)
  }

  if (url.pathname === '/api/auth/callback' && req.method === 'GET') {
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
      return createJsonResponse({ error: authResult.error }, 401, req)
    }
    return draftRoutes.list(req, authResult.user!)
  }

  if (url.pathname === '/api/drafts' && req.method === 'POST') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return createJsonResponse({ error: authResult.error }, 401, req)
    }
    return draftRoutes.create(req, authResult.user!)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+$/) && req.method === 'GET') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return createJsonResponse({ error: authResult.error }, 401, req)
    }
    return draftRoutes.get(req, authResult.user!)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+$/) && req.method === 'PUT') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return createJsonResponse({ error: authResult.error }, 401, req)
    }
    return draftRoutes.update(req, authResult.user!)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+$/) && req.method === 'DELETE') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return createJsonResponse({ error: authResult.error }, 401, req)
    }
    return draftRoutes.delete(req, authResult.user!)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+\/publish$/) && req.method === 'POST') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return createJsonResponse({ error: authResult.error }, 401, req)
    }
    return draftRoutes.publish(req, authResult.user!)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+\/schedule$/) && req.method === 'POST') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return createJsonResponse({ error: authResult.error }, 401, req)
    }
    return draftRoutes.schedule(req, authResult.user!)
  }

  if (url.pathname.match(/^\/api\/drafts\/[^/]+\/cancel-schedule$/) && req.method === 'POST') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return createJsonResponse({ error: authResult.error }, 401, req)
    }
    return draftRoutes.cancelSchedule(req, authResult.user!)
  }

  if (url.pathname === '/api/health') {
    return createJsonResponse({
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      message: 'Fam Mail backend is running',
      services: {
        imap: 'connected',
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
    return createJsonResponse({
      message: 'Hello from Fam Mail backend!',
      connected: true,
    }, 200, req)
  }

  // #30: Postcard creation requires authentication (PostGrid costs real money)
  if (url.pathname === '/api/postcards' && req.method === 'POST') {
    const authResult = await authMiddleware.authenticate(req)
    if (authResult.error) {
      return createJsonResponse({ error: authResult.error }, 401, req)
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
      console.error('Error serving static file:', error)
    }
  }

  return createJsonResponse({ error: 'Not Found' }, 404, req)
}

// Export for testing
export { db, postgrid, notifications, imap }
