import { useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'

export function AuthCallbackPage() {
  const { handleCallbackToken, isAuthenticated } = useAuth()
  const hasProcessed = useRef(false)

  useEffect(() => {
    if (hasProcessed.current) return

    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const error = params.get('error')

    if (error) {
      window.location.href = '/login?error=auth_failed'
      return
    }

    if (token) {
      hasProcessed.current = true
      handleCallbackToken(token)
      // Clean up URL
      window.history.replaceState({}, '/', '/')
      return
    }

    // No token and no error — redirect to login
    window.location.href = '/login'
  }, [handleCallbackToken])

  if (isAuthenticated) {
    window.location.href = '/'
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200" data-theme="light">
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
