import { describe, it, expect, beforeAll } from 'bun:test'

describe('Backend Server', () => {
    beforeAll(() => {
        // Set up required environment variables for service initialization
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
    })

    // Import after environment setup
    let handleRequest: (req: Request) => Promise<Response>

    beforeAll(async () => {
        const module = await import('./server')
        handleRequest = module.handleRequest
    })

    describe('OPTIONS requests', () => {
        it('should handle CORS preflight requests', async () => {
            const req = new Request('http://localhost:3001/api/health', {
                method: 'OPTIONS',
            })
            const res = await handleRequest(req)

            expect(res.status).toBe(204)
            expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
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

            expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
            expect(res.headers.get('Content-Type')).toBe('application/json')
        })
    })

    describe('GET /api/test', () => {
        it('should return test connection message', async () => {
            const req = new Request('http://localhost:3001/api/test')
            const res = await handleRequest(req)
            const data = (await res.json()) as { connected: boolean; message: string }

            expect(res.status).toBe(200)
            expect(data.connected).toBe(true)
            expect(data.message).toBe('Hello from Fam Mail backend!')
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
