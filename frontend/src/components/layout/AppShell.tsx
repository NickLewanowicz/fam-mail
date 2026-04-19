import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-base-200" data-theme="light">
      <div className="navbar bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg">
        <div className="flex-1">
          <Link to="/" className="text-xl font-bold tracking-tight flex items-center gap-2">
            <span className="text-2xl">&#x1F4EE;</span> Fam Mail
          </Link>
        </div>
        <div className="flex-none gap-2">
          <Link
            to="/create"
            className={`btn btn-sm ${location.pathname === '/create' ? 'btn-accent' : 'btn-ghost text-white border-white/30'}`}
          >
            New Postcard
          </Link>
          {user && (
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder">
                <div className="bg-white/20 text-white rounded-full w-10">
                  <span className="text-sm">{user.firstName?.[0] || user.email?.[0] || '?'}</span>
                </div>
              </div>
              <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow text-base-content">
                <li className="menu-title"><span>{user.email}</span></li>
                <li><button onClick={logout}>Sign out</button></li>
              </ul>
            </div>
          )}
        </div>
      </div>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
