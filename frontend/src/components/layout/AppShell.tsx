import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../auth/AuthContext'
import { PostGridModeBadge } from './PostGridModeBadge'

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50" data-theme="fammail">
      <nav className="sticky top-0 z-50 bg-white border-b border-zinc-200">
        <div className="container mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-xl">✉️</span>
            <span className="text-base font-semibold text-zinc-900">Fam Mail</span>
          </Link>

          <div className="flex items-center gap-2">
            {user && <PostGridModeBadge />}
            <Link
              to="/create"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                location.pathname === '/create'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              New
            </Link>
            {user && (
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600 text-sm font-medium cursor-pointer hover:bg-zinc-300 transition-colors">
                  {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                </div>
                <ul tabIndex={0} className="menu menu-sm dropdown-content bg-white rounded-lg z-[1] mt-2 w-52 p-1.5 shadow-lg border border-zinc-200">
                  <li className="px-2 py-1.5 text-xs font-medium text-zinc-400">Account</li>
                  <li><span className="text-sm text-zinc-500 cursor-default">{user.email}</span></li>
                  <li className="mt-1"><button onClick={logout} className="text-sm text-red-600 hover:bg-red-50">Sign out</button></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="flex-1">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}
