import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthCallbackPage } from './AuthCallbackPage'
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

function renderCallbackPage(
  authContext: Partial<AuthContextType> = {},
  initialEntries = ['/auth/callback']
) {
  let result: ReturnType<typeof render>
  act(() => {
    result = render(
      <MemoryRouter initialEntries={initialEntries}>
        <AuthContext.Provider value={{ ...defaultAuthContext, ...authContext }}>
          <AuthCallbackPage />
        </AuthContext.Provider>
      </MemoryRouter>
    )
  })
  return result!
}

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // ISSUE-0086 / ADR 0003: tests exercise the ticket exchange flow —
    // each test stubs global fetch for its own scenario
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows loading spinner while the exchange is in flight', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    renderCallbackPage({}, ['/auth/callback?ticket=ticket-abc'])
    expect(screen.getByText('Signing you in...')).toBeInTheDocument()
    expect(screen.getByText('Please wait while we complete authentication.')).toBeInTheDocument()
  })

  it('exchanges a ticket via POST and calls handleCallbackToken with the returned pair', async () => {
    const mockHandleCallbackToken = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ accessToken: 'access-123', refreshToken: 'refresh-456' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    renderCallbackPage({ handleCallbackToken: mockHandleCallbackToken }, ['/auth/callback?ticket=ticket-abc'])

    await waitFor(() => {
      expect(mockHandleCallbackToken).toHaveBeenCalledWith('access-123', 'refresh-456')
    })
    // Exchange went to the ADR-specified endpoint with the ticket in the body
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/callback/exchange'),
      expect.objectContaining({ method: 'POST' })
    )
    const body = JSON.parse((fetchMock.mock.calls[0][1].body as string))
    expect(body.ticket).toBe('ticket-abc')
  })

  it('exchange failure navigates to login with a retryable error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Invalid or expired ticket' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const mockHandleCallbackToken = vi.fn()

    renderCallbackPage({ handleCallbackToken: mockHandleCallbackToken }, ['/auth/callback?ticket=dead-ticket'])

    await waitFor(() => {
      expect(screen.queryByText('Signing you in...')).not.toBeInTheDocument()
    })
    expect(mockHandleCallbackToken).not.toHaveBeenCalled()
  })

  it('network failure during exchange also lands on the error path', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    renderCallbackPage({}, ['/auth/callback?ticket=ticket-abc'])
    await waitFor(() => {
      expect(screen.queryByText('Signing you in...')).not.toBeInTheDocument()
    })
  })

  it('legacy ?token= URL is ignored — no storage write, no exchange (pins the breaking change)', async () => {
    const mockHandleCallbackToken = vi.fn()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderCallbackPage({ handleCallbackToken: mockHandleCallbackToken }, ['/auth/callback?token=test-token&refreshToken=refresh-123'])
    // Legacy URL: no ticket -> error path immediately
    expect(screen.queryByText('Signing you in...')).not.toBeInTheDocument()
    expect(mockHandleCallbackToken).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not call handleCallbackToken more than once (re-entry guard)', async () => {
    const mockHandleCallbackToken = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ accessToken: 'access-123', refreshToken: 'refresh-456' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = renderCallbackPage({ handleCallbackToken: mockHandleCallbackToken }, ['/auth/callback?ticket=ticket-abc'])

    await waitFor(() => {
      expect(mockHandleCallbackToken).toHaveBeenCalledOnce()
    })

    act(() => {
      result.rerender(
        <MemoryRouter initialEntries={['/auth/callback?ticket=ticket-abc']}>
          <AuthContext.Provider value={{ ...defaultAuthContext, handleCallbackToken: mockHandleCallbackToken }}>
            <AuthCallbackPage />
          </AuthContext.Provider>
        </MemoryRouter>
      )
    })

    expect(mockHandleCallbackToken).toHaveBeenCalledOnce()
  })
})

