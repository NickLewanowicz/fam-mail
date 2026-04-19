import { Database } from '../database'
import { AuthMiddleware } from '../middleware/auth'
import type { Draft } from '../models/draft'
import type { User } from '../models/user'
import { jsonResponse } from '../utils/response'

export class DraftRoutes {
  private db: Database
  private auth: AuthMiddleware

  constructor(db: Database, auth: AuthMiddleware) {
    this.db = db
    this.auth = auth
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
      recipientAddress: any
      senderAddress?: any
      message?: string
      frontHTML?: string
      backHTML?: string
      imageData?: string
      imageMetadata?: any
      size?: '4x6' | '6x9' | '11x6'
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
      size: body.size || '4x6',
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

    // Update draft to 'ready'
    this.db.updateDraft(id, { state: 'ready' })

    // TODO: Send to PostGrid (will be implemented with PostGridService integration)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const postcardRequest = {
      to: draft.recipientAddress,
      from: draft.senderAddress,
      size: draft.size,
      frontHTML: draft.frontHTML,
      backHTML: draft.backHTML,
    }

    return jsonResponse({
      success: true,
      message: 'Draft marked as ready and queued for processing',
    })
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
