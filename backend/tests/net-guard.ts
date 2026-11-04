// Net guard (#89 hardening, from Marcus's 2026-11-03 QA probe): replaces
// global fetch in the bun test process so ANY real egress attempt is
// recorded (url, method, api-key header, stack) to
// tests/e2e-attempts.jsonl (git-ignored) and THROWN instead of connecting.
// Loaded via bunfig.toml preload — an unmocked call fails the run loudly,
// which is what keeps #89 fixed instead of regressing. Tests that
// deliberately exercise fetch stub `global.fetch` themselves, which
// replaces this replacement.
import { appendFileSync, unlinkSync } from 'fs'

const LOG = new URL('./e2e-attempts.jsonl', import.meta.url).pathname
try { unlinkSync(LOG) } catch {}

// @ts-expect-error QA probe replaces global fetch
globalThis.fetch = async (input: unknown, init?: RequestInit) => {
  let url = ''
  let method = 'GET'
  let apiKey: string | null = null
  if (typeof input === 'string') {
    url = input
  } else if (input && typeof input === 'object' && 'url' in (input as Record<string, unknown>)) {
    url = String((input as { url: unknown }).url)
  } else {
    url = String(input)
  }
  if (init && typeof init === 'object') {
    method = String((init as { method?: string }).method ?? 'GET')
    const h = (init as { headers?: unknown }).headers
    if (h && typeof h === 'object') {
      const rec = h as Record<string, string>
      apiKey = rec['x-api-key'] ?? rec['X-API-Key'] ?? rec['authorization'] ?? null
      if (!apiKey && typeof (h as { get?: unknown }).get === 'function') {
        apiKey = (h as Headers).get('x-api-key')
      }
    }
  }
  const stack = (new Error().stack ?? '').split('\n').slice(2, 10).join(' | ')
  appendFileSync(LOG, JSON.stringify({ url, method, apiKey, stack }) + '\n')
  throw new TypeError(`QA-NETPROBE: blocked real network egress to ${url}`)
}
