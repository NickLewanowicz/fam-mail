import { useEffect, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { exchangeTicket } from '../../services/authApi'

export function AuthCallbackPage() {
  const { handleCallbackToken, isAuthenticated } = useAuth()
  const hasProcessed = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    if (hasProcessed.current) return

    const ticket = searchParams.get('ticket')
    const urlError = searchParams.get('error')

    if (urlError) {
      setError('Authentication failed. Please try again.')
      return
    }

    // ADR 0003 (#86): the callback delivers a one-time ticket — never
    // tokens. The ticket is exchanged via POST; the token pair never
    // touches a URL. Legacy ?token= params are ignored (pre-upgrade URLs).
    if (ticket) {
      hasProcessed.current = true
      void (async () => {
        try {
          const tokens = await exchangeTicket(ticket)
          handleCallbackToken(tokens.accessToken, tokens.refreshToken)
          // URL tidiness — no longer load-bearing (the ticket is dead)
          window.history.replaceState({}, '/', '/')
        } catch {
          // Unknown/expired/consumed ticket or exchange failure — a
          // retryable login, never a dead loop
          setError('Sign-in window expired or failed. Please try again.')
        }
      })()
      return
    }

    // No ticket and no error — redirect to login
    setError('No authentication token received.')
  }, [handleCallbackToken, searchParams])

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (error) {
    return <Navigate to={`/login?error=${encodeURIComponent(error)}`} replace />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-bg">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <h2 className="text-xl font-semibold mt-4">Signing you in...</h2>
          <p className="text-base-content/70">Please wait while we complete authentication.</p>
        </div>
      </div>
    </div>
  )
}
