import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from './AuthContext'

export function LoginPage() {
  const { login, isLoading, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const callbackError = searchParams.get('error')

  // Already signed in? Straight into the app.
  useEffect(() => {
    if (isAuthenticated) {
      navigate(searchParams.get('from') ?? '/', { replace: true })
    }
  }, [isAuthenticated, navigate, searchParams])

  const handleLogin = async () => {
    setError(null)
    try {
      await login()
      // Dev-token login resolves inline (the OIDC path redirects the whole
      // window from inside login()); bring the user into the app.
      navigate('/', { replace: true })
    } catch {
      setError('Failed to start login. Please try again.')
    }
  }

  const displayError = error || callbackError

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-bg">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm mx-4"
      >
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">✉️</div>
          <h1 className="text-xl font-semibold text-warm-text">Fam Mail</h1>
          <p className="text-warm-text2 text-sm mt-1">Send postcards to the people you love</p>
        </div>

        <div className="bg-ink-surface rounded-lg border border-ink-line p-6">
          {displayError && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-900/40 border border-red-700/50 text-red-300 text-sm mb-4">
              <span>{displayError}</span>
            </div>
          )}

          <button
            className="press active:scale-[0.97] w-full h-10 bg-clay text-ink-bg text-sm font-medium rounded-md hover:bg-clay-hover disabled:opacity-50"
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? 'Redirecting...' : 'Sign In'}
          </button>

          <p className="text-xs text-center text-warm-text3 mt-3">Secured with OAuth</p>
        </div>
      </motion.div>
    </div>
  )
}
