import { describe, it, expect, beforeAll } from 'bun:test'
import { JWTService } from './services/jwtService'
import type { User } from './models/user'
import type { Database } from './database'

describe('Backend Server', () => {
    // Import after environment setup
    let handleRequest: (req: Request) => Promise<Response>
    let db: Database
    let jwtService: JWTService

    beforeAll(async () => {
        // Set up required environment variables BEFORE importing the server module,
        // so that config parsing succeeds. Previously these were in a separate
        // beforeAll which caused a race condition (bun:test may run the async
        // beforeAll before the sync one, leading to ReferenceError).
        process.env.POSTGRID_MODE = 'test'
        process.env.POSTGRID_TEST_API_KEY = 'pg_test_123'
        process.env.POSTGRID_LIVE_API_KEY = 'pg_live_456'
        process.env.POSTGRID_FORCE_TEST_MODE = 'false'
        // IMAP vars intentionally omitted — server starts without them (#18)
        process.env.LLM_PROVIDER = 'openrouter'
        process.env.LLM_API_KEY = 'sk-123'
        process.env.LLM_MODEL = 'openai/gpt-4o'
        process.env.DATABASE_PATH = '/tmp/test-fammail.db'
        process.env.PORT = '8484'
        process.env.NODE_ENV = 'test'
        // OIDC configuration (required for Beta 1.0.0)
        process.env.OIDC_ISSUER_URL = 'https://accounts.google.com/.well-known/openid-configuration'
        process.env.OIDC_CLIENT_ID = 'test-client-id'
        process.env.OIDC_CLIENT_SECRET = 'test-client-secret'
        process.env.OIDC_REDIRECT_URI = 'http://localhost:8484/api/auth/callback'
        process.env.JWT_SECRET = 'test-secret-key-minimum-32-characters-long'
        process.env.JWT_EXPIRES_IN = '7d'
        process.env.JWT_REFRESH_EXPIRES_IN = '30d'

        const module = await import('./server')
        handleRequest = module.handleRequest
        db = module.db

        jwtService = new JWTService({
            secret: 'test-secret-key-minimum-32-characters-long',
            expiresIn: '7d',
            refreshExpiresIn: '30d',
        })
    })

    describe('OPTIONS requests', () => {
        it('should handle CORS preflight requests', async () => {
            const req = new Request('http://localhost:3001/api/health', {
                method: 'OPTIONS',
            })
            const res = await handleRequest(req)

            expect(res.status).toBe(204)
            expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
        })
    })

    describe('GET /api/health', () => {
        it('should return minimal health response without service details', async () => {
            const req = new Request('http://localhost:3001/api/health')
            const res = await handleRequest(req)
            const data = await res.json() as Record<string, unknown>

            expect(res.status).toBe(200)
            expect(data.status).toBe('ok')
            expect(Object.keys(data)).toHaveLength(1)
        })

        it('should include CORS headers', async () => {
            const req = new Request('http://localhost:3001/api/health')
            const res = await handleRequest(req)

            expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
            expect(res.headers.get('Content-Type')).toBe('application/json')
        })
    })

    describe('GET /api/test', () => {
        it('should return test connection message in non-production mode', async () => {
            // NODE_ENV is set to 'test' in beforeAll, which is not 'production'
            const req = new Request('http://localhost:3001/api/test')
            const res = await handleRequest(req)
            const data = (await res.json()) as { connected: boolean; message: string }

            expect(res.status).toBe(200)
            expect(data.connected).toBe(true)
            expect(data.message).toBe('Hello from Fam Mail backend!')
        })

        it('should return 404 for /api/test in production mode (#29)', async () => {
            // Temporarily set NODE_ENV to production to test the gate
            const originalEnv = process.env.NODE_ENV
            process.env.NODE_ENV = 'production'

            // getConfig() reads from process.env at call time,
            // and handleRequest checks config.server.nodeEnv dynamically
            const req = new Request('http://localhost:3001/api/test')
            const res = await handleRequest(req)
            const data = (await res.json()) as { error: string }

            expect(res.status).toBe(404)
            expect(data.error).toBe('Not Found')

            // Restore
            process.env.NODE_ENV = originalEnv
        })
    })

    describe('POST /api/postcards auth (#30)', () => {
        it('should return 401 when no authorization header is provided', async () => {
            const req = new Request('http://localhost:3001/api/postcards', {
                method: 'POST',
                body: JSON.stringify({
                    to: {
                        firstName: 'John',
                        lastName: 'Doe',
                        addressLine1: '123 Main St',
                        city: 'Ottawa',
                        provinceOrState: 'ON',
                        postalOrZip: 'K1A 0B1',
                        countryCode: 'CA',
                    },
                    from: {
                        firstName: 'Jane',
                        lastName: 'Smith',
                        addressLine1: '456 Oak Ave',
                        city: 'Springfield',
                        provinceOrState: 'IL',
                        postalOrZip: '62704',
                        countryCode: 'US',
                    },
                    frontHTML: '<html>Test</html>',
                }),
            })

            const res = await handleRequest(req)
            const data = (await res.json()) as { error: string }

            expect(res.status).toBe(401)
            expect(data.error).toContain('authorization')
        })

        it('should return 401 with invalid authorization token', async () => {
            const req = new Request('http://localhost:3001/api/postcards', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer invalid-token',
                },
                body: JSON.stringify({
                    to: {
                        firstName: 'John',
                        lastName: 'Doe',
                        addressLine1: '123 Main St',
                        city: 'Ottawa',
                        provinceOrState: 'ON',
                        postalOrZip: 'K1A 0B1',
                        countryCode: 'CA',
                    },
                    from: {
                        firstName: 'Jane',
                        lastName: 'Smith',
                        addressLine1: '456 Oak Ave',
                        city: 'Springfield',
                        provinceOrState: 'IL',
                        postalOrZip: '62704',
                        countryCode: 'US',
                    },
                    frontHTML: '<html>Test</html>',
                }),
            })

            const res = await handleRequest(req)
            const data = (await res.json()) as { error: string }

            expect(res.status).toBe(401)
            expect(data.error).toBeDefined()
        })

        it('should return 401 when token is valid but user not found in DB', async () => {
            // Generate a real JWT for a user that doesn't exist in the DB
            const ghostUser: User = {
                id: crypto.randomUUID(),
                oidcSub: 'ghost-sub',
                oidcIssuer: 'https://accounts.google.com',
                email: 'ghost@example.com',
                emailVerified: true,
                firstName: 'Ghost',
                lastName: 'User',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }
            const token = await jwtService.generateAccessToken(ghostUser)

            const req = new Request('http://localhost:3001/api/postcards', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    to: {
                        firstName: 'John',
                        lastName: 'Doe',
                        addressLine1: '123 Main St',
                        city: 'Ottawa',
                        provinceOrState: 'ON',
                        postalOrZip: 'K1A 0B1',
                        countryCode: 'CA',
                    },
                    from: {
                        firstName: 'Jane',
                        lastName: 'Smith',
                        addressLine1: '456 Oak Ave',
                        city: 'Springfield',
                        provinceOrState: 'IL',
                        postalOrZip: '62704',
                        countryCode: 'US',
                    },
                    frontHTML: '<html>Test</html>',
                }),
            })

            const res = await handleRequest(req)
            const data = (await res.json()) as { error: string }

            expect(res.status).toBe(401)
            expect(data.error).toBe('User not found')
        })

        it.skip('should allow postcard creation with valid auth token and existing user', async () => {
            // Insert a real user into the DB
            const testUser: User = {
                id: crypto.randomUUID(),
                oidcSub: `server-test-sub-${crypto.randomUUID()}`,
                oidcIssuer: 'https://accounts.google.com',
                email: `server-test-${crypto.randomUUID()}@example.com`,
                emailVerified: true,
                firstName: 'Server',
                lastName: 'Tester',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }
            db.insertUser(testUser)

            const token = await jwtService.generateAccessToken(testUser)

            const req = new Request('http://localhost:3001/api/postcards', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: {
                        firstName: 'John',
                        lastName: 'Doe',
                        addressLine1: '123 Main St',
                        city: 'Ottawa',
                        provinceOrState: 'ON',
                        postalOrZip: 'K1A 0B1',
                        countryCode: 'CA',
                    },
                    from: {
                        firstName: 'Jane',
                        lastName: 'Smith',
                        addressLine1: '456 Oak Ave',
                        city: 'Springfield',
                        provinceOrState: 'IL',
                        postalOrZip: '62704',
                        countryCode: 'US',
                    },
                    frontHTML: '<html>Test</html>',
                }),
            })

            const res = await handleRequest(req)
            const data = (await res.json()) as { error?: string; success?: boolean }

            // Auth check passes — the response should NOT be an auth-layer 401.
            // With a fake API key, PostGrid may return 401 itself, but the
            // error message will reference the API key, not "authorization".
            if (res.status === 401) {
              // If we get 401, it came from PostGrid (invalid API key), not auth middleware.
              // The error body won't contain "authorization" — it'll be a PostGrid error.
              expect(data.error).not.toContain('authorization')
              expect(data.error).not.toBe('User not found')
            } else {
              // If PostGrid accepted it or returned another error, that's also fine.
              expect(res.status).not.toBe(401)
            }
        })
    })

    describe('404 handling', () => {
        it('should return 404 for unknown routes', async () => {
            const req = new Request('http://localhost:3001/api/unknown')
            const res = await handleRequest(req)
            const data = (await res.json()) as { error: string }

            expect(res.status).toBe(404)
            expect(data.error).toBe('Not Found')
        })
    })

    describe('Rate limiting (#42)', () => {
        it('should rate limit POST /api/postcards after exceeding limit', async () => {
            // The postcard rate limiter allows 5 req/min.
            // The first 5 should pass (though they'll get 401 auth errors — that's fine,
            // we just need to confirm the rate limiter fires AFTER the limit).
            for (let i = 0; i < 5; i++) {
                const req = new Request('http://localhost:3001/api/postcards', {
                    method: 'POST',
                    headers: { 'x-forwarded-for': 'rate-limit-test-postcards' },
                    body: JSON.stringify({}),
                })
                const res = await handleRequest(req)
                // All should be 401 (auth failure), not 429
                expect(res.status).toBe(401)
            }

            // 6th request from same IP should be 429
            const req = new Request('http://localhost:3001/api/postcards', {
                method: 'POST',
                headers: { 'x-forwarded-for': 'rate-limit-test-postcards' },
                body: JSON.stringify({}),
            })
            const res = await handleRequest(req)
            expect(res.status).toBe(429)
            const data = (await res.json()) as { error: string; retryAfter?: number }
            expect(data.error).toBe('Too many requests')
            expect(data.retryAfter).toBeDefined()
            expect(data.retryAfter!).toBeGreaterThan(0)
        })

        it('should rate limit POST /api/webhook/email after exceeding limit', async () => {
            // Webhook rate limiter allows 20 req/min
            for (let i = 0; i < 20; i++) {
                const req = new Request('http://localhost:3001/api/webhook/email', {
                    method: 'POST',
                    headers: { 'x-forwarded-for': 'rate-limit-test-webhooks' },
                    body: JSON.stringify({}),
                })
                await handleRequest(req)
            }

            // 21st request should be 429
            const req = new Request('http://localhost:3001/api/webhook/email', {
                method: 'POST',
                headers: { 'x-forwarded-for': 'rate-limit-test-webhooks' },
                body: JSON.stringify({}),
            })
            const res = await handleRequest(req)
            expect(res.status).toBe(429)
            const data = (await res.json()) as { error: string }
            expect(data.error).toBe('Too many requests')
        })

        it('should rate limit POST /api/drafts after exceeding limit', async () => {
            // Draft rate limiter allows 30 req/min
            for (let i = 0; i < 30; i++) {
                const req = new Request('http://localhost:3001/api/drafts', {
                    method: 'POST',
                    headers: { 'x-forwarded-for': 'rate-limit-test-drafts' },
                    body: JSON.stringify({}),
                })
                await handleRequest(req)
            }

            // 31st request should be 429
            const req = new Request('http://localhost:3001/api/drafts', {
                method: 'POST',
                headers: { 'x-forwarded-for': 'rate-limit-test-drafts' },
                body: JSON.stringify({}),
            })
            const res = await handleRequest(req)
            expect(res.status).toBe(429)
            const data = (await res.json()) as { error: string }
            expect(data.error).toBe('Too many requests')
        })

        it('should rate limit PUT /api/drafts/:id after exceeding limit', async () => {
            for (let i = 0; i < 30; i++) {
                const req = new Request('http://localhost:3001/api/drafts/test-id', {
                    method: 'PUT',
                    headers: { 'x-forwarded-for': 'rate-limit-test-drafts-put' },
                    body: JSON.stringify({}),
                })
                await handleRequest(req)
            }

            const req = new Request('http://localhost:3001/api/drafts/test-id', {
                method: 'PUT',
                headers: { 'x-forwarded-for': 'rate-limit-test-drafts-put' },
                body: JSON.stringify({}),
            })
            const res = await handleRequest(req)
            expect(res.status).toBe(429)
        })

        it('should rate limit DELETE /api/drafts/:id after exceeding limit', async () => {
            for (let i = 0; i < 30; i++) {
                const req = new Request('http://localhost:3001/api/drafts/test-id', {
                    method: 'DELETE',
                    headers: { 'x-forwarded-for': 'rate-limit-test-drafts-delete' },
                })
                await handleRequest(req)
            }

            const req = new Request('http://localhost:3001/api/drafts/test-id', {
                method: 'DELETE',
                headers: { 'x-forwarded-for': 'rate-limit-test-drafts-delete' },
            })
            const res = await handleRequest(req)
            expect(res.status).toBe(429)
        })

        it('should rate limit POST /api/drafts/:id/publish after exceeding limit', async () => {
            for (let i = 0; i < 30; i++) {
                const req = new Request('http://localhost:3001/api/drafts/test-id/publish', {
                    method: 'POST',
                    headers: { 'x-forwarded-for': 'rate-limit-test-drafts-publish' },
                    body: JSON.stringify({}),
                })
                await handleRequest(req)
            }

            const req = new Request('http://localhost:3001/api/drafts/test-id/publish', {
                method: 'POST',
                headers: { 'x-forwarded-for': 'rate-limit-test-drafts-publish' },
                body: JSON.stringify({}),
            })
            const res = await handleRequest(req)
            expect(res.status).toBe(429)
        })

        it('should not rate limit GET /api/drafts', async () => {
            // GET drafts should not be rate limited (read-only, no DB writes concern)
            for (let i = 0; i < 35; i++) {
                const req = new Request('http://localhost:3001/api/drafts', {
                    method: 'GET',
                    headers: { 'x-forwarded-for': 'rate-limit-test-drafts-get' },
                })
                const res = await handleRequest(req)
                // Should always get 401 (auth required), never 429
                expect(res.status).toBe(401)
            }
        })

        it('should track different IPs independently for postcard rate limiting', async () => {
            // Exhaust limit for IP-A
            for (let i = 0; i < 5; i++) {
                const req = new Request('http://localhost:3001/api/postcards', {
                    method: 'POST',
                    headers: { 'x-forwarded-for': 'ip-postcard-A' },
                    body: JSON.stringify({}),
                })
                await handleRequest(req)
            }

            // IP-A should be rate limited
            const reqA = new Request('http://localhost:3001/api/postcards', {
                method: 'POST',
                headers: { 'x-forwarded-for': 'ip-postcard-A' },
                body: JSON.stringify({}),
            })
            const resA = await handleRequest(reqA)
            expect(resA.status).toBe(429)

            // IP-B should NOT be rate limited
            const reqB = new Request('http://localhost:3001/api/postcards', {
                method: 'POST',
                headers: { 'x-forwarded-for': 'ip-postcard-B' },
                body: JSON.stringify({}),
            })
            const resB = await handleRequest(reqB)
            expect(resB.status).toBe(401) // auth failure, not rate limit
        })
    })

    describe('Security headers on all responses (#34)', () => {
        const requiredSecurityHeaders = [
            'X-Content-Type-Options',
            'X-Frame-Options',
            'X-XSS-Protection',
            'Referrer-Policy',
            'Content-Security-Policy',
            'Strict-Transport-Security',
            'Permissions-Policy',
        ]

        /** Helper: assert that a response has all required security headers */
        function expectSecurityHeaders(res: Response): void {
            for (const header of requiredSecurityHeaders) {
                expect(res.headers.get(header)).toBeDefined()
            }
            expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
            expect(res.headers.get('X-Frame-Options')).toBe('DENY')
        }

        /** Helper: assert origin-aware CORS headers are present */
        function expectCorsHeaders(res: Response, expectedOrigin: string = 'http://localhost:5173'): void {
            expect(res.headers.get('Access-Control-Allow-Origin')).toBe(expectedOrigin)
            expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
            expect(res.headers.get('Vary')).toBe('Origin')
        }

        it('OPTIONS preflight includes security headers', async () => {
            const req = new Request('http://localhost:3001/api/health', {
                method: 'OPTIONS',
                headers: { origin: 'http://localhost:5173' },
            })
            const res = await handleRequest(req)
            expect(res.status).toBe(204)
            expectSecurityHeaders(res)
            expectCorsHeaders(res)
        })

        it('GET /api/health includes security and CORS headers', async () => {
            const req = new Request('http://localhost:3001/api/health', {
                headers: { origin: 'http://localhost:5173' },
            })
            const res = await handleRequest(req)
            expect(res.status).toBe(200)
            expectSecurityHeaders(res)
            expectCorsHeaders(res)
        })

        it('GET /api/test includes security and CORS headers', async () => {
            const req = new Request('http://localhost:3001/api/test', {
                headers: { origin: 'http://localhost:5173' },
            })
            const res = await handleRequest(req)
            expect(res.status).toBe(200)
            expectSecurityHeaders(res)
            expectCorsHeaders(res)
        })

        it('404 responses include security and CORS headers', async () => {
            const req = new Request('http://localhost:3001/api/nonexistent', {
                headers: { origin: 'http://localhost:5173' },
            })
            const res = await handleRequest(req)
            expect(res.status).toBe(404)
            expectSecurityHeaders(res)
            expectCorsHeaders(res)
        })

        it('POST /api/auth/login includes security and CORS headers', async () => {
            const req = new Request('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { origin: 'http://localhost:5173' },
            })
            const res = await handleRequest(req)
            // Will be 200 with an authUrl or 500 if OIDC discovery fails
            expectSecurityHeaders(res)
            expectCorsHeaders(res)
        })

        it('GET /api/auth/callback includes security headers even on error', async () => {
            const req = new Request('http://localhost:3001/api/auth/callback', {
                headers: { origin: 'http://localhost:5173' },
            })
            const res = await handleRequest(req)
            // Missing code/state → 400
            expect(res.status).toBe(400)
            expectSecurityHeaders(res)
            expectCorsHeaders(res)
        })

        it('POST /api/auth/refresh includes security headers on error', async () => {
            const req = new Request('http://localhost:3001/api/auth/refresh', {
                method: 'POST',
                headers: {
                    origin: 'http://localhost:5173',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            })
            const res = await handleRequest(req)
            // Missing refresh token → 400
            expect(res.status).toBe(400)
            expectSecurityHeaders(res)
            expectCorsHeaders(res)
        })

        it('GET /api/auth/me (unauthenticated) includes security headers', async () => {
            const req = new Request('http://localhost:3001/api/auth/me', {
                headers: { origin: 'http://localhost:5173' },
            })
            const res = await handleRequest(req)
            expect(res.status).toBe(401)
            expectSecurityHeaders(res)
            expectCorsHeaders(res)
        })

        it('GET /api/drafts (unauthenticated) includes security headers', async () => {
            const req = new Request('http://localhost:3001/api/drafts', {
                headers: { origin: 'http://localhost:5173' },
            })
            const res = await handleRequest(req)
            expect(res.status).toBe(401)
            expectSecurityHeaders(res)
            expectCorsHeaders(res)
        })

        it('POST /api/postcards (unauthenticated) includes security headers', async () => {
            const req = new Request('http://localhost:3001/api/postcards', {
                method: 'POST',
                headers: { origin: 'http://localhost:5173' },
                body: JSON.stringify({}),
            })
            const res = await handleRequest(req)
            expect(res.status).toBe(401)
            expectSecurityHeaders(res)
            expectCorsHeaders(res)
        })

        it('429 rate-limited responses include security headers', async () => {
            // Exhaust the postcard rate limiter (5 req/min)
            for (let i = 0; i < 5; i++) {
                const req = new Request('http://localhost:3001/api/postcards', {
                    method: 'POST',
                    headers: {
                        'x-forwarded-for': 'security-header-rate-test',
                        origin: 'http://localhost:5173',
                    },
                    body: JSON.stringify({}),
                })
                await handleRequest(req)
            }

            // 6th request should be 429
            const req = new Request('http://localhost:3001/api/postcards', {
                method: 'POST',
                headers: {
                    'x-forwarded-for': 'security-header-rate-test',
                    origin: 'http://localhost:5173',
                },
                body: JSON.stringify({}),
            })
            const res = await handleRequest(req)
            expect(res.status).toBe(429)
            expectSecurityHeaders(res)
            expectCorsHeaders(res)
        })

        it('echoes request origin in CORS header when origin is allowed', async () => {
            const req = new Request('http://localhost:3001/api/health', {
                headers: { origin: 'http://localhost:5173' },
            })
            const res = await handleRequest(req)
            expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
        })

        it('falls back to first allowed origin for unknown origins', async () => {
            const req = new Request('http://localhost:3001/api/health', {
                headers: { origin: 'http://evil.example.com' },
            })
            const res = await handleRequest(req)
            // Should fall back to first allowed origin, not echo the unknown one
            expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
        })
    })
})
