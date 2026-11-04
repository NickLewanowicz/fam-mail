import { Database } from '../database'
import { AuthMiddleware } from '../middleware/auth'
import type { Draft } from '../models/draft'
import type { User } from '../models/user'
import { jsonResponse } from '../middleware/headers'
import type { PostGridService } from '../services/postgrid'
import type { PostGridPostcardRequest, PostGridError } from '../types/postgrid'
import { validateAddress, validateMessage, validateSize, sanitizeHTML, sanitizeMarkdown, validateImage } from '../utils/validation'
import { buildImageFrontHTML, buildMessageBackHTML, isCardSize } from '../utils/htmlSanitizer'

/**
 * The frontend saves drafts with data URLs (`data:image/jpeg;base64,...`);
 * raw base64 (no prefix) is also accepted.
 */
function extractImageBase64(imageData: string): string {
  const match = /^data:[^,]*;base64,(.*)$/.exec(imageData)
  return match ? match[1] : imageData
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

    return jsonResponse({ drafts }, 200, req)
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
      return jsonResponse({ error: 'recipientAddress is required' }, 400, req)
    }

    const draft: Omit<Draft, 'createdAt' | 'updatedAt'> = {
      id: crypto.randomUUID(),
      userId: user.id,
      recipientAddress: body.recipientAddress,
      senderAddress: body.senderAddress || undefined,
      message: body.message ? sanitizeMarkdown(body.message) : undefined,
      frontHTML: body.frontHTML,
      backHTML: body.backHTML,
      imageData: body.imageData,
      imageMetadata: body.imageMetadata,
      state: 'draft',
      size: body.size || '6x4',
      scheduledFor: undefined,
    }

    this.db.insertDraft(draft)

    return jsonResponse({ draft }, 201, req)
  }

  async get(req: Request, user: User): Promise<Response> {
    const url = new URL(req.url)
    const id = url.pathname.split('/').pop()

    if (!id) {
      return jsonResponse({ error: 'Draft ID is required' }, 400, req)
    }

    const draft = this.db.getDraft(id!)

    if (!draft) {
      return jsonResponse({ error: 'Draft not found' }, 404, req)
    }

    if (draft.userId !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403, req)
    }

    return jsonResponse({ draft }, 200, req)
  }

  async update(req: Request, user: User): Promise<Response> {
    const url = new URL(req.url)
    const id = url.pathname.split('/').pop()
    const body = await req.json() as Partial<Draft>

    if (!id) {
      return jsonResponse({ error: 'Draft ID is required' }, 400, req)
    }

    const existingDraft = this.db.getDraft(id!)

    if (!existingDraft) {
      return jsonResponse({ error: 'Draft not found' }, 404, req)
    }

    if (existingDraft.userId !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403, req)
    }

    // Sanitize message if present in the update
    const sanitizedBody: Partial<Draft> = { ...body }
    if (body.message !== undefined) {
      sanitizedBody.message = sanitizeMarkdown(body.message)
    }

    this.db.updateDraft(id, sanitizedBody)

    const updatedDraft = this.db.getDraft(id!)

    return jsonResponse({ draft: updatedDraft }, 200, req)
  }

  async delete(req: Request, user: User): Promise<Response> {
    const url = new URL(req.url)
    const id = url.pathname.split('/').pop()

    if (!id) {
      return jsonResponse({ error: 'Draft ID is required' }, 400, req)
    }

    const existingDraft = this.db.getDraft(id!)

    if (!existingDraft) {
      return jsonResponse({ error: 'Draft not found' }, 404, req)
    }

    if (existingDraft.userId !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403, req)
    }

    this.db.deleteDraft(id)

    return jsonResponse({ message: 'Draft deleted' }, 200, req)
  }

  async publish(req: Request, user: User): Promise<Response> {
    const url = new URL(req.url)
    const segments = url.pathname.split('/')
    const id = segments[3] // /api/drafts/{id}/publish

    if (!id) {
      return jsonResponse({ error: 'Draft ID is required' }, 400, req)
    }

    const result = await this.publishDraftById(id, user)
    return jsonResponse(result.body, result.status, req)
  }

  /**
   * Core publish pipeline shared by the HTTP route and the scheduled-draft
   * dispatcher. Returns a JSON-able body + status so both callers can use it.
   *
   * `allowScheduled` lets the dispatcher publish drafts in `ready` state that
   * carry a `scheduledFor` date (the HTTP route only publishes `draft` state).
   */
  async publishDraftById(
    id: string,
    user: User,
    options?: { allowScheduled?: boolean }
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    const draft = this.db.getDraft(id)

    if (!draft) {
      return { status: 404, body: { error: 'Draft not found' } }
    }

    if (draft.userId !== user.id) {
      return { status: 403, body: { error: 'Forbidden' } }
    }

    if (draft.state !== 'draft' && !options?.allowScheduled) {
      return { status: 400, body: { error: 'Draft is not in draft state' } }
    }

    // --- Validate all required fields before sending to PostGrid ---

    const allErrors: Array<{ field: string; message: string }> = []

    // Validate recipient address
    const addressResult = validateAddress(draft.recipientAddress, 'to')
    if (!addressResult.valid) {
      allErrors.push(...addressResult.errors)
    }

    // Validate sender address — required; without it PostGrid receives no
    // return address (postgrid.ts skips the whole from[...] block).
    if (!draft.senderAddress) {
      allErrors.push({ field: 'from', message: 'Return address (from) is required' })
    } else {
      const fromResult = validateAddress(draft.senderAddress, 'from')
      if (!fromResult.valid) {
        allErrors.push(...fromResult.errors)
      }
    }

    // Must have at least one content field
    if (!draft.frontHTML && !draft.backHTML && !draft.message && !draft.imageData) {
      allErrors.push({ field: 'content', message: 'At least one of frontHTML, backHTML, message, or an image is required' })
    }

    // D2 (decision board 2026-11-04): no silent back content — every card
    // carries intentional words. With both empty/absent the service used to
    // mail PostGrid with a 'Thank you!' fallback; now the route rejects
    // before PostGrid per ADR 0002's house rule.
    if (!(draft.backHTML ?? '').trim() && !(draft.message ?? '').trim()) {
      allErrors.push({ field: 'backHTML', message: 'Add a message or back content before sending' })
    }

    // Validate image if present (same rules as the direct postcard creation
    // route — ADR 0002 amendment: builder builds, route validates)
    if (draft.imageData) {
      const imageResult = validateImage(extractImageBase64(draft.imageData))
      if (!imageResult.valid) {
        allErrors.push(...imageResult.errors)
      }
    }

    // Validate message if present
    if (draft.message) {
      const messageResult = validateMessage(draft.message)
      if (!messageResult.valid) {
        allErrors.push(...messageResult.errors)
      }
    }

    // Validate size
    const postGridSize = isCardSize(draft.size) ? draft.size : '6x4'
    const sizeResult = validateSize(postGridSize)
    if (!sizeResult.valid) {
      allErrors.push(...sizeResult.errors)
    }

    if (allErrors.length > 0) {
      return { status: 400, body: { error: 'Validation failed', errors: allErrors } }
    }

    // Check PostGrid service is configured
    if (!this.postgrid) {
      return {
        status: 500,
        body: {
          error: 'PostGrid service not configured. Please set POSTGRID_TEST_API_KEY or POSTGRID_LIVE_API_KEY environment variable.',
        },
      }
    }

    try {
      // Front artwork: explicit HTML wins; otherwise the draft's uploaded
      // image becomes a full-bleed front canvas. imageData was previously
      // ignored at publish time, mailing cards without their photo.
      const draftSize = postGridSize
      let finalFrontHTML = draft.frontHTML ? sanitizeHTML(draft.frontHTML) : undefined
      if (!finalFrontHTML && draft.imageData) {
        finalFrontHTML = buildImageFrontHTML(draft.imageData, draftSize)
      }

      // Back artwork: explicit HTML wins; otherwise render the markdown
      // message onto a canvas sized for the actual card. The message was
      // sanitized when the draft was saved, but sanitize again as
      // defense-in-depth (buildMessageBackHTML re-sanitizes end to end).
      let finalBackHTML = draft.backHTML ? sanitizeHTML(draft.backHTML) : undefined
      if (!finalBackHTML && draft.message) {
        finalBackHTML = sanitizeHTML(buildMessageBackHTML(draft.message, draftSize))
      }

      // Call PostGrid API
      const postcardRequest: PostGridPostcardRequest = {
        to: draft.recipientAddress,
        from: draft.senderAddress,
        size: postGridSize,
        frontHTML: finalFrontHTML,
        backHTML: finalBackHTML,
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
        // #120: persist the card content so History "Again" can restore the
        // photo + message (same shape as the direct send path)
        ...((draft.imageData || draft.message)
          ? { contentJson: JSON.stringify({ imageData: draft.imageData || undefined, message: draft.message || undefined }) }
          : {}),
        postgridPostcardId: result.id,
        postgridMode: this.postgrid.getTestMode() ? 'test' : 'live',
        forcedTestMode: false,
        status: 'sent',
        user_id: user.id,
        draftId: draft.id,
      })

      // Only update draft state after successful PostGrid call
      this.db.updateDraft(id, { state: 'ready' })

      return {
        status: 200,
        body: {
          success: true,
          message: 'Postcard sent successfully',
          postcard: {
            id: result.id,
            status: result.status,
            testMode: this.postgrid.getTestMode(),
          },
        },
      }
    } catch (error: unknown) {
      const pgError = error as PostGridError
      const status = pgError.status || 500
      return {
        status,
        body: {
          success: false,
          error: pgError.message || 'Failed to create postcard',
          details: pgError.error,
        },
      }
    }
  }

  async schedule(req: Request, user: User): Promise<Response> {
    const url = new URL(req.url)
    const segments = url.pathname.split('/')
    const id = segments[3] // /api/drafts/{id}/schedule
    const body = await req.json() as { scheduledFor: string }

    if (!id) {
      return jsonResponse({ error: 'Draft ID is required' }, 400, req)
    }

    const existingDraft = this.db.getDraft(id!)

    if (!existingDraft) {
      return jsonResponse({ error: 'Draft not found' }, 404, req)
    }

    if (existingDraft.userId !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403, req)
    }

    if (!body.scheduledFor) {
      return jsonResponse({ error: 'scheduledFor is required' }, 400, req)
    }

    const scheduledDate = new Date(body.scheduledFor)

    if (scheduledDate <= new Date()) {
      return jsonResponse({ error: 'scheduledFor must be in future' }, 400, req)
    }

    // Update draft to 'ready' with scheduled time
    this.db.updateDraft(id, {
      state: 'ready',
      scheduledFor: body.scheduledFor,
    })

    return jsonResponse({ message: 'Draft scheduled for ' + scheduledDate.toISOString() }, 200, req)
  }

  async cancelSchedule(req: Request, user: User): Promise<Response> {
    const url = new URL(req.url)
    const segments = url.pathname.split('/')
    const id = segments[3] // /api/drafts/{id}/cancel-schedule

    if (!id) {
      return jsonResponse({ error: 'Draft ID is required' }, 400, req)
    }

    const existingDraft = this.db.getDraft(id!)

    if (!existingDraft) {
      return jsonResponse({ error: 'Draft not found' }, 404, req)
    }

    if (existingDraft.userId !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403, req)
    }

    if (!existingDraft.scheduledFor) {
      return jsonResponse({ error: 'Draft is not scheduled' }, 400, req)
    }

    // Revert to draft state
    this.db.updateDraft(id, {
      state: 'draft',
      scheduledFor: null,
    })

    return jsonResponse({ message: 'Schedule cancelled' }, 200, req)
  }
}
