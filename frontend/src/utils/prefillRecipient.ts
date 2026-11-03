/**
 * ISSUE-0109: reconstruct a structured recipient Address from a sent
 * postcard for the History page's "Again" action.
 *
 * Post-#109 sends carry the structured address (`card.to`) persisted by the
 * backend, so the wizard prefill keeps city/state/ZIP and the correct
 * country. Cards sent before structured persistence fall back to the old
 * best-effort mapping (formatted string into addressLine1, name split,
 * US default) — the user completes the missing fields on the Address step.
 */
import type { SentPostcard } from './api'
import type { Address } from '../types/address'

export function prefillRecipientFrom(card: SentPostcard): Address {
  const nameParts = card.recipientName.trim().split(/\s+/)
  const to = card.to
  return {
    firstName: to?.firstName ?? nameParts[0] ?? '',
    lastName: to?.lastName ?? nameParts.slice(1).join(' ') ?? '',
    addressLine1: to?.addressLine1 ?? card.recipientAddress,
    ...(to?.addressLine2 ? { addressLine2: to.addressLine2 } : {}),
    city: to?.city ?? '',
    provinceOrState: to?.provinceOrState ?? '',
    postalOrZip: to?.postalOrZip ?? '',
    countryCode: to?.countryCode ?? 'US',
  }
}
