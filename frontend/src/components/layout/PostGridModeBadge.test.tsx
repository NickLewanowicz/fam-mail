import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { AuthContextType } from '../../types/auth'

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../../utils/postgridApi', () => ({
  fetchPostgridStatus: vi.fn(),
  setPostgridMode: vi.fn(),
}))

import { PostGridModeBadge } from './PostGridModeBadge'
import { useAuth } from '../auth/AuthContext'
import { fetchPostgridStatus, setPostgridMode } from '../../utils/postgridApi'

const LIVE_CONFIRM =
  'Switching to LIVE mode means postcards will actually be printed and mailed. Continue?'

function baseAuth(overrides: Partial<AuthContextType> = {}): AuthContextType {
  return {
    user: {
      id: 'u1',
      oidcSub: 'sub',
      oidcIssuer: 'iss',
      email: 'a@b.com',
      emailVerified: true,
      firstName: 'A',
      lastName: 'B',
      createdAt: '',
      updatedAt: '',
    },
    token: 'jwt-token',
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    handleCallbackToken: vi.fn(),
    ...overrides,
  }
}

describe('PostGridModeBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue(baseAuth())
    vi.mocked(fetchPostgridStatus).mockResolvedValue({ mode: 'test', mockMode: false })
  })

  it('renders nothing when there is no token', () => {
    vi.mocked(useAuth).mockReturnValue(baseAuth({ token: null, user: null, isAuthenticated: false }))
    const { container } = render(<PostGridModeBadge />)
    expect(container.firstChild).toBeNull()
  })

  it('loads and shows TEST badge', async () => {
    render(<PostGridModeBadge />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^TEST$/ })).toBeInTheDocument()
    })
    expect(fetchPostgridStatus).toHaveBeenCalled()
  })

  it('shows LIVE badge and MOCK as non-button', async () => {
    vi.mocked(fetchPostgridStatus).mockResolvedValueOnce({ mode: 'live', mockMode: false })
    const { unmount } = render(<PostGridModeBadge />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^LIVE$/ })).toBeInTheDocument()
    })
    unmount()

    vi.mocked(fetchPostgridStatus).mockResolvedValueOnce({ mode: 'mock', mockMode: true })
    render(<PostGridModeBadge />)
    await waitFor(() => {
      expect(screen.getByText(/^MOCK$/)).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /^MOCK$/ })).not.toBeInTheDocument()
  })

  it('asks for confirmation before switching to live', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    vi.mocked(fetchPostgridStatus).mockResolvedValue({ mode: 'test', mockMode: false })
    render(<PostGridModeBadge />)
    await waitFor(() => screen.getByRole('button', { name: /^TEST$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^TEST$/ }))
    expect(confirmSpy).toHaveBeenCalledWith(LIVE_CONFIRM)
    expect(setPostgridMode).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('calls setPostgridMode when switching to live after confirm', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(fetchPostgridStatus).mockResolvedValue({ mode: 'test', mockMode: false })
    vi.mocked(setPostgridMode).mockResolvedValue({ mode: 'live', mockMode: false })
    render(<PostGridModeBadge />)
    await waitFor(() => screen.getByRole('button', { name: /^TEST$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^TEST$/ }))
    await waitFor(() => {
      expect(setPostgridMode).toHaveBeenCalledWith('live')
    })
    confirmSpy.mockRestore()
  })

  it('switches to test from live without confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    vi.mocked(fetchPostgridStatus).mockResolvedValue({ mode: 'live', mockMode: false })
    vi.mocked(setPostgridMode).mockResolvedValue({ mode: 'test', mockMode: false })
    render(<PostGridModeBadge />)
    await waitFor(() => screen.getByRole('button', { name: /^LIVE$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^LIVE$/ }))
    await waitFor(() => {
      expect(setPostgridMode).toHaveBeenCalledWith('test')
    })
    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})
