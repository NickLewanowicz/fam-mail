import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'
import { postgridService } from '../services/postgrid'
import type { PostGridPostcardRequest } from '../types/postgrid'

// Security headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
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

export async function handlePostcardCreate(req: Request): Promise<Response> {
  try {
    const body = await req.json() as {
      to: {
        firstName: string
        lastName: string
        addressLine1: string
        addressLine2?: string
        city: string
        provinceOrState: string
        postalOrZip: string
        countryCode: string
      }
      frontHTML?: string
      backHTML?: string
      message?: string
      size?: string
    }
    const { to, frontHTML, backHTML, message, size = '6x4' } = body

    if (!to || !to.firstName || !to.lastName || !to.addressLine1 || !to.city || !to.provinceOrState || !to.postalOrZip || !to.countryCode) {
      return createJsonResponse({ error: 'Missing required address fields' }, 400)
    }

    if (!frontHTML && !backHTML && !message) {
      return createJsonResponse({ error: 'At least one of frontHTML, backHTML, or message is required' }, 400)
    }

    if (!postgridService) {
      return createJsonResponse({
        error: 'PostGrid service not configured. Please set POSTGRID_TEST_KEY or POSTGRID_PROD_KEY environment variable.'
      }, 500)
    }

    let finalBackHTML = backHTML

    if (message) {
      const markedHTML = await marked(message)
      const messageHTML = DOMPurify.sanitize(markedHTML, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'],
        ALLOWED_ATTR: ['class'],
        FORBID_ATTR: ['onclick', 'onload', 'onerror', 'style']
      })
      finalBackHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              width: 1800px;
              height: 1200px;
              overflow: hidden;
              position: relative;
              background: white;
              font-family: Arial, sans-serif;
              padding: 60px;
            }
            .message {
              position: absolute;
              left: 60px;
              top: 60px;
              width: 840px;
              height: 1080px;
              font-size: 24px;
              line-height: 1.6;
              color: #333;
            }
            .message h1 { font-size: 36px; margin-bottom: 16px; }
            .message h2 { font-size: 32px; margin-bottom: 14px; }
            .message h3 { font-size: 28px; margin-bottom: 12px; }
            .message p { margin-bottom: 12px; }
            .message strong { font-weight: bold; }
            .message em { font-style: italic; }
          </style>
        </head>
        <body>
          <div class="message">
            ${messageHTML}
          </div>
        </body>
        </html>
      `.trim()
    }

    const postcardRequest: PostGridPostcardRequest = {
      to,
      size: size as '6x4' | '9x6' | '11x6',
      frontHTML,
      backHTML: finalBackHTML,
    }

    const result = await postgridService.createPostcard(postcardRequest)

    return createJsonResponse({
      success: true,
      postcard: result,
      testMode: postgridService.getTestMode(),
    })
  } catch (error: unknown) {
    const status = (error as { status?: number }).status || 500
    return createJsonResponse({
      success: false,
      error: (error as { message?: string }).message || 'Failed to create postcard',
      details: (error as { error?: unknown }).error,
    }, status)
  }
}
