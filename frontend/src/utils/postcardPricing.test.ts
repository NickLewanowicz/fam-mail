import { describe, it, expect } from 'vitest'
import { PRICE_ESTIMATES, PRICE_QUALIFIER, truthCopy } from './postcardPricing'
import type { PostgridApiMode } from './postgridApi'

const SIZES = ['6x4', '9x6', '11x6'] as const

describe('truthCopy (#117 — the single send-truth source)', () => {
  it('live mode names the recipient and the per-size estimate', () => {
    for (const size of SIZES) {
      expect(truthCopy('live', 'Grace', size)).toBe(
        `This mails a real card to Grace for ${PRICE_ESTIMATES[size]}.`
      )
    }
  })

  it('empty firstName falls back to "your recipient" — never an empty hole', () => {
    expect(truthCopy('live', undefined, '6x4')).toBe(
      `This mails a real card to your recipient for ${PRICE_ESTIMATES['6x4']}.`
    )
    expect(truthCopy('live', '', '9x6')).toBe(
      `This mails a real card to your recipient for ${PRICE_ESTIMATES['9x6']}.`
    )
  })

  it('test and mock modes carry the fail-safe practice sentence for every size', () => {
    for (const mode of ['test', 'mock'] as PostgridApiMode[]) {
      for (const size of SIZES) {
        expect(truthCopy(mode, 'Grace', size)).toBe('Practice send — nothing will be mailed.')
      }
    }
  })

  it('null mode fails closed — no false promise either way', () => {
    for (const size of SIZES) {
      expect(truthCopy(null, 'Grace', size)).toBe(
        'Mode unavailable — check your connection before sending.'
      )
    }
  })

  it('a 60-character recipient name is carried whole (wraps at render, never truncated)', () => {
    const long = 'Barnaby Thaddeus Montgomery-Fitzwilliam Alistair Pemberton XXIIII'
    expect(long.length).toBeGreaterThanOrEqual(60)
    const copy = truthCopy('live', long, '11x6')
    expect(copy).toContain(long)
    expect(copy.endsWith('.')).toBe(true)
  })

  it('estimates cover exactly the three sizes and the qualifier ships with them', () => {
    expect(Object.keys(PRICE_ESTIMATES).sort()).toEqual(['11x6', '6x4', '9x6'])
    expect(PRICE_QUALIFIER).toContain('Estimates only')
  })
})
