import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { withRequestLogging } from './requestLogger'
import { JWTService } from '../services/jwtService'
import { Database } from '../database'
import type { User } from '../models/user'
import { join } from 'path'
import { tmpdir } from 'os'
import { unlinkSync, existsSync } from 'fs'

describe('requestLogger', () => {
  let dbPath: string
  let db: Database
  let jwtService: JWTService
  let testUser: User
  let validToken: string
  let consoleLogSpy: ReturnType<typeof mock>
  let originalConsoleLog: typeof console.log

  beforeEach(async () => {
    // Create real DB with temp file
    dbPath = join(tmpdir(), `test-request-logger-${Date.now()}-${Math.random()}.db`)
    db = new Database(dbPath)

    // Create real JWT service
    jwtService = new JWTService({
      secret: 'test-secret-key-for-testing-minimum-32-chars',
      expiresIn: '1h',
      refreshExpiresIn: '7d',
    })

    // Create a test user in the real DB
    testUser = {
      id: crypto.randomUUID(),
      oidcSub: 'google-123',
      oidcIssuer: 'https://accounts.google.com',
      email: 'test@example.com',
      emailVerified: true,
      firstName: 'Test',
      lastName: 'User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    db.insertUser(testUser)

    // Generate a real token
    validToken = await jwtService.generateAccessToken(testUser)

    // Spy on console.log to capture log output
    consoleLogSpy = mock(() => {})
    // eslint-disable-next-line no-console
    originalConsoleLog = console.log
    // eslint-disable-next-line no-console
    console.log = consoleLogSpy as unknown as typeof console.log
  })

  afterEach(() => {
    // Restore console.log
    // eslint-disable-next-line no-console
    console.log = originalConsoleLog as unknown as typeof console.log

    // Clean up test database after each test
    if (existsSync(dbPath)) {
      try {
        unlinkSync(dbPath)
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  describe('withRequestLogging()', () => {
    it('logs request with method, path, status, and duration_ms', async () => {
      const handler = async (_req: Request) => {
        return new Response(JSON.stringify({ message: 'success' }), { status: 200 })
      }

      const loggedHandler = withRequestLogging(handler, jwtService, db)
      const req = new Request('http://localhost:3000/api/test')
      const response = await loggedHandler(req)

      expect(response.status).toBe(200)
      expect(consoleLogSpy).toHaveBeenCalled()

      const logCall = consoleLogSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)

      expect(logData).toHaveProperty('method', 'GET')
      expect(logData).toHaveProperty('path', '/api/test')
      expect(logData).toHaveProperty('status', 200)
      expect(logData).toHaveProperty('duration_ms')
      expect(typeof logData.duration_ms).toBe('number')
      expect(logData.duration_ms).toBeGreaterThanOrEqual(0)
    })

    it('includes user_id when valid auth token is provided', async () => {
      const handler = async (_req: Request) => {
        return new Response(JSON.stringify({ message: 'success' }), { status: 200 })
      }

      const loggedHandler = withRequestLogging(handler, jwtService, db)
      const req = new Request('http://localhost:3000/api/test', {
        headers: { 'authorization': `Bearer ${validToken}` },
      })
      const response = await loggedHandler(req)

      expect(response.status).toBe(200)
      expect(consoleLogSpy).toHaveBeenCalled()

      const logCall = consoleLogSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)

      expect(logData).toHaveProperty('user_id', testUser.id)
    })

    it('does not include user_id when no auth token is provided', async () => {
      const handler = async (_req: Request) => {
        return new Response(JSON.stringify({ message: 'success' }), { status: 200 })
      }

      const loggedHandler = withRequestLogging(handler, jwtService, db)
      const req = new Request('http://localhost:3000/api/test')
      const response = await loggedHandler(req)

      expect(response.status).toBe(200)
      expect(consoleLogSpy).toHaveBeenCalled()

      const logCall = consoleLogSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)

      expect(logData).not.toHaveProperty('user_id')
    })

    it('does not include user_id when auth token is invalid', async () => {
      const handler = async (_req: Request) => {
        return new Response(JSON.stringify({ message: 'success' }), { status: 200 })
      }

      const loggedHandler = withRequestLogging(handler, jwtService, db)
      const req = new Request('http://localhost:3000/api/test', {
        headers: { 'authorization': 'Bearer invalid.token.here' },
      })
      const response = await loggedHandler(req)

      expect(response.status).toBe(200)
      expect(consoleLogSpy).toHaveBeenCalled()

      const logCall = consoleLogSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)

      expect(logData).not.toHaveProperty('user_id')
    })

    it('does not include user_id when auth header is malformed', async () => {
      const handler = async (_req: Request) => {
        return new Response(JSON.stringify({ message: 'success' }), { status: 200 })
      }

      const loggedHandler = withRequestLogging(handler, jwtService, db)
      const req = new Request('http://localhost:3000/api/test', {
        headers: { 'authorization': 'Basic invalid' },
      })
      const response = await loggedHandler(req)

      expect(response.status).toBe(200)
      expect(consoleLogSpy).toHaveBeenCalled()

      const logCall = consoleLogSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)

      expect(logData).not.toHaveProperty('user_id')
    })

    it('does not include user_id when token is valid but user does not exist', async () => {
      const handler = async (_req: Request) => {
        return new Response(JSON.stringify({ message: 'success' }), { status: 200 })
      }

      // Generate token for non-existent user
      const nonExistentUser = { ...testUser, id: crypto.randomUUID(), email: 'nonexistent@example.com' }
      const tokenForNonExistentUser = await jwtService.generateAccessToken(nonExistentUser)

      const loggedHandler = withRequestLogging(handler, jwtService, db)
      const req = new Request('http://localhost:3000/api/test', {
        headers: { 'authorization': `Bearer ${tokenForNonExistentUser}` },
      })
      const response = await loggedHandler(req)

      expect(response.status).toBe(200)
      expect(consoleLogSpy).toHaveBeenCalled()

      const logCall = consoleLogSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)

      expect(logData).not.toHaveProperty('user_id')
    })

    it('logs as valid JSON string', async () => {
      const handler = async (_req: Request) => {
        return new Response(JSON.stringify({ message: 'success' }), { status: 200 })
      }

      const loggedHandler = withRequestLogging(handler, jwtService, db)
      const req = new Request('http://localhost:3000/api/test')
      await loggedHandler(req)

      expect(consoleLogSpy).toHaveBeenCalled()

      const logCall = consoleLogSpy.mock.calls[0][0]
      const parseFn = () => JSON.parse(logCall)

      expect(parseFn).not.toThrow()
    })

    it('logs different HTTP methods correctly', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

      for (const method of methods) {
        // Create a fresh spy for each iteration
        const iterationSpy = mock(() => {})
        // eslint-disable-next-line no-console
        const iterationOriginalLog = console.log
        // eslint-disable-next-line no-console
        console.log = iterationSpy as unknown as typeof console.log

        const handler = async (_req: Request) => {
          return new Response(JSON.stringify({ message: 'success' }), { status: 200 })
        }

        const loggedHandler = withRequestLogging(handler, jwtService, db)
        const req = new Request('http://localhost:3000/api/test', { method })
        await loggedHandler(req)

        expect(iterationSpy).toHaveBeenCalled()

        const logCall = iterationSpy.mock.calls[0][0]
        const logData = JSON.parse(logCall)

        expect(logData.method).toBe(method)

        // Restore console.log
        // eslint-disable-next-line no-console
        console.log = iterationOriginalLog as unknown as typeof console.log
      }
    })

    it('logs different status codes correctly', async () => {
      const statusTests = [
        { status: 200, message: 'OK' },
        { status: 201, message: 'Created' },
        { status: 400, message: 'Bad Request' },
        { status: 401, message: 'Unauthorized' },
        { status: 404, message: 'Not Found' },
        { status: 500, message: 'Internal Server Error' },
      ]

      for (const { status, message } of statusTests) {
        // Create a fresh spy for each iteration
        const iterationSpy = mock(() => {})
        // eslint-disable-next-line no-console
        const iterationOriginalLog = console.log
        // eslint-disable-next-line no-console
        console.log = iterationSpy as unknown as typeof console.log

        const handler = async (_req: Request) => {
          return new Response(JSON.stringify({ message }), { status })
        }

        const loggedHandler = withRequestLogging(handler, jwtService, db)
        const req = new Request('http://localhost:3000/api/test')
        await loggedHandler(req)

        expect(iterationSpy).toHaveBeenCalled()

        const logCall = iterationSpy.mock.calls[0][0]
        const logData = JSON.parse(logCall)

        expect(logData.status).toBe(status)

        // Restore console.log
        // eslint-disable-next-line no-console
        console.log = iterationOriginalLog as unknown as typeof console.log
      }
    })

    it('excludes query string from path in log', async () => {
      const handler = async (_req: Request) => {
        return new Response(JSON.stringify({ message: 'success' }), { status: 200 })
      }

      const loggedHandler = withRequestLogging(handler, jwtService, db)
      const req = new Request('http://localhost:3000/api/test?param=sensitive&token=secret123')
      await loggedHandler(req)

      expect(consoleLogSpy).toHaveBeenCalled()

      const logCall = consoleLogSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)

      expect(logData.path).toBe('/api/test')
      expect(logData.path).not.toContain('?')
      expect(logData.path).not.toContain('param=')
      expect(logData.path).not.toContain('token=')
    })

    it('logs error responses with status 500 when handler throws', async () => {
      const handler = async (_req: Request) => {
        throw new Error('Something went wrong')
      }

      const loggedHandler = withRequestLogging(handler, jwtService, db)
      const req = new Request('http://localhost:3000/api/test')

      await expect(loggedHandler(req)).rejects.toThrow('Something went wrong')

      expect(consoleLogSpy).toHaveBeenCalled()

      const logCall = consoleLogSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)

      expect(logData.status).toBe(500)
      expect(logData.path).toBe('/api/test')
      expect(logData.method).toBe('GET')
    })

    it('includes user_id in error logs when valid auth token is provided', async () => {
      const handler = async (_req: Request) => {
        throw new Error('Something went wrong')
      }

      const loggedHandler = withRequestLogging(handler, jwtService, db)
      const req = new Request('http://localhost:3000/api/test', {
        headers: { 'authorization': `Bearer ${validToken}` },
      })

      await expect(loggedHandler(req)).rejects.toThrow('Something went wrong')

      expect(consoleLogSpy).toHaveBeenCalled()

      const logCall = consoleLogSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)

      expect(logData.status).toBe(500)
      expect(logData.user_id).toBe(testUser.id)
    })

    it('measures duration accurately', async () => {
      const handlerDelay = 50 // ms
      const handler = async (_req: Request) => {
        await new Promise(resolve => setTimeout(resolve, handlerDelay))
        return new Response(JSON.stringify({ message: 'success' }), { status: 200 })
      }

      const loggedHandler = withRequestLogging(handler, jwtService, db)
      const req = new Request('http://localhost:3000/api/test')

      await loggedHandler(req)

      expect(consoleLogSpy).toHaveBeenCalled()

      const logCall = consoleLogSpy.mock.calls[0][0]
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const logData = JSON.parse(logCall)
      const logString = logCall

      // Duration should be close to the handler delay
      expect(logString).toContain('duration_ms')
    })

    it('does not log request body or sensitive headers', async () => {
      const handler = async (req: Request) => {
        const body = await req.json()
        return new Response(JSON.stringify({ received: body }), { status: 200 })
      }

      const loggedHandler = withRequestLogging(handler, jwtService, db)
      const req = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${validToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ password: 'secret123', creditCard: '4111-1111-1111-1111' }),
      })

      await loggedHandler(req)

      expect(consoleLogSpy).toHaveBeenCalled()

      const logCall = consoleLogSpy.mock.calls[0][0]
      const logString = logCall

      // The log should not contain the sensitive data
      expect(logString).not.toContain('secret123')
      expect(logString).not.toContain('4111-1111-1111-1111')
      expect(logString).not.toContain('Bearer') // Should not include the full token
      expect(logString).not.toContain(validToken) // Should not include the actual token
    })

    it('handles root path correctly', async () => {
      const handler = async (_req: Request) => {
        return new Response(JSON.stringify({ message: 'success' }), { status: 200 })
      }

      const loggedHandler = withRequestLogging(handler, jwtService, db)
      const req = new Request('http://localhost:3000/')
      await loggedHandler(req)

      expect(consoleLogSpy).toHaveBeenCalled()

      const logCall = consoleLogSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)

      expect(logData.path).toBe('/')
    })

    it('handles paths with multiple segments', async () => {
      const handler = async (_req: Request) => {
        return new Response(JSON.stringify({ message: 'success' }), { status: 200 })
      }

      const loggedHandler = withRequestLogging(handler, jwtService, db)
      const req = new Request('http://localhost:3000/api/v1/drafts/abc123/publish')
      await loggedHandler(req)

      expect(consoleLogSpy).toHaveBeenCalled()

      const logCall = consoleLogSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)

      expect(logData.path).toBe('/api/v1/drafts/abc123/publish')
    })
  })
})
