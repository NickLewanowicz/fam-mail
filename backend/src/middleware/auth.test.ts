import { describe, it, expect, beforeEach, afterEach, afterAll } from 'bun:test'
import { AuthMiddleware } from './auth'
import { JWTService } from '../services/jwtService'
import { Database } from '../database'
import type { User } from '../models/user'
import { join } from 'path'
import { tmpdir } from 'os'
import { unlinkSync, existsSync } from 'fs'

describe('AuthMiddleware', () => {
  let dbPath: string
  let db: Database
  let jwtService: JWTService
  let middleware: AuthMiddleware
  let testUser: User
  let validToken: string

  beforeEach(async () => {
    // Create real DB with temp file
    dbPath = join(tmpdir(), `test-auth-${Date.now()}-${Math.random()}.db`)
    db = new Database(dbPath)

    // Create real JWT service
    jwtService = new JWTService({
      secret: 'test-secret-key-for-testing-minimum-32-chars',
      expiresIn: '1h',
      refreshExpiresIn: '7d',
    })

    // Create middleware with real instances
    middleware = new AuthMiddleware(jwtService, db)

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
  })

  afterEach(() => {
    // Clean up test database after each test
    if (existsSync(dbPath)) {
      unlinkSync(dbPath)
    }
  })

  afterAll(() => {
    // Final cleanup check
    if (existsSync(dbPath)) {
      unlinkSync(dbPath)
    }
  })

  describe('authenticate()', () => {
    it('returns error when no Authorization header', async () => {
      const req = new Request('http://localhost:3000/test')

      const result = await middleware.authenticate(req)

      expect(result.error).toBe('Missing or invalid authorization header')
      expect(result.user).toBeUndefined()
    })

    it('returns error when Authorization header does not start with "Bearer "', async () => {
      const req = new Request('http://localhost:3000/test', {
        headers: { 'authorization': 'Basic invalid' },
      })

      const result = await middleware.authenticate(req)

      expect(result.error).toBe('Missing or invalid authorization header')
      expect(result.user).toBeUndefined()
    })

    it('returns error when token is invalid/malformed', async () => {
      const invalidToken = 'invalid.token.here'
      const req = new Request('http://localhost:3000/test', {
        headers: { 'authorization': `Bearer ${invalidToken}` },
      })

      const result = await middleware.authenticate(req)

      expect(result.error).toBe('Invalid or expired token')
      expect(result.user).toBeUndefined()
    })

    it('returns error when token is valid but user not found in DB', async () => {
      // Generate a token for a user that doesn't exist in DB
      const nonExistentUser = {
        ...testUser,
        id: crypto.randomUUID(),
        email: 'nonexistent@example.com',
      }
      const tokenForNonExistentUser = await jwtService.generateAccessToken(nonExistentUser)

      const req = new Request('http://localhost:3000/test', {
        headers: { 'authorization': `Bearer ${tokenForNonExistentUser}` },
      })

      const result = await middleware.authenticate(req)

      expect(result.error).toBe('User not found')
      expect(result.user).toBeUndefined()
    })

    it('returns user when token is valid and user exists in DB', async () => {
      const req = new Request('http://localhost:3000/test', {
        headers: { 'authorization': `Bearer ${validToken}` },
      })

      const result = await middleware.authenticate(req)

      expect(result.error).toBeUndefined()
      expect(result.user).toBeDefined()
      expect(result.user?.id).toBe(testUser.id)
      expect(result.user?.email).toBe(testUser.email)
      expect(result.user?.firstName).toBe(testUser.firstName)
      expect(result.user?.lastName).toBe(testUser.lastName)
    })
  })

  describe('requireAuth()', () => {
    it('returns 401 JSON response when no auth header', async () => {
      const req = new Request('http://localhost:3000/test')
      const handler = async (_req: Request, _user: User) => ({ message: 'Should not be called' })

      const protectedHandler = middleware.requireAuth(handler)
      const response = await protectedHandler(req)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body).toEqual({ error: 'Missing or invalid authorization header' })
    })

    it('returns 401 JSON response when Authorization header does not start with "Bearer "', async () => {
      const req = new Request('http://localhost:3000/test', {
        headers: { 'authorization': 'Basic invalid' },
      })
      const handler = async (_req: Request, _user: User) => ({ message: 'Should not be called' })

      const protectedHandler = middleware.requireAuth(handler)
      const response = await protectedHandler(req)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body).toEqual({ error: 'Missing or invalid authorization header' })
    })

    it('returns 401 JSON response when invalid token', async () => {
      const invalidToken = 'invalid.token.here'
      const req = new Request('http://localhost:3000/test', {
        headers: { 'authorization': `Bearer ${invalidToken}` },
      })
      const handler = async (_req: Request, _user: User) => ({ message: 'Should not be called' })

      const protectedHandler = middleware.requireAuth(handler)
      const response = await protectedHandler(req)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body).toEqual({ error: 'Invalid or expired token' })
    })

    it('calls the handler with user when token is valid', async () => {
      const req = new Request('http://localhost:3000/test', {
        headers: { 'authorization': `Bearer ${validToken}` },
      })

      let handlerCalled = false
      let receivedUser: User | null = null

      const handler = async (req: Request, user: User) => {
        handlerCalled = true
        receivedUser = user
        return { message: 'Success', userId: user.id }
      }

      const protectedHandler = middleware.requireAuth(handler)
      const result = await protectedHandler(req)

      expect(handlerCalled).toBe(true)
      expect(receivedUser).toBeDefined()
      expect(receivedUser!.id).toBe(testUser.id)
      // requireAuth returns whatever the handler returns directly
      expect(result).toEqual({ message: 'Success', userId: testUser.id })
    })

    it('returns 401 JSON response when token is valid but user not found in DB', async () => {
      // Generate a token for a user that doesn't exist in DB
      const nonExistentUser = {
        ...testUser,
        id: crypto.randomUUID(),
        email: 'nonexistent@example.com',
      }
      const tokenForNonExistentUser = await jwtService.generateAccessToken(nonExistentUser)

      const req = new Request('http://localhost:3000/test', {
        headers: { 'authorization': `Bearer ${tokenForNonExistentUser}` },
      })

      const handler = async (_req: Request, _user: User) => ({ message: 'Should not be called' })

      const protectedHandler = middleware.requireAuth(handler)
      const response = await protectedHandler(req)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body).toEqual({ error: 'User not found' })
    })

    it('response from requireAuth on failure has correct JSON error body with proper Content-Type', async () => {
      const req = new Request('http://localhost:3000/test')
      const handler = async (_req: Request, _user: User) => ({ message: 'Should not be called' })

      const protectedHandler = middleware.requireAuth(handler)
      const response = await protectedHandler(req)

      expect(response.status).toBe(401)
      expect(response.headers.get('content-type')).toBe('application/json')
      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(typeof body.error).toBe('string')
    })

    it('passes the request object to the handler', async () => {
      const testBody = { data: 'test' }
      const req = new Request('http://localhost:3000/test', {
        method: 'POST',
        headers: { 'authorization': `Bearer ${validToken}` },
        body: JSON.stringify(testBody),
      })

      let receivedReq: Request | null = null

      const handler = async (req: Request, _user: User) => {
        receivedReq = req
        return { url: req.url, method: req.method }
      }

      const protectedHandler = middleware.requireAuth(handler)
      await protectedHandler(req)

      expect(receivedReq).not.toBeNull()
      expect(receivedReq?.url).toBe(req.url)
      expect(receivedReq?.method).toBe(req.method)
    })

    it('returns the exact response from the handler', async () => {
      const req = new Request('http://localhost:3000/test', {
        headers: { 'authorization': `Bearer ${validToken}` },
      })

      const customResponse = {
        status: 200,
        message: 'Custom response',
        data: { key: 'value' },
      }

      const handler = async (_req: Request, _user: User) => customResponse

      const protectedHandler = middleware.requireAuth(handler)
      const result = await protectedHandler(req)

      expect(result).toEqual(customResponse)
    })
  })
})
