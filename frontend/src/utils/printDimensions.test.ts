import { describe, it, expect } from 'vitest'
import { PRINT_DPI, dimensionAdvice } from './printDimensions'

describe('dimensionAdvice (D1 — warn, never reject)', () => {
  it('6x4 requirements are the 300-DPI print size incl. bleed (1875×1275)', () => {
    const advice = dimensionAdvice('6x4', { width: 1875, height: 1275 })
    expect(advice.required).toEqual({ width: 1875, height: 1275 })
    expect(advice.ok).toBe(true)
  })

  it('6x4 landscape below the minimum is not ok', () => {
    expect(dimensionAdvice('6x4', { width: 1800, height: 1200 }).ok).toBe(false)
  })

  it('6x4 landscape comfortably above the minimum is ok', () => {
    expect(dimensionAdvice('6x4', { width: 3000, height: 2000 }).ok).toBe(true)
  })

  it('9x6 and 11x6 carry their own scaled requirements', () => {
    expect(dimensionAdvice('9x6', { width: 2820, height: 1875 })).toMatchObject({ ok: true })
    expect(dimensionAdvice('9x6', { width: 2820, height: 1875 }).required).toEqual({ width: 2820, height: 1875 })
    expect(dimensionAdvice('9x6', { width: 2819, height: 1875 }).ok).toBe(false)
    expect(dimensionAdvice('11x6', { width: 3375, height: 1875 }).required).toEqual({ width: 3375, height: 1875 })
    expect(dimensionAdvice('11x6', { width: 3375, height: 1875 }).ok).toBe(true)
    expect(dimensionAdvice('11x6', { width: 3374, height: 1875 }).ok).toBe(false)
  })

  it('portrait photos pass via orientation tolerance (required w/h swapped)', () => {
    // Rotated relative to the 6x4 card: 1275 wide × 1875 tall — the printer
    // rotates it, so this must be ok even though width < required.width
    const portrait = dimensionAdvice('6x4', { width: 1275, height: 1875 })
    expect(portrait.ok).toBe(true)
    // required stays the card's landscape shape (stable copy target)
    expect(portrait.required).toEqual({ width: 1875, height: 1275 })
    // Same tolerance on other sizes: portrait 9x6
    expect(dimensionAdvice('9x6', { width: 1875, height: 2820 }).ok).toBe(true)
    expect(dimensionAdvice('11x6', { width: 1875, height: 3375 }).ok).toBe(true)
  })

  it('a small portrait photo still fails both orientations', () => {
    expect(dimensionAdvice('6x4', { width: 1000, height: 1500 }).ok).toBe(false)
  })

  it('requirements derive from print-inches × DPI (no pixel literals)', () => {
    // The inch table (trim + bleed): every requirement must equal inches ×
    // PRINT_DPI, so changing DPI rescales the whole table consistently
    const inches = {
      '6x4': { width: 6.25, height: 4.25 },
      '9x6': { width: 9.4, height: 6.25 },
      '11x6': { width: 11.25, height: 6.25 },
    } as const
    for (const size of ['6x4', '9x6', '11x6'] as const) {
      const { required } = dimensionAdvice(size, { width: 0, height: 0 })
      expect(required.width).toBe(Math.round(inches[size].width * PRINT_DPI))
      expect(required.height).toBe(Math.round(inches[size].height * PRINT_DPI))
    }
    expect(PRINT_DPI).toBe(300)
  })
})
