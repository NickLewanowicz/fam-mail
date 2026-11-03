import { describe, it, expect, beforeEach, spyOn } from 'bun:test'
import { processDueDrafts } from './scheduler'
import { DraftRoutes } from '../routes/drafts'
import { PostGridService } from './postgrid'
import { Database } from '../database'
import type { User } from '../models/user'
import type { PostGridPostcardRequest } from '../types/postgrid'

/**
 * Scheduled-draft dispatcher tests: a draft scheduled for a future date must
 * not send, a due one must go through the full publish pipeline, and failures
 * must reschedule instead of hot-looping.
 */

function makeMockPostgrid() {
  const svc = new PostGridService({
    mode: 'test', testApiKey: 't', liveApiKey: 'l',
    forceTestMode: false, mockMode: true, webhookSecret: '', size: '6x4', senderId: '',
  })
  const spy = spyOn(svc, 'createPostcard').mockImplementation(async (request: PostGridPostcardRequest) => ({
    id: `pc_${crypto.randomUUID().slice(0, 8)}`,
    object: 'postcard',
    live: false,
    status: 'ready',
    to: request.to,
    size: request.size ?? '6x4',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))
  return { svc, spy }
}

describe('scheduled draft dispatcher', () => {
  let db: Database
  let owner: User

  const address = {
    firstName: 'Grace',
    lastName: 'Hopper',
    addressLine1: '1 Spectacular Way',
    city: 'New Haven',
    provinceOrState: 'CT',
    postalOrZip: '06510',
    countryCode: 'US',
  }

  beforeEach(() => {
    db = new Database(':memory:')
    owner = {
      id: crypto.randomUUID(),
      oidcSub: 'oidc-sched',
      oidcIssuer: 'https://accounts.example.com',
      email: 'sched@example.com',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    db.insertUser(owner)
  })

  function insertScheduledDraft(scheduledFor: string, userId: string = owner.id) {
    const id = crypto.randomUUID()
    db.insertDraft({
      id,
      userId,
      recipientAddress: address,
      // #118: publish requires the sender — the scheduler tests exercise
      // retry/clear behavior, not the sender gate
      senderAddress: address,
      message: 'Happy birthday from the scheduler!',
      state: 'ready',
      size: '6x4',
      scheduledFor,
    })
    return id
  }

  it('sends a due scheduled draft and clears its schedule', async () => {
    const { svc, spy } = makeMockPostgrid()
    const routes = new DraftRoutes(db, null as never, svc)
    const draftId = insertScheduledDraft(new Date(Date.now() - 60_000).toISOString())

    const result = await processDueDrafts(db, routes)

    expect(result.processed).toBe(1)
    expect(result.sent).toBe(1)
    expect(result.failed).toBe(0)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(db.getDraft(draftId)?.scheduledFor).toBeUndefined()
    // postcard recorded with draft attribution
    const sent = db.listPostcardsByUser(owner.id)
    expect(sent).toHaveLength(1)
    expect(sent[0]?.draftId).toBe(draftId)
  })

  it('does not send a draft scheduled for the future', async () => {
    const { svc, spy } = makeMockPostgrid()
    const routes = new DraftRoutes(db, null as never, svc)
    insertScheduledDraft(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())

    const result = await processDueDrafts(db, routes)

    expect(result.processed).toBe(0)
    expect(spy).not.toHaveBeenCalled()
  })

  it('reschedules a transient (5xx) failed publish instead of hot-looping', async () => {
    const { svc, spy } = makeMockPostgrid()
    spy.mockImplementation(async () => {
      throw { status: 503, message: 'PostGrid unavailable' }
    })
    const routes = new DraftRoutes(db, null as never, svc)
    const draftId = insertScheduledDraft(new Date(Date.now() - 60_000).toISOString())

    const result = await processDueDrafts(db, routes)

    expect(result.processed).toBe(1)
    expect(result.sent).toBe(0)
    expect(result.failed).toBe(1)
    const draft = db.getDraft(draftId)
    expect(draft?.scheduledFor).toBeDefined()
    // retry date is in the future (≈15 min out)
    expect(Date.parse(draft?.scheduledFor ?? '')).toBeGreaterThan(Date.now())
  })

  it('cancels the schedule when the draft owner no longer exists', async () => {
    const { svc, spy } = makeMockPostgrid()
    const routes = new DraftRoutes(db, null as never, svc)
    // Draft attributed to a user id with no matching user row
    const draftId = insertScheduledDraft(new Date(Date.now() - 60_000).toISOString(), crypto.randomUUID())

    const result = await processDueDrafts(db, routes)

    expect(result.processed).toBe(1)
    expect(result.sent).toBe(0)
    expect(spy).not.toHaveBeenCalled()
    expect(db.getDraft(draftId)?.scheduledFor).toBeUndefined()
  })

  it('unschedules a permanent (4xx) failure instead of retrying forever', async () => {
    const { svc, spy } = makeMockPostgrid()
    spy.mockImplementation(async () => {
      throw { status: 402, message: 'PostGrid payment required' }
    })
    const routes = new DraftRoutes(db, null as never, svc)
    const draftId = insertScheduledDraft(new Date(Date.now() - 60_000).toISOString())

    const result = await processDueDrafts(db, routes)

    expect(result.failed).toBe(1)
    // Permanent client errors cancel the schedule — no endless paid retries
    expect(db.getDraft(draftId)?.scheduledFor).toBeUndefined()
  })
})
