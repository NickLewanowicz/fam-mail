import { describe, it, expect } from 'vitest'
import { PRICE_QUALIFIER, estimateLabel, priceFor, truthCopy } from './postcardPricing'
import type { PostcardSizePricing, PostgridCountryPricing } from './postgridApi'

const SIZES = ['6x4', '9x6', '11x6'] as const

describe('truthCopy (#117/#0004 — the single send-truth source)', () => {
  it('live mode names the recipient and the server estimate', () => {
    const pricing: PostcardSizePricing = { '6x4': 1.11, '9x6': 1.86, '11x6': 2.24 }
    for (const size of SIZES) {
      expect(truthCopy('live', 'Grace', pricing[size])).toBe(
        `This mails a real card to Grace for ${estimateLabel(pricing[size])}.`
      )
    }
  })


  it('omits the price clause when the server has no price for the size', () => {
    expect(truthCopy('live', 'Grace', null)).toBe(
      'This mails a real card to Grace.'
    )
  })

  it('empty firstName falls back to "your recipient"', () => {
    expect(truthCopy('live', undefined, 1.11)).toBe(
      `This mails a real card to your recipient for ${estimateLabel(1.11)}.`
    )
    expect(truthCopy('live', '', 1.86)).toBe(
      `This mails a real card to your recipient for ${estimateLabel(1.86)}.`
    )
  })

  it('test and mock modes carry the fail-safe practice sentence regardless of price and size', () => {
    const pricing: PostcardSizePricing = { '6x4': 1.11, '9x6': 1.86, '11x6': 2.24 }
    for (const mode of ['test', 'mock'] as const) {
      for (const size of SIZES) {
        expect(truthCopy(mode, 'Grace', pricing[size])).toBe('Practice send — nothing will be mailed.')
      }
    }
  })

  it('null mode fails closed — no false promise either way', () => {
    const pricing: PostcardSizePricing = { '6x4': 1.11, '9x6': 1.86, '11x6': 2.24 }
    for (const size of SIZES) {
      expect(truthCopy(null, 'Grace', pricing[size])).toBe(
        'Mode unavailable — check your connection before sending.'
      )
    }
  })

  it('a 60-character recipient name is carried whole (wraps at render, never truncated)', () => {
    const long = 'Barnaby Thaddeus Montgomery-Fitzwilliam Alistair Pemberton XXIIII'
    expect(long.length).toBeGreaterThanOrEqual(60)
    const copy = truthCopy('live', long, 2.24)
    expect(copy).toContain(long)
    expect(copy.endsWith('.')).toBe(true)
  })
})

describe('estimateLabel + priceFor (ADR 0004)', () => {
  it('formats server prices as "about $X.XX"', () => {
    expect(estimateLabel(1.11)).toBe('about $1.11')
    expect(estimateLabel(2)).toBe('about $2.00')
    expect(estimateLabel(0.5)).toBe('about $0.50')
  })

  it('priceFor reads the destination-country price out of the payload, null-safe (D3)', () => {
    const pricing: PostgridCountryPricing = {
      US: { '6x4': 0.902, '9x6': 1.023, '11x6': 1.289 },
      CA: { '6x4': 2.12, '9x6': 2.22, '11x6': 2.97 },
      GB: { '6x4': null, '9x6': null, '11x6': null },
    }
    expect(priceFor(pricing, 'US', '6x4')).toBe(0.902)
    expect(priceFor(pricing, 'CA', '11x6')).toBe(2.97)
    expect(priceFor(pricing, 'GB', '6x4')).toBeNull()
    expect(priceFor(pricing, 'US', '9x6')).toBe(1.023)
    // Null-safety on every argument
    expect(priceFor(undefined, 'US', '6x4')).toBeNull()
    expect(priceFor(null, 'CA', '6x4')).toBeNull()
    expect(priceFor(pricing, null, '6x4')).toBeNull()
    expect(priceFor(pricing, undefined, '6x4')).toBeNull()
  })

  it('truthCopy matrix (D3): US and CA price the clause, GB omits it', () => {
    const pricing: PostgridCountryPricing = {
      US: { '6x4': 0.902, '9x6': 1.023, '11x6': 1.289 },
      CA: { '6x4': 2.12, '9x6': 2.22, '11x6': 2.97 },
      GB: { '6x4': null, '9x6': null, '11x6': null },
    }
    // US recipient: clause carries the US price
    expect(truthCopy('live', 'Grace', priceFor(pricing, 'US', '6x4'))).toBe(
      `This mails a real card to Grace for ${estimateLabel(0.902)}.`
    )
    // CA recipient: clause carries the (higher) CA Lettermail price
    expect(truthCopy('live', 'Grace', priceFor(pricing, 'CA', '6x4'))).toBe(
      `This mails a real card to Grace for ${estimateLabel(2.12)}.`
    )
    // GB recipient: unpriced — clause omitted, qualifier carries the caveat
    expect(truthCopy('live', 'Grace', priceFor(pricing, 'GB', '9x6'))).toBe(
      'This mails a real card to Grace.'
    )
    // No destination chosen yet: no price either
    expect(truthCopy('live', 'Grace', priceFor(pricing, null, '6x4'))).toBe(
      'This mails a real card to Grace.'
    )
  })

  it('PRICE_QUALIFIER ships the estimates-only caveat', () => {
    expect(PRICE_QUALIFIER).toContain('Estimates only')
  })
})
