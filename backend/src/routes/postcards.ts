import { getPostgridService } from '../services/postgrid'
import type { PostGridPostcardRequest } from '../types/postgrid'
import type { User } from '../models/user'
import type { Database } from '../database'
import { validateAddress, validateImage, validateMessage, validateSize, sanitizeHTML } from '../utils/validation'
import { buildImageFrontHTML, buildMessageBackHTML, isCardSize, type CardSize } from '../utils/htmlSanitizer'
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

    const cardSize: CardSize = isCardSize(size) ? size : '6x4'

    // Front artwork: explicit HTML wins; otherwise a validated uploaded
    // image becomes a full-bleed front canvas. Previously an image-only
    // request silently mailed a card with no artwork at all.
    let finalFrontHTML = frontHTML ? sanitizeHTML(frontHTML) : undefined
    if (!finalFrontHTML && image) {
      finalFrontHTML = buildImageFrontHTML(image, cardSize)
    }

    // Back artwork: explicit HTML wins; otherwise render the markdown message
    // onto a canvas sized for the actual card.
    let finalBackHTML = backHTML ? sanitizeHTML(backHTML) : undefined
    if (!finalBackHTML && message) {
      finalBackHTML = sanitizeHTML(buildMessageBackHTML(message, cardSize))
    }

    const postcardRequest: PostGridPostcardRequest = {
      to,
      from,
      size: cardSize,
      frontHTML: finalFrontHTML,
      backHTML: finalBackHTML,
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
      // #109: keep the structured address so History "Again" can prefill
      // city/ZIP/country instead of a formatted string
      recipientAddressJson: JSON.stringify(to),
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
