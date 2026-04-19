import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Header } from './Header'
import type { AuthContextType } from '../../types/auth'

const mockUseAuth = vi.hoisted(() => ({
  useAuth: vi.fn(),
}))

vi.mock('../auth/AuthContext', () => mockUseAuth)

import { vi } from 'vitest'

const defaultAuthContext: AuthContextType = {
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
  handleCallbackToken: vi.fn(),
}

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.useAuth.mockReturnValue(defaultAuthContext)
  })

  it('renders without crashing', () => {
    render(<Header />)
    expect(screen.getByText('📮 Fam Mail')).toBeInTheDocument()
  })

  it('displays the tagline', () => {
    render(<Header />)
    expect(screen.getByText('Send postcards to the people you love')).toBeInTheDocument()
  })

  it('does not show test mode badge by default', () => {
    render(<Header />)
    expect(screen.queryByText('🧪 Test Mode')).not.toBeInTheDocument()
  })

  it('shows test mode badge when testMode is true', () => {
    render(<Header testMode={true} />)
    expect(screen.getByText('🧪 Test Mode')).toBeInTheDocument()
  })

  it('does not show test mode badge when testMode is false', () => {
    render(<Header testMode={false} />)
    expect(screen.queryByText('🧪 Test Mode')).not.toBeInTheDocument()
  })

  it('renders heading as h1', () => {
    render(<Header />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('📮 Fam Mail')
  })

  it('applies gradient background classes', () => {
    render(<Header />)
    const container = screen.getByText('📮 Fam Mail').closest('.bg-gradient-to-r')
    expect(container).toBeInTheDocument()
  })

  it('shows user info when authenticated with name', () => {
    mockUseAuth.useAuth.mockReturnValue({
      ...defaultAuthContext,
      isAuthenticated: true,
      user: {
        id: 'user-1',
        oidcSub: 'sub-1',
        oidcIssuer: 'https://auth.example.com',
        email: 'test@example.com',
        emailVerified: true,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    })

    render(<Header />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('shows email when authenticated without name', () => {
    mockUseAuth.useAuth.mockReturnValue({
      ...defaultAuthContext,
      isAuthenticated: true,
      user: {
        id: 'user-1',
        oidcSub: 'sub-1',
        oidcIssuer: 'https://auth.example.com',
        email: 'test@example.com',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    })

    render(<Header />)
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('shows sign out button when authenticated', () => {
    mockUseAuth.useAuth.mockReturnValue({
      ...defaultAuthContext,
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

    render(<Header />)
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('does not show user info when not authenticated', () => {
    render(<Header />)
    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument()
  })

  it('calls logout when sign out is clicked', async () => {
    const mockLogout = vi.fn()
    mockUseAuth.useAuth.mockReturnValue({
      ...defaultAuthContext,
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
      logout: mockLogout,
    })

    const { userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(<Header />)

    await user.click(screen.getByText('Sign Out'))
    expect(mockLogout).toHaveBeenCalledOnce()
  })

  it('shows avatar when user has avatarUrl', () => {
    mockUseAuth.useAuth.mockReturnValue({
      ...defaultAuthContext,
      isAuthenticated: true,
      user: {
        id: 'user-1',
        oidcSub: 'sub-1',
        oidcIssuer: 'https://auth.example.com',
        email: 'test@example.com',
        emailVerified: true,
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    })

    render(<Header />)
    const avatarImg = screen.getByAltText('test@example.com')
    expect(avatarImg).toBeInTheDocument()
    expect(avatarImg).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })
})
