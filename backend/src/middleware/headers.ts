/**
 * Centralized security headers and CORS configuration.
 *
 * This module is the SINGLE source of truth for:
 * - Security HTTP headers (CSP, XSS protection, HSTS, etc.)
 * - CORS policy (allowed origins, methods, headers)
 * - JSON response creation with all headers applied
 *
 * All routes must use `jsonResponse()` or `applyHeaders()` from this module
 * instead of setting headers individually. This prevents inconsistencies
 * where a new route might miss security headers entirely.
 *
 * @see GitHub issue #34
 */

import { getConfig } from '../config'

// ---------------------------------------------------------------------------
// Security headers — applied to every response
// ---------------------------------------------------------------------------

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'",
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'DNS-Prefetch-Control': 'off',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  'Strict-Transport-Security': 'max-age=15552000; includeSubDomains',
}

// ---------------------------------------------------------------------------
// CORS — origin-aware
// ---------------------------------------------------------------------------

/**
 * Build CORS response headers for the given request.
 * If the request's `Origin` header matches an allowed origin it is echoed
 * back (supporting credentialed requests); otherwise the first allowed
 * origin is used as a fallback.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || ''
  const allowed = getConfig().server.allowedOrigins
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || ''
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  }
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/**
 * Apply security + CORS headers to an existing Response.
 *
 * This is the low-level primitive used when a route handler already has a
 * Response object and wants to enrich it with the standard headers.
 * Prefer `jsonResponse()` when creating new responses.
 */
export function applyHeaders(response: Response, req?: Request): Response {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }
  if (req) {
    for (const [key, value] of Object.entries(getCorsHeaders(req))) {
      response.headers.set(key, value)
    }
  }
  return response
}

/**
 * Create a JSON Response with security and CORS headers pre-applied.
 *
 * This replaces the per-route `createJsonResponse` helpers that were
 * previously duplicated across `server.ts`, `routes/postcards.ts`,
 * `routes/webhook.ts`, and `utils/response.ts`.
 *
 * @param data   - Body (will be JSON.stringify'd)
 * @param status - HTTP status code (default 200)
 * @param req    - Optional Request used to compute origin-aware CORS headers
 */
export function jsonResponse(data: unknown, status: number = 200, req?: Request): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const corsHeaders = req
    ? getCorsHeaders(req)
    : getDefaultCorsHeaders()
  Object.assign(headers, corsHeaders)

  const response = new Response(JSON.stringify(data), { status, headers })
  return applyHeaders(response, req)
}

function getDefaultCorsHeaders(): Record<string, string> {
  const allowed = getConfig().server.allowedOrigins
  return {
    'Access-Control-Allow-Origin': allowed[0] || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  }
}

/**
 * Create a CORS preflight (OPTIONS) response.
 */
export function createCorsResponse(req: Request): Response {
  const response = new Response(null, {
    status: 204,
    headers: getCorsHeaders(req),
  })
  return applyHeaders(response, req)
}
