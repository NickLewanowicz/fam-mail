import { describe, it, expect } from 'bun:test'
import { handleRequest } from './server'

describe('Backend Server', () => {
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
            const data = (await res.json()) as { status: string; message: string; timestamp: string; testMode: boolean }

            expect(res.status).toBe(200)
            expect(data.status).toBe('ok')
            expect(data.message).toBe('Fam Mail backend is running')
            expect(data.timestamp).toBeDefined()
            expect(data.testMode).toBeDefined()
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
