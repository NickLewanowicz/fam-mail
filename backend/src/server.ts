import { join } from 'path'
import { file } from 'bun'
import { handlePostcardCreate } from './routes/postcards'
import { handleEmailWebhook, handleWebhookHealth } from './routes/webhook'
import { getConfig } from './config'
import { Database } from './database'
import { IMAPService } from './services/imap'
import { PostGridService } from './services/postgrid'
import { NotificationService } from './services/notifications'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

function createJsonResponse(data: any, status: number = 200): Response {
  const response = new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  )
  return addSecurityHeaders(response)
}

function createCorsResponse(): Response {
  return addSecurityHeaders(
    new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  )
}

const config = getConfig()
const db = new Database(config.database.path)

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
  }
)

// Start IMAP polling on server start
imap.start().catch(console.error)

const isProduction = config.server.nodeEnv === 'production'
const frontendDistPath = join(import.meta.dir, '../../frontend/dist')

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)

  if (req.method === 'OPTIONS') {
    return createCorsResponse()
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
      },
    })
  }

  if (url.pathname === '/api/test') {
    return createJsonResponse({
      message: 'Hello from Fam Mail backend!',
      connected: true,
    })
  }

  if (url.pathname === '/api/postcards' && req.method === 'POST') {
    return handlePostcardCreate(req)
  }

  // Email webhook endpoints
  if (url.pathname === '/api/webhook/email' && req.method === 'POST') {
    return handleEmailWebhook(req)
  }

  if (url.pathname === '/api/webhook/health' && req.method === 'GET') {
    return handleWebhookHealth(req)
  }

  if (isProduction && !url.pathname.startsWith('/api')) {
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

  return createJsonResponse({ error: 'Not Found' }, 404)
}

// Export for testing
export { db, postgrid, notifications, imap }
