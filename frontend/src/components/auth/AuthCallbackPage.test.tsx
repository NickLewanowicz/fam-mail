import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
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
  initialEntries = ['/auth/callback?token=test-token']
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
  })

  it('shows loading spinner during authentication', () => {
    renderCallbackPage()
    expect(screen.getByText('Signing you in...')).toBeInTheDocument()
    expect(screen.getByText('Please wait while we complete authentication.')).toBeInTheDocument()
  })

  it('calls handleCallbackToken with token from URL', () => {
    const mockHandleCallbackToken = vi.fn()
    renderCallbackPage({ handleCallbackToken: mockHandleCallbackToken })
    expect(mockHandleCallbackToken).toHaveBeenCalledWith('test-token', undefined)
  })

  it('calls handleCallbackToken with token and refreshToken from URL', () => {
    const mockHandleCallbackToken = vi.fn()
    renderCallbackPage(
      { handleCallbackToken: mockHandleCallbackToken },
      ['/auth/callback?token=test-token&refreshToken=refresh-123']
    )
    expect(mockHandleCallbackToken).toHaveBeenCalledWith('test-token', 'refresh-123')
  })

  it('navigates to login when error param is present', () => {
    renderCallbackPage({}, ['/auth/callback?error=auth_failed'])
    // The component should redirect to login - handleCallbackToken should NOT be called
    expect(screen.queryByText('Signing you in...')).not.toBeInTheDocument()
  })

  it('navigates to login when no token or error present', () => {
    renderCallbackPage({}, ['/auth/callback'])
    expect(screen.queryByText('Signing you in...')).not.toBeInTheDocument()
  })

  it('does not call handleCallbackToken more than once', () => {
    const mockHandleCallbackToken = vi.fn()
    const result = renderCallbackPage({ handleCallbackToken: mockHandleCallbackToken })

    act(() => {
      result.rerender(
        <MemoryRouter initialEntries={['/auth/callback?token=test-token']}>
          <AuthContext.Provider value={{ ...defaultAuthContext, handleCallbackToken: mockHandleCallbackToken }}>
            <AuthCallbackPage />
          </AuthContext.Provider>
        </MemoryRouter>
      )
    })

    // Should still only be called once (due to hasProcessed ref)
    expect(mockHandleCallbackToken).toHaveBeenCalledOnce()
  })
})
