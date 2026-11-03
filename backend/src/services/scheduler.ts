/**
 * Scheduled-draft dispatcher.
 *
 * The drafts API lets users schedule a postcard for a future date (birthdays,
 * anniversaries). Scheduling only stamps the draft with `scheduledFor` — this
 * dispatcher is what actually mails them: on a short interval it finds ready
 * drafts whose date has passed and runs them through the normal publish
 * pipeline, attributed to the draft's owner.
 */

import type { Database } from '../database'
import type { DraftRoutes } from '../routes/drafts'
import { logger } from '../utils/logger'

/** Failed publishes retry after this delay instead of hot-looping. */
const RETRY_DELAY_MS = 15 * 60_000

let dispatchInProgress = false

export interface DispatchResult {
  processed: number
  sent: number
  failed: number
}

/**
 * Publish every scheduled draft whose date has passed.
 * Safe to call concurrently (overlapping invocations are no-ops).
 */
export async function processDueDrafts(db: Database, draftRoutes: DraftRoutes): Promise<DispatchResult> {
  if (dispatchInProgress) {
    return { processed: 0, sent: 0, failed: 0 }
  }
  dispatchInProgress = true
  try {
    const now = Date.now()
    const due = db
      .getReadyScheduledDrafts()
      .filter((draft) => draft.scheduledFor !== undefined && Date.parse(draft.scheduledFor) <= now)

    let sent = 0
    let failed = 0

    for (const draft of due) {
      const owner = db.getUserById(draft.userId)
      if (!owner) {
        // No owner to attribute the send to — cancel the schedule so it
        // doesn't block the queue forever.
        logger.warn('Scheduled draft has no owner; cancelling schedule', { draftId: draft.id })
        db.updateDraft(draft.id, { scheduledFor: null })
        continue
      }

      const result = await draftRoutes.publishDraftById(draft.id, owner, { allowScheduled: true })
      if (result.status === 200) {
        sent++
        // Clear the schedule so the draft cannot fire twice. The unique
        // postcard record (draft-<id>) is a second line of defense.
        db.updateDraft(draft.id, { scheduledFor: null })
        logger.info('Scheduled postcard sent', { draftId: draft.id })
      } else if (result.status >= 500 || result.status === 0) {
        failed++
        // Transient upstream failure — retry later
        const retryAt = new Date(Date.now() + RETRY_DELAY_MS).toISOString()
        db.updateDraft(draft.id, { scheduledFor: retryAt })
        logger.error('Scheduled draft publish failed; will retry', {
          draftId: draft.id,
          status: result.status,
          retryAt,
        })
      } else {
        // 4xx = permanent (validation, funds, address). Retrying would just
        // fail again — cancel the schedule rather than loop forever.
        failed++
        db.updateDraft(draft.id, { scheduledFor: null, state: 'draft' })
        logger.error('Scheduled draft publish failed permanently; unscheduled', {
          draftId: draft.id,
          status: result.status,
        })
      }
    }

    return { processed: due.length, sent, failed }
  } finally {
    dispatchInProgress = false
  }
}

/**
 * Start the background dispatch loop. Returns the timer so tests can stop it.
 */
export function startScheduledDraftDispatcher(
  db: Database,
  draftRoutes: DraftRoutes,
  intervalMs = 30_000
): ReturnType<typeof setInterval> {
  const timer = setInterval(() => {
    processDueDrafts(db, draftRoutes).catch((error) =>
      logger.error('Scheduled draft dispatcher error', { error })
    )
  }, intervalMs)
  // Don't hold the process open just for the dispatcher
  if (timer.unref) timer.unref()
  return timer
}
