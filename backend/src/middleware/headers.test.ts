import { describe, it, expect } from 'bun:test'

// Mock config before importing the module under test
import { mock } from 'bun:test'

const mockGetConfig = mock(() => ({
  server: { allowedOrigins: ['http://localhost:5173', 'https://example.com'] },
}))

mock.module('../config', () => ({ getConfig: mockGetConfig }))

const { jsonResponse, createCorsResponse, applyHeaders, getCorsHeaders, SECURITY_HEADERS } =
  await import('./headers')

// ---------------------------------------------------------------------------
// Security header definitions
// ---------------------------------------------------------------------------

describe('SECURITY_HEADERS', () => {
  it('defines all required security headers', () => {
    const required = [
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Referrer-Policy',
      'Strict-Transport-Security',
      'Permissions-Policy',
    ]
    for (const header of required) {
      expect(SECURITY_HEADERS[header]).toBeDefined()
    }
  })

  it('sets X-Content-Type-Options to nosniff', () => {
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff')
  })

  it('sets X-Frame-Options to DENY', () => {
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY')
  })

  it('sets Strict-Transport-Security with includeSubDomains', () => {
    expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain('includeSubDomains')
  })
})

// ---------------------------------------------------------------------------
// getCorsHeaders
// ---------------------------------------------------------------------------

describe('getCorsHeaders', () => {
  it('echoes allowed origin when request origin matches', () => {
    const req = new Request('http://localhost:5173/test', {
      headers: { origin: 'http://localhost:5173' },
    })
    const headers = getCorsHeaders(req)
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173')
  })

  it('falls back to first allowed origin when request origin is unknown', () => {
    const req = new Request('http://localhost:5173/test', {
      headers: { origin: 'http://evil.com' },
    })
    const headers = getCorsHeaders(req)
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173')
  })

  it('falls back when no origin header is present', () => {
    const req = new Request('http://localhost:5173/test')
    const headers = getCorsHeaders(req)
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173')
  })

  it('includes standard CORS headers', () => {
    const req = new Request('http://localhost:5173/test', {
      headers: { origin: 'http://localhost:5173' },
    })
    const headers = getCorsHeaders(req)
    expect(headers['Access-Control-Allow-Methods']).toContain('GET')
    expect(headers['Access-Control-Allow-Methods']).toContain('POST')
    expect(headers['Access-Control-Allow-Headers']).toContain('Authorization')
    expect(headers['Access-Control-Allow-Credentials']).toBe('true')
    expect(headers['Vary']).toBe('Origin')
  })
})

// ---------------------------------------------------------------------------
// applyHeaders
// ---------------------------------------------------------------------------

describe('applyHeaders', () => {
  it('applies all security headers to a response', () => {
    const res = new Response('ok')
    const result = applyHeaders(res)
    expect(result.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(result.headers.get('X-Frame-Options')).toBe('DENY')
    expect(result.headers.get('Content-Security-Policy')).toContain("default-src 'self'")
    expect(result.headers.get('Strict-Transport-Security')).toContain('max-age=')
  })

  it('applies CORS headers when request is provided', () => {
    const req = new Request('http://localhost:5173/test', {
      headers: { origin: 'http://localhost:5173' },
    })
    const res = new Response('ok')
    applyHeaders(res, req)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
  })

  it('skips CORS headers when no request is provided', () => {
    const res = new Response('ok')
    applyHeaders(res)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// jsonResponse
// ---------------------------------------------------------------------------

describe('jsonResponse', () => {
  it('creates a JSON response with default status 200', () => {
    const res = jsonResponse({ hello: 'world' })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/json')
  })

  it('sets the provided status code', () => {
    const res = jsonResponse({ error: 'bad' }, 400)
    expect(res.status).toBe(400)
  })

  it('includes security headers', () => {
    const res = jsonResponse({ ok: true })
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('X-Frame-Options')).toBe('DENY')
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'")
  })

  it('includes CORS headers when request is provided', () => {
    const req = new Request('http://localhost:5173/test', {
      headers: { origin: 'https://example.com' },
    })
    const res = jsonResponse({ ok: true }, 200, req)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
  })

  it('serializes the body as JSON', async () => {
    const res = jsonResponse({ foo: 'bar', num: 42 })
    const body = (await res.json()) as { foo: string; num: number }
    expect(body.foo).toBe('bar')
    expect(body.num).toBe(42)
  })
})

// ---------------------------------------------------------------------------
// createCorsResponse
// ---------------------------------------------------------------------------

describe('createCorsResponse', () => {
  it('returns 204 No Content', () => {
    const req = new Request('http://localhost:5173/test', {
      headers: { origin: 'http://localhost:5173' },
    })
    const res = createCorsResponse(req)
    expect(res.status).toBe(204)
  })

  it('includes CORS headers', () => {
    const req = new Request('http://localhost:5173/test', {
      headers: { origin: 'http://localhost:5173' },
    })
    const res = createCorsResponse(req)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })

  it('includes security headers', () => {
    const req = new Request('http://localhost:5173/test', {
      headers: { origin: 'http://localhost:5173' },
    })
    const res = createCorsResponse(req)
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('X-Frame-Options')).toBe('DENY')
  })
})

// ---------------------------------------------------------------------------
// Consistency check — same headers as server-level responses
// ---------------------------------------------------------------------------

describe('header consistency across response types', () => {
  const requiredSecurityHeaders = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
    'Referrer-Policy',
    'Content-Security-Policy',
    'Strict-Transport-Security',
    'Permissions-Policy',
  ]

  it('jsonResponse includes all required security headers', () => {
    const res = jsonResponse({ ok: true })
    for (const header of requiredSecurityHeaders) {
      expect(res.headers.get(header)).toBeDefined()
    }
  })

  it('createCorsResponse includes all required security headers', () => {
    const req = new Request('http://localhost:5173/test', {
      headers: { origin: 'http://localhost:5173' },
    })
    const res = createCorsResponse(req)
    for (const header of requiredSecurityHeaders) {
      expect(res.headers.get(header)).toBeDefined()
    }
  })
})
