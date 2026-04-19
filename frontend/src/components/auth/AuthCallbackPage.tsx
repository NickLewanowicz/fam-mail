import { useEffect, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function AuthCallbackPage() {
  const { handleCallbackToken, isAuthenticated } = useAuth()
  const hasProcessed = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    if (hasProcessed.current) return

    const token = searchParams.get('token')
    const urlError = searchParams.get('error')

    if (urlError) {
      setError('Authentication failed. Please try again.')
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
    setError('No authentication token received.')
  }, [handleCallbackToken, searchParams])

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (error) {
    return <Navigate to={`/login?error=${encodeURIComponent(error)}`} replace />
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
