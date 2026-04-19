import { Database } from '../database'
import { AuthMiddleware } from '../middleware/auth'
import type { Draft } from '../models/draft'
import type { User } from '../models/user'
import { jsonResponse } from '../utils/response'
import type { PostGridService } from '../services/postgrid'
import type { PostGridPostcardRequest, PostGridError } from '../types/postgrid'
import { validateAddress, validateMessage, validateSize, sanitizeHTML } from '../utils/validation'
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'

// Draft sizes are already in PostGrid format (6x4, 9x6, 11x6)
function draftSizeToPostGridSize(size: string): '6x4' | '9x6' | '11x6' {
  const validSizes: ('6x4' | '9x6' | '11x6')[] = ['6x4', '9x6', '11x6']
  if (validSizes.includes(size as '6x4' | '9x6' | '11x6')) {
    return size as '6x4' | '9x6' | '11x6'
  }
  return '6x4'
}

export class DraftRoutes {
  private db: Database
  private auth: AuthMiddleware
  private postgrid: PostGridService | null

  constructor(db: Database, auth: AuthMiddleware, postgrid?: PostGridService | null) {
    this.db = db
    this.auth = auth
    this.postgrid = postgrid ?? null
  }

  async list(req: Request, user: User): Promise<Response> {
    const url = new URL(req.url)
    const state = url.searchParams.get('state') as 'draft' | 'ready' | null

    let drafts
    if (state && (state === 'draft' || state === 'ready')) {
      drafts = this.db.getDraftsByUserIdAndState(user.id, state as 'draft' | 'ready')
    } else {
      drafts = this.db.getDraftsByUserId(user.id)
    }

    return jsonResponse({ drafts })
  }

  async create(req: Request, user: User): Promise<Response> {
    const body = await req.json() as {
      recipientAddress: Record<string, unknown>
      senderAddress?: Record<string, unknown>
      message?: string
      frontHTML?: string
      backHTML?: string
      imageData?: string
      imageMetadata?: Record<string, unknown>
      size?: '6x4' | '9x6' | '11x6'
    }

    if (!body.recipientAddress) {
      return jsonResponse({ error: 'recipientAddress is required' }, 400)
    }

    const draft: Omit<Draft, 'createdAt' | 'updatedAt'> = {
      id: crypto.randomUUID(),
      userId: user.id,
      recipientAddress: body.recipientAddress,
      senderAddress: body.senderAddress || undefined,
      message: body.message,
      frontHTML: body.frontHTML,
      backHTML: body.backHTML,
      imageData: body.imageData,
      imageMetadata: body.imageMetadata,
      state: 'draft',
      size: body.size || '6x4',
      scheduledFor: undefined,
    }

    this.db.insertDraft(draft)

    return jsonResponse({ draft }, 201)
  }

  async get(req: Request, user: User): Promise<Response> {
    const url = new URL(req.url)
    const id = url.pathname.split('/').pop()

    if (!id) {
      return jsonResponse({ error: 'Draft ID is required' }, 400)
    }

    const draft = this.db.getDraft(id!)

    if (!draft) {
      return jsonResponse({ error: 'Draft not found' }, 404)
    }

    if (draft.userId !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    return jsonResponse({ draft })
  }

  async update(req: Request, user: User): Promise<Response> {
    const url = new URL(req.url)
    const id = url.pathname.split('/').pop()
    const body = await req.json() as Partial<Draft>

    if (!id) {
      return jsonResponse({ error: 'Draft ID is required' }, 400)
    }

    const existingDraft = this.db.getDraft(id!)

    if (!existingDraft) {
      return jsonResponse({ error: 'Draft not found' }, 404)
    }

    if (existingDraft.userId !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    this.db.updateDraft(id, body)

    const updatedDraft = this.db.getDraft(id!)

    return jsonResponse({ draft: updatedDraft })
  }

  async delete(req: Request, user: User): Promise<Response> {
    const url = new URL(req.url)
    const id = url.pathname.split('/').pop()

    if (!id) {
      return jsonResponse({ error: 'Draft ID is required' }, 400)
    }

    const existingDraft = this.db.getDraft(id!)

    if (!existingDraft) {
      return jsonResponse({ error: 'Draft not found' }, 404)
    }

    if (existingDraft.userId !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    this.db.deleteDraft(id)

    return jsonResponse({ message: 'Draft deleted' })
  }

  async publish(req: Request, user: User): Promise<Response> {
    const url = new URL(req.url)
    const id = url.pathname.split('/').pop()

    if (!id) {
      return jsonResponse({ error: 'Draft ID is required' }, 400)
    }

    const draft = this.db.getDraft(id!)

    if (!draft) {
      return jsonResponse({ error: 'Draft not found' }, 404)
    }

    if (draft.userId !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    if (draft.state !== 'draft') {
      return jsonResponse({ error: 'Draft is not in draft state' }, 400)
    }

    // --- Validate all required fields before sending to PostGrid ---

    const allErrors: Array<{ field: string; message: string }> = []

    // Validate recipient address
    const addressResult = validateAddress(draft.recipientAddress, 'to')
    if (!addressResult.valid) {
      allErrors.push(...addressResult.errors)
    }

    // Validate sender address if provided
    if (draft.senderAddress) {
      const fromResult = validateAddress(draft.senderAddress, 'from')
      if (!fromResult.valid) {
        allErrors.push(...fromResult.errors)
      }
    }

    // Must have at least one content field
    if (!draft.frontHTML && !draft.backHTML && !draft.message) {
      allErrors.push({ field: 'content', message: 'At least one of frontHTML, backHTML, or message is required' })
    }

    // Validate message if present
    if (draft.message) {
      const messageResult = validateMessage(draft.message)
      if (!messageResult.valid) {
        allErrors.push(...messageResult.errors)
      }
    }

    // Validate size
    const postGridSize = draftSizeToPostGridSize(draft.size)
    const sizeResult = validateSize(postGridSize)
    if (!sizeResult.valid) {
      allErrors.push(...sizeResult.errors)
    }

    if (allErrors.length > 0) {
      return jsonResponse({ error: 'Validation failed', errors: allErrors }, 400)
    }

    // Check PostGrid service is configured
    if (!this.postgrid) {
      return jsonResponse({
        error: 'PostGrid service not configured. Please set POSTGRID_TEST_API_KEY or POSTGRID_LIVE_API_KEY environment variable.',
      }, 500)
    }

    try {
      // Build backHTML from message if no explicit backHTML
      let finalBackHTML = draft.backHTML
      if (!finalBackHTML && draft.message) {
        const markedHTML = await marked(draft.message)
        const messageHTML = DOMPurify.sanitize(markedHTML, {
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'],
          ALLOWED_ATTR: ['class'],
          FORBID_ATTR: ['onclick', 'onload', 'onerror', 'style'],
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

      // Call PostGrid API
      const postcardRequest: PostGridPostcardRequest = {
        to: draft.recipientAddress,
        from: draft.senderAddress,
        size: postGridSize,
        frontHTML: draft.frontHTML ? sanitizeHTML(draft.frontHTML) : undefined,
        backHTML: finalBackHTML ? sanitizeHTML(finalBackHTML) : undefined,
      }

      const result = await this.postgrid.createPostcard(postcardRequest)

      // Store postcard record in database linked to the draft
      const postcardId = result.id
      this.db.insertPostcard({
        id: postcardId,
        emailMessageId: `draft-${draft.id}`,
        senderEmail: user.email,
        recipientName: `${draft.recipientAddress.firstName} ${draft.recipientAddress.lastName}`,
        recipientAddress: `${draft.recipientAddress.addressLine1}, ${draft.recipientAddress.city}, ${draft.recipientAddress.provinceOrState} ${draft.recipientAddress.postalOrZip}`,
        postgridPostcardId: result.id,
        postgridMode: this.postgrid.getTestMode() ? 'test' : 'live',
        forcedTestMode: false,
        status: 'sent',
        user_id: user.id,
        draftId: draft.id,
      })

      // Only update draft state after successful PostGrid call
      this.db.updateDraft(id, { state: 'ready' })

      return jsonResponse({
        success: true,
        message: 'Postcard sent successfully',
        postcard: {
          id: result.id,
          status: result.status,
          testMode: this.postgrid.getTestMode(),
        },
      })
    } catch (error: unknown) {
      const pgError = error as PostGridError
      const status = pgError.status || 500
      return jsonResponse({
        success: false,
        error: pgError.message || 'Failed to create postcard',
        details: pgError.error,
      }, status)
    }
  }

  async schedule(req: Request, user: User): Promise<Response> {
    const url = new URL(req.url)
    const id = url.pathname.split('/').pop()
    const body = await req.json() as { scheduledFor: string }

    if (!id) {
      return jsonResponse({ error: 'Draft ID is required' }, 400)
    }

    const existingDraft = this.db.getDraft(id!)

    if (!existingDraft) {
      return jsonResponse({ error: 'Draft not found' }, 404)
    }

    if (existingDraft.userId !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    if (!body.scheduledFor) {
      return jsonResponse({ error: 'scheduledFor is required' }, 400)
    }

    const scheduledDate = new Date(body.scheduledFor)

    if (scheduledDate <= new Date()) {
      return jsonResponse({ error: 'scheduledFor must be in future' }, 400)
    }

    // Update draft to 'ready' with scheduled time
    this.db.updateDraft(id, {
      state: 'ready',
      scheduledFor: body.scheduledFor,
    })

    return jsonResponse({ message: 'Draft scheduled for ' + scheduledDate.toISOString() })
  }

  async cancelSchedule(req: Request, user: User): Promise<Response> {
    const url = new URL(req.url)
    const id = url.pathname.split('/').pop()

    if (!id) {
      return jsonResponse({ error: 'Draft ID is required' }, 400)
    }

    const existingDraft = this.db.getDraft(id!)

    if (!existingDraft) {
      return jsonResponse({ error: 'Draft not found' }, 404)
    }

    if (existingDraft.userId !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    if (!existingDraft.scheduledFor) {
      return jsonResponse({ error: 'Draft is not scheduled' }, 400)
    }

    // Revert to draft state
    this.db.updateDraft(id, {
      state: 'draft',
      scheduledFor: undefined,
    })

    return jsonResponse({ message: 'Schedule cancelled' })
  }
}
