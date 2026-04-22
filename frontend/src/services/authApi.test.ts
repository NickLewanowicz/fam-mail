import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getToken,
  setToken,
  removeToken,
  getRefreshToken,
  setRefreshToken,
  removeRefreshToken,
  clearAllTokens,
  initiateLogin,
  fetchCurrentUser,
  logoutUser,
  getAuthHeaders,
  refreshAccessToken,
  AuthApiError,
} from './authApi'

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset localStorage mock for jsdom
    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value }),
      removeItem: vi.fn((key: string) => { delete store[key] }),
      clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
      length: 0,
      key: vi.fn(() => null),
    })
    global.fetch = vi.fn()
  })

  describe('token management', () => {
    it('getToken returns null when no token stored', () => {
      expect(getToken()).toBeNull()
    })

    it('setToken stores token in localStorage', () => {
      setToken('my-token')
      expect(getToken()).toBe('my-token')
    })

    it('removeToken clears token from localStorage', () => {
      setToken('my-token')
      removeToken()
      expect(getToken()).toBeNull()
    })
  })

  describe('initiateLogin', () => {
    it('returns redirect result with authUrl on success', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authUrl: 'https://auth.example.com/authorize?state=abc' }),
      } as Response)

      const result = await initiateLogin()
      expect(result.type).toBe('redirect')
      expect(result.authUrl).toBe('https://auth.example.com/authorize?state=abc')
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    })

    it('returns dev-token result in dev mode', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ devMode: true, accessToken: 'dev-jwt-token' }),
      } as Response)

      const result = await initiateLogin()
      expect(result.type).toBe('dev-token')
      expect(result.accessToken).toBe('dev-jwt-token')
    })

    it('throws AuthApiError on failure', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      } as Response)

      const error = await initiateLogin().catch((e) => e)
      expect(error).toBeInstanceOf(AuthApiError)
      expect(error.message).toBe('Server error')
      expect(error.status).toBe(500)
    })

    it('throws with fallback message on non-JSON response', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => { throw new Error('Not JSON') },
      } as Response)

      const error = await initiateLogin().catch((e) => e)
      expect(error).toBeInstanceOf(AuthApiError)
      expect(error.message).toBe('Login initiation failed')
      expect(error.status).toBe(503)
    })
  })

  describe('fetchCurrentUser', () => {
    it('returns user on success', async () => {
      const mockUser = {
        id: 'user-1',
        oidcSub: 'sub-1',
        oidcIssuer: 'https://auth.example.com',
        email: 'test@example.com',
        emailVerified: true,
        firstName: 'Test',
        lastName: 'User',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser }),
      } as Response)

      const user = await fetchCurrentUser('my-token')
      expect(user).toEqual(mockUser)
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer my-token',
        },
      })
    })

    it('throws AuthApiError on failure', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      } as Response)

      await expect(fetchCurrentUser('bad-token')).rejects.toThrow('Failed to fetch user')
    })
  })

  describe('logoutUser', () => {
    it('calls logout endpoint with token', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Logged out successfully' }),
      } as Response)

      await logoutUser('my-token')
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer my-token',
        },
      })
    })

    it('throws AuthApiError on failure', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      } as Response)

      await expect(logoutUser('my-token')).rejects.toThrow('Logout failed')
    })
  })

  describe('getAuthHeaders', () => {
    it('returns headers without Authorization when no token', () => {
      const headers = getAuthHeaders()
      expect(headers).toEqual({ 'Content-Type': 'application/json' })
    })

    it('returns headers with Authorization when token exists', () => {
      setToken('my-token')
      const headers = getAuthHeaders()
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer my-token',
      })
    })
  })

  describe('AuthApiError', () => {
    it('has correct name and status', () => {
      const error = new AuthApiError('test error', 418)
      expect(error.name).toBe('AuthApiError')
      expect(error.message).toBe('test error')
      expect(error.status).toBe(418)
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('refresh token management', () => {
    it('getRefreshToken returns null when no token stored', () => {
      expect(getRefreshToken()).toBeNull()
    })

    it('setRefreshToken stores token in localStorage', () => {
      setRefreshToken('my-refresh-token')
      expect(getRefreshToken()).toBe('my-refresh-token')
    })

    it('removeRefreshToken clears token from localStorage', () => {
      setRefreshToken('my-refresh-token')
      removeRefreshToken()
      expect(getRefreshToken()).toBeNull()
    })
  })

  describe('clearAllTokens', () => {
    it('removes both access and refresh tokens', () => {
      setToken('access-token')
      setRefreshToken('refresh-token')
      clearAllTokens()
      expect(getToken()).toBeNull()
      expect(getRefreshToken()).toBeNull()
    })
  })

  describe('initiateLogin with refresh token', () => {
    it('returns dev-token result with refreshToken', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ devMode: true, accessToken: 'dev-jwt-token', refreshToken: 'dev-refresh-token' }),
      } as Response)

      const result = await initiateLogin()
      expect(result.type).toBe('dev-token')
      expect(result.accessToken).toBe('dev-jwt-token')
      expect(result.refreshToken).toBe('dev-refresh-token')
    })
  })

  describe('refreshAccessToken', () => {
    it('sends refresh token and stores new pair on success', async () => {
      setRefreshToken('old-refresh')

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
      } as Response)

      const result = await refreshAccessToken()
      expect(result.accessToken).toBe('new-access')
      expect(result.refreshToken).toBe('new-refresh')
      expect(getToken()).toBe('new-access')
      expect(getRefreshToken()).toBe('new-refresh')
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'old-refresh' }),
      })
    })

    it('throws and clears tokens when no refresh token stored', async () => {
      // No refresh token set
      await expect(refreshAccessToken()).rejects.toThrow('No refresh token available')
      expect(getToken()).toBeNull()
      expect(getRefreshToken()).toBeNull()
    })

    it('throws and clears tokens when refresh fails', async () => {
      setToken('old-access')
      setRefreshToken('old-refresh')

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid refresh token' }),
      } as Response)

      await expect(refreshAccessToken()).rejects.toThrow('Token refresh failed')
      expect(getToken()).toBeNull()
      expect(getRefreshToken()).toBeNull()
    })
  })
})
