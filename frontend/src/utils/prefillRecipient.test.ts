import { describe, it, expect } from 'vitest'
import { prefillRecipientFrom } from './prefillRecipient'
import type { SentPostcard } from './api'

// ISSUE-0109: "Again" must reconstruct the STRUCTURED recipient address —
// the old mapping stuffed the formatted string into addressLine1, blanked
// city/ZIP, and forced countryCode 'US' even for CA/GB cards.

const caCard: SentPostcard = {
  id: 'pc_ca',
  recipientName: 'Jean Tremblay',
  recipientAddress: '456 Rue Principale, Ottawa, ON K1A 0B1',
  status: 'sent',
  mode: 'test',
  createdAt: '2026-11-01T00:00:00Z',
  to: {
    firstName: 'Jean',
    lastName: 'Tremblay',
    addressLine1: '456 Rue Principale',
    addressLine2: 'Apt 4B',
    city: 'Ottawa',
    provinceOrState: 'ON',
    postalOrZip: 'K1A 0B1',
    countryCode: 'CA',
  },
}

const legacyCard: SentPostcard = {
  id: 'pc_old',
  recipientName: 'Grace Hopper',
  recipientAddress: '1 Spectacular Way, New Haven, CT 06510',
  status: 'sent',
  mode: 'test',
  createdAt: '2026-11-01T00:00:00Z',
  // no structured `to` — sent before #109 persisted it
}

describe('prefillRecipientFrom', () => {
  it('reconstructs the structured address for a CA postcard (country, city, ZIP intact)', () => {
    const addr = prefillRecipientFrom(caCard)
    expect(addr).toEqual({
      firstName: 'Jean',
      lastName: 'Tremblay',
      addressLine1: '456 Rue Principale',
      addressLine2: 'Apt 4B',
      city: 'Ottawa',
      provinceOrState: 'ON',
      postalOrZip: 'K1A 0B1',
      countryCode: 'CA',
    })
  })

  it('keeps the US country code on structured US cards instead of defaulting blindly', () => {
    const addr = prefillRecipientFrom({
      ...caCard,
      to: { ...caCard.to, countryCode: 'US', postalOrZip: '97205' },
    })
    expect(addr.countryCode).toBe('US')
    expect(addr.postalOrZip).toBe('97205')
  })

  it('falls back to name-splitting + formatted line for cards sent before structured persistence', () => {
    const addr = prefillRecipientFrom(legacyCard)
    expect(addr.firstName).toBe('Grace')
    expect(addr.lastName).toBe('Hopper')
    expect(addr.addressLine1).toBe('1 Spectacular Way, New Haven, CT 06510')
    expect(addr.addressLine2).toBeUndefined()
    expect(addr.city).toBe('')
    expect(addr.provinceOrState).toBe('')
    expect(addr.postalOrZip).toBe('')
    expect(addr.countryCode).toBe('US')
  })

  it('handles single-word recipient names without crashing', () => {
    const addr = prefillRecipientFrom({ ...legacyCard, recipientName: 'Cher' })
    expect(addr.firstName).toBe('Cher')
    expect(addr.lastName).toBe('')
  })
})
