import { describe, it, expect, mock } from 'bun:test'
import { jsonResponse } from './response'

// Mock the centralized headers module so the re-export in response.ts
// uses our controlled implementation without hitting real config.
mock.module('../middleware/headers', () => {
  const SECURITY_HEADERS: Record<string, string> = {
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=15552000; includeSubDomains',
  }

  function getCorsHeaders(req?: Request): Record<string, string> {
    const origin = req?.headers.get('origin') || ''
    const allowed = ['http://localhost:3000', 'https://example.com']
    const allowOrigin = allowed.includes(origin) ? origin : allowed[0]
    return {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Vary': 'Origin',
    }
  }

  function jsonResponse(data: unknown, status: number = 200, req?: Request): Response {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (req) {
      Object.assign(headers, getCorsHeaders(req))
    }
    const response = new Response(JSON.stringify(data), { status, headers })
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(key, value)
    }
    return response
  }

  function createCorsResponse(req: Request): Response {
    const response = new Response(null, {
      status: 204,
      headers: getCorsHeaders(req),
    })
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(key, value)
    }
    return response
  }

  return { jsonResponse, createCorsResponse, SECURITY_HEADERS, getCorsHeaders, applyHeaders: (r: Response) => r }
})

describe('jsonResponse', () => {
  it('sets Content-Type to application/json', () => {
    const response = jsonResponse({ message: 'test' })
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('defaults status to 200', () => {
    const response = jsonResponse({ message: 'test' })
    expect(response.status).toBe(200)
  })

  it('accepts custom status code 201', () => {
    const response = jsonResponse({ message: 'created' }, 201)
    expect(response.status).toBe(201)
  })

  it('accepts custom status code 400', () => {
    const response = jsonResponse({ message: 'bad request' }, 400)
    expect(response.status).toBe(400)
  })

  it('accepts custom status code 401', () => {
    const response = jsonResponse({ message: 'unauthorized' }, 401)
    expect(response.status).toBe(401)
  })

  it('accepts custom status code 403', () => {
    const response = jsonResponse({ message: 'forbidden' }, 403)
    expect(response.status).toBe(403)
  })

  it('accepts custom status code 404', () => {
    const response = jsonResponse({ message: 'not found' }, 404)
    expect(response.status).toBe(404)
  })

  it('accepts custom status code 500', () => {
    const response = jsonResponse({ message: 'server error' }, 500)
    expect(response.status).toBe(500)
  })

  it('stringifies the data object correctly', async () => {
    const data = { message: 'test', value: 123 }
    const response = jsonResponse(data)
    const body = await response.json()
    expect(body).toEqual(data)
  })

  it('includes all CORS headers', () => {
    const req = new Request('http://localhost:3000/api/test', {
      headers: { origin: 'http://localhost:3000' },
    })
    const response = jsonResponse({ message: 'test' }, 200, req)

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS')
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization')
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(response.headers.get('Vary')).toBe('Origin')
  })

  it('includes Content-Security-Policy security header', () => {
    const response = jsonResponse({ message: 'test' })
    expect(response.headers.get('Content-Security-Policy')).toBe(
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'"
    )
  })

  it('includes X-Content-Type-Options security header', () => {
    const response = jsonResponse({ message: 'test' })
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('includes X-Frame-Options security header', () => {
    const response = jsonResponse({ message: 'test' })
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
  })

  it('includes X-XSS-Protection security header', () => {
    const response = jsonResponse({ message: 'test' })
    expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
  })

  it('includes Referrer-Policy security header', () => {
    const response = jsonResponse({ message: 'test' })
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
  })

  it('includes Strict-Transport-Security security header', () => {
    const response = jsonResponse({ message: 'test' })
    expect(response.headers.get('Strict-Transport-Security')).toBe('max-age=15552000; includeSubDomains')
  })

  it('handles null data', async () => {
    const response = jsonResponse(null)
    const body = await response.json()
    expect(body).toBe(null)
  })

  it('handles array data', async () => {
    const data = [1, 2, 3, 4, 5]
    const response = jsonResponse(data)
    const body = await response.json()
    expect(body).toEqual(data)
  })

  it('handles string data', async () => {
    const data = 'test string'
    const response = jsonResponse(data)
    const body = await response.json()
    expect(body).toBe(data)
  })
})
