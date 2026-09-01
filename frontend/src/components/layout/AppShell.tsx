import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../auth/AuthContext'
import { PostGridModeBadge } from './PostGridModeBadge'
import { VersionFooter } from './VersionFooter'

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    document.documentElement.dataset.theme = next ? 'fammail-dark' : 'fammail'
    try { localStorage.setItem('fam_mail_theme', next ? 'dark' : 'light') } catch { /* private mode */ }
  }
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 transition-colors">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:top-2 focus:left-2 focus:px-3 focus:py-1.5 focus:rounded-md focus:bg-zinc-900 focus:text-white focus:text-sm"
      >
        Skip to content
      </a>
      <nav className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-xl">✉️</span>
            <span className="text-base font-semibold text-zinc-900">Fam Mail</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
              className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {dark ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.06 1.06l1.06 1.06z" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z" clipRule="evenodd" /></svg>
              )}
            </button>
            {user && (
              <Link
                to="/history"
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  location.pathname === '/history'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800'
                }`}
              >
                History
              </Link>
            )}
            {user && <PostGridModeBadge />}
            <Link
              to="/create"
              aria-current={location.pathname === '/create' ? 'page' : undefined}
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
      <main id="main-content" className="flex-1">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </main>
      <VersionFooter />
    </div>
  )
}
