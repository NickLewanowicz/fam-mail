import { describe, it, expect } from 'vitest'
import { timeAgo } from './time'

describe('timeAgo', () => {
  it('renders relative offsets', () => {
    const now = Date.parse('2026-09-01T12:00:00Z')
    expect(timeAgo('2026-09-01T11:59:30Z', now)).toBe('just now')
    expect(timeAgo('2026-09-01T11:30:00Z', now)).toBe('30m ago')
    expect(timeAgo('2026-09-01T09:00:00Z', now)).toBe('3h ago')
    expect(timeAgo('2026-08-28T12:00:00Z', now)).toBe('4d ago')
  })

  it('falls back to the date for anything older than a month', () => {
    const out = timeAgo('2026-01-01T00:00:00Z', Date.parse('2026-09-01T12:00:00Z'))
    expect(out).toMatch(/\d/)
  })

  it('handles bad input', () => {
    expect(timeAgo(undefined)).toBe('')
    expect(timeAgo('not-a-date')).toBe('')
  })
})
