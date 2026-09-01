/**
 * Integration tests for the /api/v1 agent API (API-key auth) and the
 * fail-closed admin check on PostGrid mode switching.
 *
 * This file must set env BEFORE importing ./server (module-level singletons).
 * It mirrors src/server.test.ts's env and adds API_KEYS; bun runs test files
 * alphabetically, so this file initializes the shared server module with a
 * superset of the env server.test.ts expects.
 */

import { describe, it, expect, beforeAll, spyOn, afterEach } from 'bun:test'
import type { PostGridService, PostGridPostcardRequest } from './services/postgrid'
import type { PostGridPostcardResponse } from './types/postgrid'
import type { User } from './models/user'

describe('Agent API /api/v1', () => {
  let handleRequest: (req: Request) => Promise<Response>
  let db: import('./database').Database
  let jwtService: import('./services/jwtService').JWTService
  let postgrid: PostGridService
  let config: import('./config').Config
  let agentUser: User
  let createSpy: ReturnType<typeof spyOn>

  beforeAll(async () => {
    process.env.POSTGRID_MODE = 'test'
    process.env.POSTGRID_TEST_API_KEY = 'pg_test_123'
    process.env.POSTGRID_LIVE_API_KEY = 'pg_live_456'
    process.env.POSTGRID_FORCE_TEST_MODE = 'false'
    process.env.LLM_PROVIDER = 'openrouter'
    process.env.LLM_API_KEY = 'sk-123'
    process.env.LLM_MODEL = 'openai/gpt-4o'
    process.env.DATABASE_PATH = '/tmp/test-fammail.db'
    process.env.PORT = '8484'
    process.env.NODE_ENV = 'test'
    process.env.OIDC_ISSUER_URL = 'https://accounts.google.com/.well-known/openid-configuration'
    process.env.OIDC_CLIENT_ID = 'test-client-id'
    process.env.OIDC_CLIENT_SECRET = 'test-client-secret'
    process.env.OIDC_REDIRECT_URI = 'http://localhost:8484/api/auth/callback'
    process.env.JWT_SECRET = 'test-secret-key-minimum-32-characters-long'
    process.env.JWT_EXPIRES_IN = '7d'
    process.env.JWT_REFRESH_EXPIRES_IN = '30d'
    process.env.ADMIN_EMAILS = 'admin@example.com'
    // One key with label, one without ("key::email" form)
    process.env.API_KEYS = 'fam_test_agent_key:hermes-agent:agent-user@example.com,fam_second_key::agent-user@example.com'

    const module = await import('./server')
    handleRequest = module.handleRequest
    db = module.db
    postgrid = module.postgrid
    jwtService = module.jwtService
    config = module.config

    // Map the API key to a real user row
    agentUser = db.getUserByEmail('agent-user@example.com') ?? undefined as unknown as User
    if (!agentUser || !agentUser.id) {
      agentUser = {
        id: crypto.randomUUID(),
        oidcSub: 'oidc-agent-user',
        oidcIssuer: 'https://accounts.example.com',
        email: 'agent-user@example.com',
        emailVerified: true,
        firstName: 'Agent',
        lastName: 'User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      db.insertUser(agentUser)
    }

    // Never hit the real PostGrid API from tests
    createSpy = spyOn(postgrid, 'createPostcard').mockImplementation(async (request: PostGridPostcardRequest) => ({
      id: `pc_${crypto.randomUUID().slice(0, 8)}`,
      object: 'postcard',
      live: false,
      status: 'ready',
      to: request.to,
      size: request.size ?? '6x4',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }) as PostGridPostcardResponse)
  })

  afterEach(() => {
    createSpy.mockClear()
  })

  const validBody = {
    to: {
      firstName: 'Grace',
      lastName: 'Hopper',
      addressLine1: '1 Spectacular Way',
      city: 'New Haven',
      provinceOrState: 'CT',
      postalOrZip: '06510',
      countryCode: 'US',
    },
    from: {
      firstName: 'Nick',
      lastName: 'Sender',
      addressLine1: '2 Return Rd',
      city: 'New Haven',
      provinceOrState: 'CT',
      postalOrZip: '06511',
      countryCode: 'US',
    },
    message: 'Happy birthday from your friendly local agent!',
    size: '6x4',
  }

  describe('POST /api/v1/postcards', () => {
    it('creates a postcard with a valid x-api-key', async () => {
      const req = new Request('http://localhost/api/v1/postcards', {
        method: 'POST',
        headers: { 'x-api-key': 'fam_test_agent_key' },
        body: JSON.stringify(validBody),
      })
      const res = await handleRequest(req)
      const data = await res.json() as { success?: boolean; testMode?: boolean }

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(createSpy).toHaveBeenCalledTimes(1)
    })

    it('accepts the key via Authorization: Bearer', async () => {
      const req = new Request('http://localhost/api/v1/postcards', {
        method: 'POST',
        headers: { authorization: 'Bearer fam_test_agent_key' },
        body: JSON.stringify(validBody),
      })
      const res = await handleRequest(req)
      expect(res.status).toBe(200)
    })

    it('returns 401 without a key', async () => {
      const req = new Request('http://localhost/api/v1/postcards', {
        method: 'POST',
        body: JSON.stringify(validBody),
      })
      const res = await handleRequest(req)
      const data = await res.json() as { error?: string }
      expect(res.status).toBe(401)
      expect(data.error).toContain('API key required')
    })

    it('returns 401 with an unknown key', async () => {
      const req = new Request('http://localhost/api/v1/postcards', {
        method: 'POST',
        headers: { 'x-api-key': 'fam_not_a_real_key' },
        body: JSON.stringify(validBody),
      })
      const res = await handleRequest(req)
      expect(res.status).toBe(401)
    })

    it('rejects JWT bearer tokens — API keys only', async () => {
      const token = await jwtService.generateAccessToken(agentUser)
      const req = new Request('http://localhost/api/v1/postcards', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify(validBody),
      })
      const res = await handleRequest(req)
      expect(res.status).toBe(401)
    })

    it('returns 400 with validation errors for a bad address', async () => {
      const req = new Request('http://localhost/api/v1/postcards', {
        method: 'POST',
        headers: { 'x-api-key': 'fam_test_agent_key' },
        body: JSON.stringify({
          ...validBody,
          to: { ...validBody.to, postalOrZip: 'WRONG' },
        }),
      })
      const res = await handleRequest(req)
      const data = await res.json() as { errors?: Array<{ field: string }> }
      expect(res.status).toBe(400)
      expect(data.errors?.some((e) => e.field.startsWith('to.postalOrZip'))).toBe(true)
      expect(createSpy).not.toHaveBeenCalled()
    })

    it('records the postcard against the key owner user', async () => {
      const req = new Request('http://localhost/api/v1/postcards', {
        method: 'POST',
        headers: { 'x-api-key': 'fam_test_agent_key' },
        body: JSON.stringify(validBody),
      })
      await handleRequest(req)
      const sent = db.listPostcardsByUser(agentUser.id)
      expect(sent.length).toBeGreaterThan(0)
      expect(sent[0]?.senderEmail).toBe('agent-user@example.com')
    })

    it('sends the return address to PostGrid', async () => {
      const req = new Request('http://localhost/api/v1/postcards', {
        method: 'POST',
        headers: { 'x-api-key': 'fam_test_agent_key' },
        body: JSON.stringify(validBody),
      })
      await handleRequest(req)
      const request = createSpy.mock.calls[0][0] as PostGridPostcardRequest
      expect(request.from?.firstName).toBe('Nick')
      expect(request.from?.postalOrZip).toBe('06511')
    })

    it('builds full-bleed image front artwork for image-only cards', async () => {
      // Minimal valid PNG header, base64-encoded
      const pngBase64 = Buffer.from(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
      ).toString('base64')
      const req = new Request('http://localhost/api/v1/postcards', {
        method: 'POST',
        headers: { 'x-api-key': 'fam_test_agent_key' },
        body: JSON.stringify({ ...validBody, message: undefined, image: pngBase64 }),
      })
      const res = await handleRequest(req)
      expect(res.status).toBe(200)
      const request = createSpy.mock.calls[0][0] as PostGridPostcardRequest
      expect(request.frontHTML).toContain('<img src="data:image/png;base64,')
      expect(request.frontHTML).toContain('object-fit: cover')
    })
  })

  describe('GET /api/v1/postcards', () => {
    it('lists the key owner postcards', async () => {
      const req = new Request('http://localhost/api/v1/postcards', {
        headers: { 'x-api-key': 'fam_test_agent_key' },
      })
      const res = await handleRequest(req)
      const data = await res.json() as { data: Array<Record<string, unknown>> }
      expect(res.status).toBe(200)
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.data.length).toBeGreaterThan(0)
      expect(data.data[0]).toHaveProperty('recipientName')
    })

    it('returns 401 without a key', async () => {
      const res = await handleRequest(new Request('http://localhost/api/v1/postcards'))
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/v1/postcards/:id', () => {
    it('returns one postcard for the key owner', async () => {
      const created = db.listPostcardsByUser(agentUser.id)[0]
      const req = new Request(`http://localhost/api/v1/postcards/${created.id}`, {
        headers: { 'x-api-key': 'fam_test_agent_key' },
      })
      const res = await handleRequest(req)
      const data = await res.json() as { data: Record<string, unknown> }
      expect(res.status).toBe(200)
      expect(data.data.id).toBe(created.id)
    })

    it('returns 404 for another user postcard', async () => {
      const req = new Request('http://localhost/api/v1/postcards/no-such-id', {
        headers: { 'x-api-key': 'fam_test_agent_key' },
      })
      const res = await handleRequest(req)
      expect(res.status).toBe(404)
    })
  })

  describe('unknown /api/v1 routes', () => {
    it('returns 404 JSON for unimplemented v1 paths', async () => {
      const req = new Request('http://localhost/api/v1/unknown', {
        headers: { 'x-api-key': 'fam_test_agent_key' },
      })
      const res = await handleRequest(req)
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/postgrid/mode admin check', () => {
    it('fails closed when ADMIN_EMAILS is not configured', async () => {
      const admin = db.getUserByEmail('admin@example.com') ?? undefined as unknown as User
      if (!admin || !admin.id) {
        // create if missing
        const created = {
          id: crypto.randomUUID(),
          oidcSub: 'oidc-admin',
          oidcIssuer: 'https://accounts.example.com',
          email: 'admin@example.com',
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } satisfies User
        db.insertUser(created)
      }
      const currentAdmin = db.getUserByEmail('admin@example.com')!
      const token = await jwtService.generateAccessToken(currentAdmin)

      const original = config.adminEmails
      config.adminEmails = []
      try {
        const req = new Request('http://localhost/api/postgrid/mode', {
          method: 'POST',
          headers: { authorization: `Bearer ${token}` },
          body: JSON.stringify({ mode: 'test' }),
        })
        const res = await handleRequest(req)
        const data = await res.json() as { error?: string }
        expect(res.status).toBe(403)
        expect(data.error).toContain('ADMIN_EMAILS')
      } finally {
        config.adminEmails = original
      }
    })

    it('allows a configured admin to toggle mode', async () => {
      const admin = db.getUserByEmail('admin@example.com')!
      const token = await jwtService.generateAccessToken(admin)
      const req = new Request('http://localhost/api/postgrid/mode', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ mode: 'test' }),
      })
      const res = await handleRequest(req)
      expect(res.status).toBe(200)
    })

    it('rejects non-admin users', async () => {
      const token = await jwtService.generateAccessToken(agentUser)
      const req = new Request('http://localhost/api/postgrid/mode', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ mode: 'live' }),
      })
      const res = await handleRequest(req)
      expect(res.status).toBe(403)
    })
  })
describe('GET /api/postcards (JWT web route for history page)', () => {
  it('lists the authenticated user postcards', async () => {
    const admin = db.getUserByEmail('admin@example.com')!
    const token = await jwtService.generateAccessToken(admin)
    const res = await handleRequest(new Request('http://localhost:8484/api/postcards', {
      headers: { authorization: `Bearer ${token}` },
    }))
    expect(res.status).toBe(200)
    const data = await res.json() as { data: unknown[] }
    expect(Array.isArray(data.data)).toBe(true)
  })

  it('returns 401 without a token', async () => {
    const res = await handleRequest(new Request('http://localhost:8484/api/postcards'))
    expect(res.status).toBe(401)
  })
})

})
