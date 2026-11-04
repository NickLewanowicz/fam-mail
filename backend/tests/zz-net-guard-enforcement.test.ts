import { describe, it, expect } from 'bun:test'
import { existsSync, readFileSync } from 'fs'

/**
 * ISSUE-0089 hard enforcement (wave 3): the net-guard preload records every
 * real egress attempt to tests/e2e-attempts.jsonl. This file is named to
 * sort LAST so it runs after every suite — if any unmocked call was made
 * (even one swallowed by a try/catch), the whole run fails loudly here.
 * Stubbed fetches (per-test global.fetch mocks) replace the guard before it
 * can record, so deliberately-stubbed tests never trip this — only REAL
 * unmocked egress attempts do.
 */
describe('net-guard enforcement (#89)', () => {
  it('records zero unmocked egress attempts across the whole run', () => {
    const logPath = new URL('./e2e-attempts.jsonl', import.meta.url).pathname
    if (!existsSync(logPath)) return

    const entries = readFileSync(logPath, 'utf-8')
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        try {
          return JSON.parse(line) as { url: string; method: string; apiKey: string | null }
        } catch {
          return { url: line, method: 'UNKNOWN', apiKey: null }
        }
      })

    const summary = entries.map((e) => `${e.method} ${e.url}${e.apiKey ? ` (key: ${e.apiKey})` : ''}`).join('\n  ')
    expect(
      entries,
      `unmocked network egress was attempted during the test run:\n  ${summary}`
    ).toEqual([])
  })
})
