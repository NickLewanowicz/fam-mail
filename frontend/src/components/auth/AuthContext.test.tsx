import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthContext, useAuth } from './AuthContext'
import type { AuthContextType } from '../../types/auth'

describe('AuthContext', () => {
  const mockAuthContext: AuthContextType = {
    user: {
      id: 'user-1',
      oidcSub: 'sub-1',
      oidcIssuer: 'https://auth.example.com',
      email: 'test@example.com',
      emailVerified: true,
      firstName: 'Test',
      lastName: 'User',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    token: 'test-token',
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    handleCallbackToken: vi.fn(),
  }

  it('provides auth context to children', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <AuthContext.Consumer>
          {(value) => (
            <div data-testid="consumer">
              {value?.isAuthenticated ? 'authenticated' : 'not-authenticated'}
            </div>
          )}
        </AuthContext.Consumer>
      </AuthContext.Provider>
    )

    expect(screen.getByTestId('consumer')).toHaveTextContent('authenticated')
  })

  it('provides unauthenticated state', () => {
    const unauthenticatedContext: AuthContextType = {
      ...mockAuthContext,
      user: null,
      token: null,
      isAuthenticated: false,
    }

    render(
      <AuthContext.Provider value={unauthenticatedContext}>
        <AuthContext.Consumer>
          {(value) => (
            <div data-testid="consumer">
              {value?.isAuthenticated ? 'authenticated' : 'not-authenticated'}
            </div>
          )}
        </AuthContext.Consumer>
      </AuthContext.Provider>
    )

    expect(screen.getByTestId('consumer')).toHaveTextContent('not-authenticated')
  })

  it('exposes user data through context', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <AuthContext.Consumer>
          {(value) => (
            <div data-testid="user-info">
              {value?.user?.email ?? 'no-user'}
            </div>
          )}
        </AuthContext.Consumer>
      </AuthContext.Provider>
    )

    expect(screen.getByTestId('user-info')).toHaveTextContent('test@example.com')
  })

  it('exposes token through context', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <AuthContext.Consumer>
          {(value) => (
            <div data-testid="token-info">
              {value?.token ?? 'no-token'}
            </div>
          )}
        </AuthContext.Consumer>
      </AuthContext.Provider>
    )

    expect(screen.getByTestId('token-info')).toHaveTextContent('test-token')
  })
})

describe('useAuth', () => {
  it('returns context when used within AuthProvider', () => {
    const mockContext: AuthContextType = {
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      handleCallbackToken: vi.fn(),
    }

    function TestComponent() {
      const auth = useAuth()
      return <div data-testid="auth-state">{auth.isAuthenticated ? 'yes' : 'no'}</div>
    }

    render(
      <AuthContext.Provider value={mockContext}>
        <TestComponent />
      </AuthContext.Provider>
    )

    expect(screen.getByTestId('auth-state')).toHaveTextContent('no')
  })

  it('throws error when used outside of AuthProvider', () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function TestComponent() {
      useAuth()
      return <div>Should not render</div>
    }

    expect(() => render(<TestComponent />)).toThrow(
      'useAuth must be used within an AuthProvider'
    )

    spy.mockRestore()
  })

  it('provides all required auth context properties', () => {
    const mockContext: AuthContextType = {
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      handleCallbackToken: vi.fn(),
    }

    let capturedContext: AuthContextType | null = null

    function TestComponent() {
      const auth = useAuth()
      capturedContext = auth
      return <div data-testid="test">test</div>
    }

    render(
      <AuthContext.Provider value={mockContext}>
        <TestComponent />
      </AuthContext.Provider>
    )

    expect(capturedContext).not.toBeNull()
    expect(capturedContext).toHaveProperty('user')
    expect(capturedContext).toHaveProperty('token')
    expect(capturedContext).toHaveProperty('isLoading')
    expect(capturedContext).toHaveProperty('isAuthenticated')
    expect(capturedContext).toHaveProperty('login')
    expect(capturedContext).toHaveProperty('logout')
    expect(capturedContext).toHaveProperty('handleCallbackToken')
  })

  it('returns context with user data when authenticated', () => {
    const mockContext: AuthContextType = {
      user: {
        id: 'user-1',
        oidcSub: 'sub-1',
        oidcIssuer: 'https://auth.example.com',
        email: 'test@example.com',
        emailVerified: true,
        firstName: 'Test',
        lastName: 'User',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      token: 'valid-token',
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      handleCallbackToken: vi.fn(),
    }

    let capturedContext: AuthContextType | null = null

    function TestComponent() {
      const auth = useAuth()
      capturedContext = auth
      return (
        <div data-testid="user-email">
          {auth.user?.email ?? 'no-email'}
        </div>
      )
    }

    render(
      <AuthContext.Provider value={mockContext}>
        <TestComponent />
      </AuthContext.Provider>
    )

    expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
    expect(capturedContext!.isAuthenticated).toBe(true)
    expect(capturedContext!.user).not.toBeNull()
  })
})
