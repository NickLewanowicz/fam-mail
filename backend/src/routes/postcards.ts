import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'
import { getPostgridService } from '../services/postgrid'
import type { PostGridPostcardRequest } from '../types/postgrid'
import type { User } from '../models/user'
import type { Database } from '../database'
import { validateAddress, validateImage, validateMessage, validateSize, sanitizeHTML, sanitizeMarkdown } from '../utils/validation'
import { jsonResponse } from '../middleware/headers'

export async function handlePostcardCreate(req: Request, user: User, db: Database): Promise<Response> {
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
      from: {
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
      image?: string
      size?: string
    }
    const { to, from, frontHTML, backHTML, message, image, size = '6x4' } = body

    // Collect all validation errors and return them together
    const allErrors: Array<{ field: string; message: string }> = []

    if (!to) {
      return jsonResponse({ error: 'Missing required address fields' }, 400, req)
    }

    const addressResult = validateAddress(to, 'to')
    if (!addressResult.valid) {
      allErrors.push(...addressResult.errors)
    }

    // Validate return address — required for physical mail
    if (!from) {
      allErrors.push({ field: 'from', message: 'Return address (from) is required' })
    } else {
      const fromResult = validateAddress(from, 'from')
      if (!fromResult.valid) {
        allErrors.push(...fromResult.errors)
      }
    }

    if (!frontHTML && !backHTML && !message && !image) {
      allErrors.push({ field: 'content', message: 'At least one of frontHTML, backHTML, message, or image is required' })
    }

    if (image) {
      const imageResult = validateImage(image)
      if (!imageResult.valid) {
        allErrors.push(...imageResult.errors)
      }
    }

    if (message) {
      const messageResult = validateMessage(message)
      if (!messageResult.valid) {
        allErrors.push(...messageResult.errors)
      }
    }

    const sizeResult = validateSize(size)
    if (!sizeResult.valid) {
      allErrors.push(...sizeResult.errors)
    }

    if (allErrors.length > 0) {
      return jsonResponse({ error: 'Validation failed', errors: allErrors }, 400, req)
    }

    const postgridService = getPostgridService()
    if (!postgridService) {
      return jsonResponse({
        error: 'PostGrid service not configured. Please set POSTGRID_TEST_API_KEY or POSTGRID_LIVE_API_KEY environment variable.'
      }, 500, req)
    }

    let finalBackHTML = backHTML

    if (message) {
      // Sanitize markdown to strip any raw HTML tags before processing
      const sanitizedMessage = sanitizeMarkdown(message)
      const markedHTML = await marked(sanitizedMessage)
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
      from,
      size: size as '6x4' | '9x6' | '11x6',
      frontHTML: frontHTML ? sanitizeHTML(frontHTML) : undefined,
      backHTML: finalBackHTML ? sanitizeHTML(finalBackHTML) : undefined,
    }

    const result = await postgridService.createPostcard(postcardRequest)

    // Record postcard creation in database, associated with authenticated user
    const postcardId = crypto.randomUUID()
    db.insertPostcard({
      id: postcardId,
      emailMessageId: `web-${postcardId}`,
      senderEmail: user.email,
      recipientName: `${to.firstName} ${to.lastName}`,
      recipientAddress: `${to.addressLine1}, ${to.city}, ${to.provinceOrState} ${to.postalOrZip}`,
      postgridPostcardId: result.id,
      postgridMode: postgridService.getTestMode() ? 'test' : 'live',
      forcedTestMode: false,
      status: 'sent',
      user_id: user.id,
    })

    return jsonResponse({
      success: true,
      postcard: result,
      testMode: postgridService.getTestMode(),
    }, 200, req)
  } catch (error: unknown) {
    const status = (error as { status?: number }).status || 500
    return jsonResponse({
      success: false,
      error: (error as { message?: string }).message || 'Failed to create postcard',
      details: (error as { error?: unknown }).error,
    }, status, req)
  }
}
