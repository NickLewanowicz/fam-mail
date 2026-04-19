import { useState } from 'react'
import { useAuth } from './AuthContext'

export function LoginPage() {
  const { login, isLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    setError(null)
    try {
      await login()
    } catch {
      setError('Failed to start login. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200" data-theme="light">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <h1 className="text-4xl font-bold mb-2">📮 Fam Mail</h1>
          <p className="text-base-content/70 mb-6">
            Send postcards to the people you love
          </p>

          <div className="divider">Get Started</div>

          {error && (
            <div className="alert alert-error mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            className="btn btn-primary btn-lg w-full"
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Redirecting...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign in with OAuth
              </>
            )}
          </button>

          <p className="text-sm text-base-content/50 mt-4">
            Sign in to create and send postcards
          </p>
        </div>
      </div>
    </div>
  )
}
