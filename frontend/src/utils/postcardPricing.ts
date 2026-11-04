import type { CountryCode, PostcardSize } from './postcardTemplate'
import type { PostgridApiMode, PostgridCountryPricing } from './postgridApi'

// ADR 0004 as amended (D3, 2026-11-04): prices come from the server
// (POSTGRID_PRICE_<COUNTRY>_<SIZE> config) via the status endpoint, keyed by
// destination country — nothing is hardcoded here anymore. Not-a-checkout
// rules still apply: prices ride inside sentences and size labels, never a
// standalone total (grep gate: no Total/Pay/Checkout strings).

export const PRICE_QUALIFIER = 'Estimates only — the final cost is set when the card is sent.'

/** Size-button estimate line, e.g. "about $1.11". */
export function estimateLabel(price: number): string {
  return `about $${price.toFixed(2)}`
}

/**
 * The single source of the send-truth sentence (June's Decision 2 + ADR 0004):
 * one line, rendered at both Send surfaces (mobile bar strip + panel).
 * Fail closed on unknown mode. Callers resolve the recipient's country first
 * (priceFor) and pass the price here; when it is null (unpriced market such
 * as GB, or no destination chosen yet) the sentence omits the price clause —
 * the qualifier carries the caveat.
 */
export function truthCopy(
  mode: PostgridApiMode | null,
  firstName: string | undefined,
  price: number | null
): string {
  if (mode === 'live') {
    const recipient = firstName || 'your recipient'
    return price !== null
      ? `This mails a real card to ${recipient} for ${estimateLabel(price)}.`
      : `This mails a real card to ${recipient}.`
  }
  if (mode === 'test' || mode === 'mock') {
    return 'Practice send — nothing will be mailed.'
  }
  return 'Mode unavailable — check your connection before sending.'
}

/**
 * Convenience: the per-size price for the recipient's country out of a
 * status payload (null-safe on payload, country, and size).
 */
export function priceFor(
  pricing: PostgridCountryPricing | undefined | null,
  countryCode: CountryCode | null | undefined,
  size: PostcardSize
): number | null {
  if (!countryCode) return null
  return pricing?.[countryCode]?.[size] ?? null
}
