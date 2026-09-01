import { describe, it, expect, beforeEach } from 'bun:test'
import { ApiKeyMiddleware } from './apiKey'
import { Database } from '../database'
import type { User } from '../models/user'

describe('ApiKeyMiddleware', () => {
  let db: Database
  let middleware: ApiKeyMiddleware
  let owner: User

  const KEYS = [
    { key: 'fam_hermes_key', label: 'hermes', email: 'agent@example.com' },
    { key: 'fam_cron_key', label: 'cron', email: 'agent@example.com' },
  ]

  beforeEach(() => {
    db = new Database(':memory:')
    owner = {
      id: crypto.randomUUID(),
      oidcSub: 'oidc-agent',
      oidcIssuer: 'https://accounts.example.com',
      email: 'agent@example.com',
      emailVerified: true,
      firstName: 'Agent',
      lastName: 'User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    db.insertUser(owner)
    middleware = new ApiKeyMiddleware(db, KEYS)
  })

  describe('extractKey', () => {
    it('reads the x-api-key header', () => {
      const req = new Request('http://localhost/api/v1/postcards', {
        headers: { 'x-api-key': 'fam_hermes_key' },
      })
      expect(middleware.extractKey(req)).toBe('fam_hermes_key')
    })

    it('reads a Bearer token', () => {
      const req = new Request('http://localhost/api/v1/postcards', {
        headers: { authorization: 'Bearer fam_cron_key' },
      })
      expect(middleware.extractKey(req)).toBe('fam_cron_key')
    })

    it('prefers x-api-key over Bearer', () => {
      const req = new Request('http://localhost/api/v1/postcards', {
        headers: { 'x-api-key': 'fam_hermes_key', authorization: 'Bearer fam_cron_key' },
      })
      expect(middleware.extractKey(req)).toBe('fam_hermes_key')
    })

    it('returns null when no key headers are present', () => {
      expect(middleware.extractKey(new Request('http://localhost/api/v1/postcards'))).toBeNull()
    })

    it('returns null for empty header values', () => {
      const req = new Request('http://localhost/api/v1/postcards', {
        headers: { 'x-api-key': '   ' },
      })
      expect(middleware.extractKey(req)).toBeNull()
    })
  })

  describe('authenticate', () => {
    it('authenticates a valid key and maps to its user', () => {
      const req = new Request('http://localhost/api/v1/postcards', {
        headers: { 'x-api-key': 'fam_hermes_key' },
      })
      const result = middleware.authenticate(req)
      expect(result.error).toBeUndefined()
      expect(result.user?.id).toBe(owner.id)
      expect(result.keyLabel).toBe('hermes')
    })

    it('rejects a request with no key', () => {
      const result = middleware.authenticate(new Request('http://localhost/api/v1/postcards'))
      expect(result.error).toBeDefined()
      expect(result.user).toBeUndefined()
    })

    it('rejects an unknown key', () => {
      const req = new Request('http://localhost/api/v1/postcards', {
        headers: { 'x-api-key': 'fam_wrong_key' },
      })
      const result = middleware.authenticate(req)
      expect(result.error).toBe('Invalid API key')
    })

    it('rejects a key mapped to a user that does not exist yet', () => {
      const m = new ApiKeyMiddleware(db, [
        { key: 'fam_ghost_key', label: 'ghost', email: 'ghost@example.com' },
      ])
      const req = new Request('http://localhost/api/v1/postcards', {
        headers: { 'x-api-key': 'fam_ghost_key' },
      })
      const result = m.authenticate(req)
      expect(result.error).toContain('unknown user')
    })

    it('rejects JWT-shaped bearer tokens (API keys only on /api/v1)', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.sig'
      const req = new Request('http://localhost/api/v1/postcards', {
        headers: { authorization: `Bearer ${jwt}` },
      })
      const result = middleware.authenticate(req)
      expect(result.error).toBe('Invalid API key')
    })
  })
})
