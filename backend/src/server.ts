import { join } from 'path'
import { file } from 'bun'
import { handlePostcardCreate } from './routes/postcards'
import { handleEmailWebhook, handleWebhookHealth } from './routes/webhook'

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

const isProduction = process.env.NODE_ENV === 'production'
const frontendDistPath = join(import.meta.dir, '../../frontend/dist')

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)

  if (req.method === 'OPTIONS') {
    return createCorsResponse()
  }

  if (url.pathname === '/api/health') {
    const isTestMode = process.env.TEST_MODE === 'true'

    return createJsonResponse({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Fam Mail backend is running',
      testMode: isTestMode,
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
