import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AuthContext } from './AuthContext'
import type { AuthContextType } from '../../types/auth'

const defaultAuthContext: AuthContextType = {
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
  handleCallbackToken: vi.fn(),
}

function renderProtectedRoute(authContext: Partial<AuthContextType> = {}) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthContext.Provider value={{ ...defaultAuthContext, ...authContext }}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner while auth is loading', () => {
    renderProtectedRoute({ isLoading: true })
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('redirects to login when not authenticated', () => {
    renderProtectedRoute({ isAuthenticated: false })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('renders children when authenticated', () => {
    renderProtectedRoute({
      isAuthenticated: true,
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
    })
    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
  })

  it('does not render children when loading', () => {
    renderProtectedRoute({ isLoading: true, isAuthenticated: false })
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })
})
