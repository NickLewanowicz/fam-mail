import type { PostcardSize } from './postcardTemplate'
import type { PostgridApiMode } from './postgridApi'

// PLACEHOLDER values — Priya owns final pricing (backend/PostGrid lookup);
// static estimates only per ISSUE-0117 / docs/design/mode-and-price-affordance-spec.md.
// Not-a-checkout rules: prices ride inside sentences and size labels, never
// a standalone total (grep gate: no Total/Pay/Checkout strings).
export const PRICE_ESTIMATES: Record<PostcardSize, string> = {
  '6x4': 'about $1.11',
  '9x6': 'about $1.86',
  '11x6': 'about $2.24',
}

export const PRICE_QUALIFIER = 'Estimates only — the final cost is set when the card is sent.'

/**
 * The single source of the send-truth sentence (June's Decision 2):
 * one line, rendered at both Send surfaces (mobile bar strip + panel).
 * Fail closed on unknown mode — no false promise either way.
 */
export function truthCopy(mode: PostgridApiMode | null, firstName: string | undefined, size: PostcardSize): string {
  if (mode === 'live') {
    return `This mails a real card to ${firstName || 'your recipient'} for ${PRICE_ESTIMATES[size]}.`
  }
  if (mode === 'test' || mode === 'mock') {
    return 'Practice send — nothing will be mailed.'
  }
  return 'Mode unavailable — check your connection before sending.'
}
