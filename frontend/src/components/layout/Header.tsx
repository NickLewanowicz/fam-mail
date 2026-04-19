import { useAuth } from '../auth/AuthContext'

interface HeaderProps {
  testMode?: boolean
}

export function Header({ testMode }: HeaderProps) {
  const { user, logout, isAuthenticated } = useAuth()

  return (
    <div className="bg-gradient-to-r from-primary to-secondary text-primary-content">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">📮 Fam Mail</h1>
            <p className="text-sm opacity-80">Send postcards to the people you love</p>
          </div>
          <div className="flex items-center gap-3">
            {testMode && (
              <div className="badge badge-warning gap-2">
                🧪 Test Mode
              </div>
            )}
            {isAuthenticated && user && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.email}
                  </p>
                </div>
                {user.avatarUrl && (
                  <div className="avatar">
                    <div className="w-8 h-8 rounded-full">
                      <img src={user.avatarUrl} alt={user.email} />
                    </div>
                  </div>
                )}
                <button
                  className="btn btn-ghost btn-sm text-primary-content"
                  onClick={logout}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
