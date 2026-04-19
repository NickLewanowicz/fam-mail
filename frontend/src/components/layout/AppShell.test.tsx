import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { AuthContextType } from '../../types/auth'
import { AppShell } from './AppShell'

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../auth/AuthContext'

const authMock = (): AuthContextType => ({
  user: {
    id: 'u1',
    oidcSub: 'sub',
    oidcIssuer: 'iss',
    email: 'test@example.com',
    emailVerified: true,
    firstName: 'Test',
    lastName: 'User',
    createdAt: '',
    updatedAt: '',
  },
  logout: vi.fn(),
  isAuthenticated: true,
  isLoading: false,
  token: 'test-token',
  login: vi.fn(),
  handleCallbackToken: vi.fn(),
})

describe('AppShell', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authMock())
  })

  it('renders Fam Mail in the navbar', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div>Child content</div>
        </AppShell>
      </MemoryRouter>,
    )
    expect(screen.getByText('Fam Mail')).toBeInTheDocument()
  })

  it('renders New Postcard link', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div>Child</div>
        </AppShell>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /New Postcard/i })).toBeInTheDocument()
  })

  it('renders children content', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div>Unique child marker</div>
        </AppShell>
      </MemoryRouter>,
    )
    expect(screen.getByText('Unique child marker')).toBeInTheDocument()
  })

  it('shows user avatar with first letter of firstName', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div />
        </AppShell>
      </MemoryRouter>,
    )
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('shows Sign out in dropdown menu', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div />
        </AppShell>
      </MemoryRouter>,
    )
    const avatar = screen.getByText('T').closest('[role="button"]')
    expect(avatar).toBeTruthy()
    fireEvent.click(avatar as HTMLElement)
    expect(screen.getByText('Sign out')).toBeInTheDocument()
  })

  it('New Postcard link points to /create', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div />
        </AppShell>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /New Postcard/i })).toHaveAttribute('href', '/create')
  })

  it('Fam Mail link points to /', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div />
        </AppShell>
      </MemoryRouter>,
    )
    const brand = screen.getByText('Fam Mail').closest('a')
    expect(brand).toHaveAttribute('href', '/')
  })
})
