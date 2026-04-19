import { describe, it, expect, beforeAll } from 'bun:test'
import { JWTService } from './services/jwtService'
import type { User } from './models/user'

describe('Backend Server', () => {
    // Import after environment setup
    let handleRequest: (req: Request) => Promise<Response>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let db: any
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
        process.env.IMAP_HOST = 'imap.example.com'
        process.env.IMAP_PORT = '993'
        process.env.IMAP_USER = 'test@example.com'
        process.env.IMAP_PASSWORD = 'password'
        process.env.SUBJECT_FILTER = 'Fammail Postcard'
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
        it('should return health check status', async () => {
            const req = new Request('http://localhost:3001/api/health')
            const res = await handleRequest(req)
            const data = (await res.json()) as {
                status: string
                message: string
                timestamp: string
                version: string
                services: {
                    imap: string
                    postgrid: string
                    database: string
                    notifications: string
                }
            }

            expect(res.status).toBe(200)
            expect(data.status).toBe('healthy')
            expect(data.message).toBe('Fam Mail backend is running')
            expect(data.timestamp).toBeDefined()
            expect(data.version).toBe('1.0.0')
            expect(data.services).toBeDefined()
            expect(data.services.imap).toBe('connected')
            expect(data.services.database).toBe('connected')
            expect(data.services.notifications).toBe('ready')
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
})
