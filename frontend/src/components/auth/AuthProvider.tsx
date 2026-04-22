import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import type { User, AuthState } from '../../types/auth'
import {
  getToken,
  setToken,
  removeToken,
  getRefreshToken,
  setRefreshToken,
  clearAllTokens,
  initiateLogin,
  fetchCurrentUser,
  logoutUser,
  refreshAccessToken,
} from '../../services/authApi'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: getToken(),
    isLoading: true,
    isAuthenticated: false,
  })

  // Check for existing token on mount
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setState({ user: null, token: null, isLoading: false, isAuthenticated: false })
      return
    }

    fetchCurrentUser(token)
      .then((user: User) => {
        setState({ user, token, isLoading: false, isAuthenticated: true })
      })
      .catch(() => {
        // Access token might be expired — try refresh before logging out
        const storedRefresh = getRefreshToken()
        if (storedRefresh) {
          refreshAccessToken()
            .then(({ accessToken }) => fetchCurrentUser(accessToken)
              .then((user: User) => {
                setState({ user, token: accessToken, isLoading: false, isAuthenticated: true })
              })
            )
            .catch(() => {
              clearAllTokens()
              setState({ user: null, token: null, isLoading: false, isAuthenticated: false })
            })
        } else {
          removeToken()
          setState({ user: null, token: null, isLoading: false, isAuthenticated: false })
        }
      })
  }, [])

  // Method to handle tokens received from callback
  const handleCallbackToken = useCallback((token: string, refreshToken?: string) => {
    setToken(token)
    if (refreshToken) {
      setRefreshToken(refreshToken)
    }
    setState(prev => ({ ...prev, token, isLoading: true }))

    fetchCurrentUser(token)
      .then((user: User) => {
        setState({ user, token, isLoading: false, isAuthenticated: true })
      })
      .catch(() => {
        clearAllTokens()
        setState({ user: null, token: null, isLoading: false, isAuthenticated: false })
      })
  }, [])

  const login = useCallback(async () => {
    const result = await initiateLogin()
    if (result.type === 'dev-token' && result.accessToken) {
      handleCallbackToken(result.accessToken, result.refreshToken)
    } else if (result.authUrl) {
      window.location.href = result.authUrl
    }
  }, [handleCallbackToken])

  const logout = useCallback(async () => {
    const token = getToken()
    if (token) {
      try {
        await logoutUser(token)
      } catch {
        // Continue with local logout even if API call fails
      }
    }
    clearAllTokens()
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, handleCallbackToken }}>
      {children}
    </AuthContext.Provider>
  )
}
