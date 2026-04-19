/**
 * Simple in-memory rate limiter middleware.
 *
 * Uses a sliding-window counter per IP (or per key). In production you'd
 * want Redis or similar, but for a single-instance Bun server this is
 * sufficient and avoids external dependencies.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

/** Default: 10 requests per minute */
const DEFAULT_LIMIT = 10
const DEFAULT_WINDOW_MS = 60_000

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private limit: number
  private windowMs: number

  constructor(limit: number = DEFAULT_LIMIT, windowMs: number = DEFAULT_WINDOW_MS) {
    this.limit = limit
    this.windowMs = windowMs
  }

  /**
   * Check if a request should be rate-limited.
   * Returns `{ allowed: true }` or `{ allowed: false, retryAfterMs }`.
   */
  check(key: string): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || now >= entry.resetAt) {
      // Start a new window
      this.store.set(key, { count: 1, resetAt: now + this.windowMs })
      return { allowed: true }
    }

    entry.count++

    if (entry.count > this.limit) {
      return { allowed: false, retryAfterMs: entry.resetAt - now }
    }

    return { allowed: true }
  }

  /** Reset all entries. Useful for testing. */
  reset(): void {
    this.store.clear()
  }

  /** Remove expired entries to prevent memory leaks. */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now >= entry.resetAt) {
        this.store.delete(key)
      }
    }
  }
}

/**
 * Extract a rate-limit key from the request (client IP or fallback).
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}
