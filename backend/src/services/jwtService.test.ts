import { describe, it, expect, beforeEach } from 'bun:test'
import { jwtVerify } from 'jose'
import { JWTService, type JWTConfig } from './jwtService'
import type { User } from '../models/user'

// Mock user data for testing
const mockUser: User = {
  id: 'test-user-123',
  oidcSub: 'oidc-sub-456',
  oidcIssuer: 'https://test-issuer.com',
  email: 'test@example.com',
  emailVerified: true,
  firstName: 'Test',
  lastName: 'User',
  avatarUrl: 'https://example.com/avatar.jpg',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
}

describe('JWTService', () => {
  let jwtService: JWTService

  beforeEach(() => {
    const config: JWTConfig = {
      secret: 'test-secret-key-for-testing-minimum-32-chars',
      expiresIn: '1h',
      refreshExpiresIn: '7d'
    }
    jwtService = new JWTService(config)
  })

  describe('generateAccessToken', () => {
    it('returns a valid JWT string', async () => {
      const token = await jwtService.generateAccessToken(mockUser)
      expect(token).toBeString()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts: header.payload.signature
    })

    it('JWT contains the correct user ID as sub', async () => {
      const token = await jwtService.generateAccessToken(mockUser)
      const { payload } = await jwtVerify(token, new TextEncoder().encode('test-secret-key-for-testing-minimum-32-chars'))
      expect(payload.sub).toBe(mockUser.id)
    })

    it('JWT has an iat (issued at) claim', async () => {
      const token = await jwtService.generateAccessToken(mockUser)
      const { payload } = await jwtVerify(token, new TextEncoder().encode('test-secret-key-for-testing-minimum-32-chars'))
      expect(payload.iat).toBeDefined()
      expect(typeof payload.iat).toBe('number')
      expect(payload.iat).toBeGreaterThan(0)
    })

    it('JWT has an exp (expiration) claim', async () => {
      const token = await jwtService.generateAccessToken(mockUser)
      const { payload } = await jwtVerify(token, new TextEncoder().encode('test-secret-key-for-testing-minimum-32-chars'))
      expect(payload.exp).toBeDefined()
      expect(typeof payload.exp).toBe('number')
      expect(payload.exp).toBeGreaterThan(0)
    })
  })

  describe('generateRefreshToken', () => {
    it('returns a valid JWT string', async () => {
      const token = await jwtService.generateRefreshToken(mockUser)
      expect(token).toBeString()
      expect(token.split('.')).toHaveLength(3)
    })

    it('JWT contains the correct user ID as sub', async () => {
      const token = await jwtService.generateRefreshToken(mockUser)
      const { payload } = await jwtVerify(token, new TextEncoder().encode('test-secret-key-for-testing-minimum-32-chars'))
      expect(payload.sub).toBe(mockUser.id)
    })
  })

  describe('verifyToken', () => {
    it('returns the payload for a valid access token', async () => {
      const token = await jwtService.generateAccessToken(mockUser)
      const payload = await jwtService.verifyToken(token)
      expect(payload.sub).toBe(mockUser.id)
      expect(payload.iat).toBeDefined()
      expect(payload.exp).toBeDefined()
    })

    it('returns the payload for a valid refresh token', async () => {
      const token = await jwtService.generateRefreshToken(mockUser)
      const payload = await jwtService.verifyToken(token)
      expect(payload.sub).toBe(mockUser.id)
      expect(payload.iat).toBeDefined()
      expect(payload.exp).toBeDefined()
    })

    it('throws for a malformed token', async () => {
      try {
        await jwtService.verifyToken('not.a.valid.jwt')
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('throws for a token signed with wrong secret', async () => {
      // Create a token with a different secret
      const wrongSecretConfig: JWTConfig = {
        secret: 'different-secret-key-for-testing-minimum-32-chars',
        expiresIn: '1h',
        refreshExpiresIn: '7d'
      }
      const wrongSecretService = new JWTService(wrongSecretConfig)
      const token = await wrongSecretService.generateAccessToken(mockUser)

      // Try to verify with our service
      try {
        await jwtService.verifyToken(token)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('throws for an expired token', async () => {
      // Create a service with a very short expiry
      const expiredConfig: JWTConfig = {
        secret: 'test-secret-key-for-testing-minimum-32-chars',
        expiresIn: '1s',
        refreshExpiresIn: '7d'
      }
      const expiredService = new JWTService(expiredConfig)
      const token = await expiredService.generateAccessToken(mockUser)

      // Wait to ensure it's expired
      await new Promise(resolve => setTimeout(resolve, 1100))

      try {
        await jwtService.verifyToken(token)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('extractUserIdFromToken', () => {
    it('returns user ID for valid token', async () => {
      const token = await jwtService.generateAccessToken(mockUser)
      const userId = await jwtService.extractUserIdFromToken(token)
      expect(userId).toBe(mockUser.id)
    })

    it('returns null for invalid token', async () => {
      const userId = await jwtService.extractUserIdFromToken('invalid.token.here')
      expect(userId).toBeNull()
    })

    it('returns null for expired token', async () => {
      // Create a service with a very short expiry
      const expiredConfig: JWTConfig = {
        secret: 'test-secret-key-for-testing-minimum-32-chars',
        expiresIn: '1s',
        refreshExpiresIn: '7d'
      }
      const expiredService = new JWTService(expiredConfig)
      const token = await expiredService.generateAccessToken(mockUser)

      // Wait to ensure it's expired
      await new Promise(resolve => setTimeout(resolve, 1100))

      const userId = await jwtService.extractUserIdFromToken(token)
      expect(userId).toBeNull()
    })
  })

  describe('token consistency', () => {
    it('access and refresh tokens have different exp values when generated at the same time', async () => {
      const accessToken = await jwtService.generateAccessToken(mockUser)
      const refreshToken = await jwtService.generateRefreshToken(mockUser)

      const accessPayload = await jwtService.verifyToken(accessToken)
      const refreshPayload = await jwtService.verifyToken(refreshToken)

      // Refresh token should last longer than access token
      expect(refreshPayload.exp!).toBeGreaterThan(accessPayload.exp!)
    })
  })

  describe('verifyRefreshToken', () => {
    it('returns the payload for a valid refresh token', async () => {
      const token = await jwtService.generateRefreshToken(mockUser)
      const payload = await jwtService.verifyRefreshToken(token)
      expect(payload.sub).toBe(mockUser.id)
      expect(payload.typ).toBe('refresh')
    })

    it('rejects an access token passed as a refresh token', async () => {
      const accessToken = await jwtService.generateAccessToken(mockUser)
      try {
        await jwtService.verifyRefreshToken(accessToken)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
        expect((error as Error).message).toBe('Not a refresh token')
      }
    })

    it('rejects an expired refresh token', async () => {
      const expiredConfig: JWTConfig = {
        secret: 'test-secret-key-for-testing-minimum-32-chars',
        expiresIn: '1h',
        refreshExpiresIn: '1s'
      }
      const expiredService = new JWTService(expiredConfig)
      const token = await expiredService.generateRefreshToken(mockUser)

      await new Promise(resolve => setTimeout(resolve, 1100))

      try {
        await jwtService.verifyRefreshToken(token)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('rejects a malformed token', async () => {
      try {
        await jwtService.verifyRefreshToken('not.a.valid.jwt')
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('rejects a token signed with the wrong secret', async () => {
      const wrongConfig: JWTConfig = {
        secret: 'different-secret-key-for-testing-minimum-32-chars',
        expiresIn: '1h',
        refreshExpiresIn: '7d'
      }
      const wrongService = new JWTService(wrongConfig)
      const token = await wrongService.generateRefreshToken(mockUser)

      try {
        await jwtService.verifyRefreshToken(token)
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })
})
