/**
 * Machine API key authentication for the /api/v1 agent API.
 *
 * Keys come from the API_KEYS env var ("key:label:email" entries, parsed in
 * config). Each key acts as its mapped user so postcards get normal
 * attribution and ownership. Unlike JWT auth there are no expiring tokens —
 * self-hosters mint a key per integration (Hermes, OpenClaw, cron scripts)
 * and revoke it by removing it from the env var.
 */

import type { ApiKeyEntry } from '../config'
import type { Database } from '../database'
import type { User } from '../models/user'

export interface ApiKeyAuthSuccess {
  user: User
  keyLabel: string
  error?: undefined
}

export interface ApiKeyAuthFailure {
  user?: undefined
  keyLabel?: undefined
  error: string
}

export type ApiKeyAuthResult = ApiKeyAuthSuccess | ApiKeyAuthFailure

export class ApiKeyMiddleware {
  private db: Database
  private keys: ApiKeyEntry[]

  constructor(db: Database, keys: ApiKeyEntry[]) {
    this.db = db
    this.keys = keys
  }

  /** Extract the key from `x-api-key` or `Authorization: Bearer <key>`. */
  extractKey(req: Request): string | null {
    const headerKey = req.headers.get('x-api-key')
    if (headerKey && headerKey.trim().length > 0) {
      return headerKey.trim()
    }
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim()
      if (token.length > 0) {
        return token
      }
    }
    return null
  }

  /**
   * Authenticate a request via API key.
   * /api/v1 routes accept API keys only — JWTs are rejected here so a leaked
   * browser token cannot be used as a machine credential.
   */
  authenticate(req: Request): ApiKeyAuthResult {
    const key = this.extractKey(req)
    if (!key) {
      return { error: 'API key required: pass it in the x-api-key header' }
    }

    const entry = this.keys.find((candidate) => candidate.key === key)
    if (!entry) {
      return { error: 'Invalid API key' }
    }

    const user = this.db.getUserByEmail(entry.email)
    if (!user) {
      return {
        error: `API key "${entry.label}" is mapped to unknown user "${entry.email}". ` +
          'That user must log in once to be created before the key can be used.',
      }
    }

    return { user, keyLabel: entry.label }
  }
}
