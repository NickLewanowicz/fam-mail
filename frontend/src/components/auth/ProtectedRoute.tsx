import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200" data-theme="light">
        <div className="card w-full max-w-md bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <h2 className="text-xl font-semibold mt-4">Loading...</h2>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    window.location.href = '/login'
    return null
  }

  return <>{children}</>
}
