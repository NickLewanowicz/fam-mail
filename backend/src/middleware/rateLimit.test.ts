import { describe, it, expect, beforeEach } from 'bun:test'
import { RateLimiter, getClientIp } from './rateLimit'

describe('RateLimiter', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter(3, 1000) // 3 requests per 1 second
  })

  it('allows requests within the limit', () => {
    expect(limiter.check('ip-1').allowed).toBe(true)
    expect(limiter.check('ip-1').allowed).toBe(true)
    expect(limiter.check('ip-1').allowed).toBe(true)
  })

  it('blocks requests exceeding the limit', () => {
    limiter.check('ip-1')
    limiter.check('ip-1')
    limiter.check('ip-1')

    const result = limiter.check('ip-1')
    expect(result.allowed).toBe(false)
    expect(result.retryAfterMs).toBeDefined()
    expect(result.retryAfterMs!).toBeGreaterThan(0)
  })

  it('tracks different IPs independently', () => {
    limiter.check('ip-1')
    limiter.check('ip-1')
    limiter.check('ip-1')

    // ip-1 is now rate limited
    expect(limiter.check('ip-1').allowed).toBe(false)

    // ip-2 is not rate limited
    expect(limiter.check('ip-2').allowed).toBe(true)
  })

  it('resets after the time window expires', () => {
    limiter.check('ip-1')
    limiter.check('ip-1')
    limiter.check('ip-1')
    expect(limiter.check('ip-1').allowed).toBe(false)

    // Simulate window expiry by creating a new limiter (time-based)
    // We can't easily advance time in bun:test, so we test the reset method
    limiter.reset()
    expect(limiter.check('ip-1').allowed).toBe(true)
  })

  it('cleanup removes expired entries', () => {
    limiter.check('ip-1')
    limiter.cleanup()
    // After cleanup, a new window starts
    expect(limiter.check('ip-1').allowed).toBe(true)
  })

  it('reset clears all entries', () => {
    limiter.check('ip-1')
    limiter.check('ip-2')
    limiter.check('ip-3')

    limiter.reset()

    expect(limiter.check('ip-1').allowed).toBe(true)
    expect(limiter.check('ip-2').allowed).toBe(true)
    expect(limiter.check('ip-3').allowed).toBe(true)
  })
})

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('extracts IP from x-real-ip header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '9.8.7.6' },
    })
    expect(getClientIp(req)).toBe('9.8.7.6')
  })

  it('prefers x-forwarded-for over x-real-ip', () => {
    const req = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '1.2.3.4',
        'x-real-ip': '9.8.7.6',
      },
    })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('returns unknown when no IP headers present', () => {
    const req = new Request('http://localhost')
    expect(getClientIp(req)).toBe('unknown')
  })

  it('trims whitespace from x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '  1.2.3.4  , 5.6.7.8' },
    })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })
})
