import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage'
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

function renderLoginPage(authContext: Partial<AuthContextType> = {}, initialEntries = ['/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthContext.Provider value={{ ...defaultAuthContext, ...authContext }}>
        <LoginPage />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the login page', () => {
    renderLoginPage()
    expect(screen.getByText('📮 Fam Mail')).toBeInTheDocument()
    expect(screen.getByText('Sign in with OAuth')).toBeInTheDocument()
  })

  it('displays the tagline', () => {
    renderLoginPage()
    expect(screen.getByText('Send postcards to the people you love')).toBeInTheDocument()
  })

  it('calls login when sign in button is clicked', async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderLoginPage({ login: mockLogin })

    await user.click(screen.getByText('Sign in with OAuth'))
    expect(mockLogin).toHaveBeenCalledOnce()
  })

  it('shows loading state when isLoading is true', () => {
    renderLoginPage({ isLoading: true })
    expect(screen.getByText('Redirecting...')).toBeInTheDocument()
    expect(screen.queryByText('Sign in with OAuth')).not.toBeInTheDocument()
  })

  it('disables button when loading', () => {
    renderLoginPage({ isLoading: true })
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('shows error when login fails', async () => {
    const mockLogin = vi.fn().mockRejectedValue(new Error('Login failed'))
    const user = userEvent.setup()
    renderLoginPage({ login: mockLogin })

    await user.click(screen.getByText('Sign in with OAuth'))
    await waitFor(() => {
      expect(screen.getByText('Failed to start login. Please try again.')).toBeInTheDocument()
    })
  })

  it('shows error from URL search params', () => {
    renderLoginPage({}, ['/login?error=Authentication%20failed.'])
    expect(screen.getByText('Authentication failed.')).toBeInTheDocument()
  })

  it('shows the helper text', () => {
    renderLoginPage()
    expect(screen.getByText('Sign in to create and send postcards')).toBeInTheDocument()
  })

  it('shows Get Started divider', () => {
    renderLoginPage()
    expect(screen.getByText('Get Started')).toBeInTheDocument()
  })
})
