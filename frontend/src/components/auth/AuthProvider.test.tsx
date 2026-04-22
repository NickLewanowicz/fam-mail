import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './AuthProvider'
import { AuthContext } from './AuthContext'
import type { AuthContextType } from '../../types/auth'

// Mock the auth API service
vi.mock('../../services/authApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../services/authApi')>()
  return {
    ...original,
    getToken: vi.fn(() => null),
    setToken: vi.fn(),
    removeToken: vi.fn(),
    getRefreshToken: vi.fn(() => null),
    setRefreshToken: vi.fn(),
    removeRefreshToken: vi.fn(),
    clearAllTokens: vi.fn(),
    initiateLogin: vi.fn(),
    fetchCurrentUser: vi.fn(),
    logoutUser: vi.fn(),
    refreshAccessToken: vi.fn(),
    getAuthHeaders: vi.fn(() => ({ 'Content-Type': 'application/json' })),
  }
})

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Provide localStorage mock for jsdom
    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value }),
      removeItem: vi.fn((key: string) => { delete store[key] }),
      clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
      length: 0,
      key: vi.fn(() => null),
    })
  })

  it('provides unauthenticated state when no token exists', async () => {
    const { getToken } = await import('../../services/authApi')
    ;(getToken as ReturnType<typeof vi.fn>).mockReturnValue(null)

    let contextValue: AuthContextType | null = null
    renderWithRouter(
      <AuthProvider>
        <AuthContext.Consumer>
          {(value) => {
            contextValue = value
            return <div data-testid="consumer">consumed</div>
          }}
        </AuthContext.Consumer>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(contextValue).not.toBeNull()
    })

    expect(contextValue!.isAuthenticated).toBe(false)
    expect(contextValue!.user).toBeNull()
    expect(contextValue!.token).toBeNull()
    expect(contextValue!.isLoading).toBe(false)
  })

  it('loads user when token exists', async () => {
    const { getToken, fetchCurrentUser } = await import('../../services/authApi')
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
    ;(getToken as ReturnType<typeof vi.fn>).mockReturnValue('valid-token')
    ;(fetchCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)

    let contextValue: AuthContextType | null = null
    renderWithRouter(
      <AuthProvider>
        <AuthContext.Consumer>
          {(value) => {
            contextValue = value
            return <div data-testid="consumer">consumed</div>
          }}
        </AuthContext.Consumer>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(contextValue!.isAuthenticated).toBe(true)
    })

    expect(contextValue!.user).toEqual(mockUser)
    expect(contextValue!.token).toBe('valid-token')
  })

  it('clears token when fetchCurrentUser fails', async () => {
    const { getToken, fetchCurrentUser, removeToken } = await import('../../services/authApi')
    ;(getToken as ReturnType<typeof vi.fn>).mockReturnValue('bad-token')
    ;(fetchCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Unauthorized'))

    let contextValue: AuthContextType | null = null
    renderWithRouter(
      <AuthProvider>
        <AuthContext.Consumer>
          {(value) => {
            contextValue = value
            return <div data-testid="consumer">consumed</div>
          }}
        </AuthContext.Consumer>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(contextValue!.isAuthenticated).toBe(false)
    })

    // When no refresh token is available, removeToken is called (not clearAllTokens)
    expect(removeToken).toHaveBeenCalled()
  })

  it('redirects to auth URL on login', async () => {
    const { getToken, initiateLogin } = await import('../../services/authApi')
    ;(getToken as ReturnType<typeof vi.fn>).mockReturnValue(null)
    ;(initiateLogin as ReturnType<typeof vi.fn>).mockResolvedValue({ type: 'redirect', authUrl: 'https://auth.example.com/authorize?state=abc' })

    // Mock window.location.href
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    })

    let contextValue: AuthContextType | null = null
    renderWithRouter(
      <AuthProvider>
        <AuthContext.Consumer>
          {(value) => {
            contextValue = value
            return <div data-testid="consumer">consumed</div>
          }}
        </AuthContext.Consumer>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(contextValue).not.toBeNull()
    })

    await contextValue!.login()
    expect(window.location.href).toBe('https://auth.example.com/authorize?state=abc')

    // Restore
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
  })

  it('removes token and clears state on logout', async () => {
    const { getToken, fetchCurrentUser, logoutUser, clearAllTokens } = await import('../../services/authApi')
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
    ;(getToken as ReturnType<typeof vi.fn>).mockReturnValue('valid-token')
    ;(fetchCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
    ;(logoutUser as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
    ;(clearAllTokens as ReturnType<typeof vi.fn>).mockImplementation(() => {})

    let contextValue: AuthContextType | null = null
    renderWithRouter(
      <AuthProvider>
        <AuthContext.Consumer>
          {(value) => {
            contextValue = value
            return <div data-testid="consumer">consumed</div>
          }}
        </AuthContext.Consumer>
      </AuthProvider>
    )

    // Wait for initial load
    await waitFor(() => {
      expect(contextValue!.isAuthenticated).toBe(true)
    })

    await act(async () => {
      await contextValue!.logout()
    })

    expect(logoutUser).toHaveBeenCalledWith('valid-token')
    expect(clearAllTokens).toHaveBeenCalled()

    await waitFor(() => {
      expect(contextValue!.isAuthenticated).toBe(false)
      expect(contextValue!.user).toBeNull()
    })
  })

  it('continues local logout even when API call fails', async () => {
    const { getToken, fetchCurrentUser, logoutUser, clearAllTokens } = await import('../../services/authApi')
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
    ;(getToken as ReturnType<typeof vi.fn>).mockReturnValue('valid-token')
    ;(fetchCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
    ;(logoutUser as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))
    ;(clearAllTokens as ReturnType<typeof vi.fn>).mockImplementation(() => {})

    let contextValue: AuthContextType | null = null
    renderWithRouter(
      <AuthProvider>
        <AuthContext.Consumer>
          {(value) => {
            contextValue = value
            return <div data-testid="consumer">consumed</div>
          }}
        </AuthContext.Consumer>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(contextValue!.isAuthenticated).toBe(true)
    })

    await act(async () => {
      await contextValue!.logout()
    })

    expect(clearAllTokens).toHaveBeenCalled()

    await waitFor(() => {
      expect(contextValue!.isAuthenticated).toBe(false)
    })
  })

  it('fetches user when handleCallbackToken is called', async () => {
    const { getToken, fetchCurrentUser, setToken, setRefreshToken } = await import('../../services/authApi')
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
    ;(getToken as ReturnType<typeof vi.fn>).mockReturnValue(null)
    ;(fetchCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
    ;(setToken as ReturnType<typeof vi.fn>).mockImplementation(() => {})
    ;(setRefreshToken as ReturnType<typeof vi.fn>).mockImplementation(() => {})

    let contextValue: AuthContextType | null = null
    renderWithRouter(
      <AuthProvider>
        <AuthContext.Consumer>
          {(value) => {
            contextValue = value
            return <div data-testid="consumer">consumed</div>
          }}
        </AuthContext.Consumer>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(contextValue).not.toBeNull()
    })

    await act(async () => {
      contextValue!.handleCallbackToken('new-callback-token', 'new-refresh-token')
    })

    await waitFor(() => {
      expect(contextValue!.isAuthenticated).toBe(true)
    })

    expect(setToken).toHaveBeenCalledWith('new-callback-token')
    expect(setRefreshToken).toHaveBeenCalledWith('new-refresh-token')
    expect(fetchCurrentUser).toHaveBeenCalledWith('new-callback-token')
  })

  it('attempts refresh before logging out when access token fails on mount', async () => {
    const { getToken, getRefreshToken, fetchCurrentUser, refreshAccessToken } = await import('../../services/authApi')
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
    ;(getToken as ReturnType<typeof vi.fn>).mockReturnValue('expired-token')
    ;(getRefreshToken as ReturnType<typeof vi.fn>).mockReturnValue('stored-refresh')
    // First call (mount) fails, second call (after refresh) succeeds
    ;(fetchCurrentUser as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('Unauthorized'))
      .mockResolvedValueOnce(mockUser)
    ;(refreshAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    })

    let contextValue: AuthContextType | null = null
    renderWithRouter(
      <AuthProvider>
        <AuthContext.Consumer>
          {(value) => {
            contextValue = value
            return <div data-testid="consumer">consumed</div>
          }}
        </AuthContext.Consumer>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(contextValue!.isAuthenticated).toBe(true)
    })

    expect(refreshAccessToken).toHaveBeenCalled()
    expect(contextValue!.user).toEqual(mockUser)
  })

  it('logs out when refresh also fails on mount', async () => {
    const { getToken, getRefreshToken, fetchCurrentUser, refreshAccessToken, clearAllTokens } = await import('../../services/authApi')
    ;(getToken as ReturnType<typeof vi.fn>).mockReturnValue('expired-token')
    ;(getRefreshToken as ReturnType<typeof vi.fn>).mockReturnValue('stored-refresh')
    ;(fetchCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Unauthorized'))
    ;(refreshAccessToken as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Refresh failed'))
    ;(clearAllTokens as ReturnType<typeof vi.fn>).mockImplementation(() => {})

    let contextValue: AuthContextType | null = null
    renderWithRouter(
      <AuthProvider>
        <AuthContext.Consumer>
          {(value) => {
            contextValue = value
            return <div data-testid="consumer">consumed</div>
          }}
        </AuthContext.Consumer>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(contextValue!.isAuthenticated).toBe(false)
    })

    expect(refreshAccessToken).toHaveBeenCalled()
    expect(clearAllTokens).toHaveBeenCalled()
  })

  it('updates token state when TOKEN_REFRESHED_EVENT is dispatched', async () => {
    const { getToken, fetchCurrentUser, TOKEN_REFRESHED_EVENT } = await import('../../services/authApi')
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
    ;(getToken as ReturnType<typeof vi.fn>).mockReturnValue('initial-token')
    ;(fetchCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)

    let contextValue: AuthContextType | null = null
    renderWithRouter(
      <AuthProvider>
        <AuthContext.Consumer>
          {(value) => {
            contextValue = value
            return <div data-testid="consumer">consumed</div>
          }}
        </AuthContext.Consumer>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(contextValue!.isAuthenticated).toBe(true)
    })

    expect(contextValue!.token).toBe('initial-token')

    // Simulate authFetch refreshing the token
    await act(async () => {
      window.dispatchEvent(new CustomEvent(TOKEN_REFRESHED_EVENT, { detail: { accessToken: 'refreshed-token' } }))
    })

    await waitFor(() => {
      expect(contextValue!.token).toBe('refreshed-token')
    })
  })
})
