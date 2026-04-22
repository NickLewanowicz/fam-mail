import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './AuthProvider'
import { AuthContext } from './AuthContext'
import type { AuthContextType } from '../../types/auth'

// Mock the auth API service
vi.mock('../../services/authApi', () => ({
  getToken: vi.fn(() => null),
  setToken: vi.fn(),
  removeToken: vi.fn(),
  initiateLogin: vi.fn(),
  fetchCurrentUser: vi.fn(),
  logoutUser: vi.fn(),
  getAuthHeaders: vi.fn(() => ({ 'Content-Type': 'application/json' })),
}))

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
    const { getToken, fetchCurrentUser, logoutUser, removeToken } = await import('../../services/authApi')
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
    ;(removeToken as ReturnType<typeof vi.fn>).mockImplementation(() => {})

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
    expect(removeToken).toHaveBeenCalled()

    await waitFor(() => {
      expect(contextValue!.isAuthenticated).toBe(false)
      expect(contextValue!.user).toBeNull()
    })
  })

  it('continues local logout even when API call fails', async () => {
    const { getToken, fetchCurrentUser, logoutUser, removeToken } = await import('../../services/authApi')
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
    ;(removeToken as ReturnType<typeof vi.fn>).mockImplementation(() => {})

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

    expect(removeToken).toHaveBeenCalled()

    await waitFor(() => {
      expect(contextValue!.isAuthenticated).toBe(false)
    })
  })

  it('fetches user when handleCallbackToken is called', async () => {
    const { getToken, fetchCurrentUser, setToken } = await import('../../services/authApi')
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
      contextValue!.handleCallbackToken('new-callback-token')
    })

    await waitFor(() => {
      expect(contextValue!.isAuthenticated).toBe(true)
    })

    expect(setToken).toHaveBeenCalledWith('new-callback-token')
    expect(fetchCurrentUser).toHaveBeenCalledWith('new-callback-token')
  })
})
