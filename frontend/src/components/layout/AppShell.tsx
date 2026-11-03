import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../auth/AuthContext'
import { PostGridModeBadge } from './PostGridModeBadge'
import { VersionFooter } from './VersionFooter'

export function AppShell({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'editor' }) {
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
    <div
      data-editor={variant === 'editor' ? '' : undefined}
      className={
        variant === 'editor'
          ? 'min-h-dvh flex flex-col bg-ink-bg text-warm-text transition-colors'
          : 'min-h-dvh flex flex-col bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 transition-colors'
      }
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:top-2 focus:left-2 focus:px-3 focus:py-1.5 focus:rounded-md focus:bg-zinc-900 focus:text-white focus:text-sm"
      >
        Skip to content
      </a>
      <nav
        className={
          variant === 'editor'
            ? 'sticky top-0 z-50 bg-ink-surface/90 backdrop-blur border-b border-ink-line/60'
            : 'sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800'
        }
      >
        <div className="container mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 min-w-11 h-11 hover:opacity-80 transition-opacity" aria-label="Fam Mail home">
            <span className="text-xl" aria-hidden="true">✉️</span>
            {/* Wordmark hides below sm — the nav row must fit 320px viewports */}
            <span className={`text-base font-semibold whitespace-nowrap hidden sm:inline ${variant === "editor" ? "text-warm-text font-display tracking-tight" : "text-zinc-900"}`}>Fam Mail</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
              className={
                variant === 'editor'
                  ? 'h-11 w-11 inline-flex items-center justify-center rounded-md text-warm-text2 hover:text-warm-text hover:bg-white/5 transition-colors'
                  : 'h-11 w-11 inline-flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'
              }
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
                aria-current={location.pathname === '/history' ? 'page' : undefined}
                className={`inline-flex items-center h-11 px-2 sm:px-3 text-sm font-medium rounded-md transition-colors ${
                  location.pathname === '/history'
                    ? 'bg-clay text-ink-bg'
                    : variant === 'editor'
                    ? 'text-warm-text2 hover:text-warm-text hover:bg-white/5'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800'
                }`}
              >
                History
              </Link>
            )}
            {/* Mode badge hides on phones (nav row width); Review shows the same
                mode banner above Send, the surface where it matters */}
            {user && (
              <div className="hidden sm:flex items-center">
                <PostGridModeBadge />
              </div>
            )}
            <Link
              to="/create"
              aria-current={location.pathname === '/create' ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 h-11 px-2 sm:px-3 text-sm font-medium rounded-md transition-colors ${
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
                {/* 44px hit surface; the visual circle stays 32px */}
                <div tabIndex={0} role="button" aria-label="Account menu" className={`h-11 w-11 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                  variant === 'editor' ? 'hover:bg-white/5' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}>
                  <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600 text-sm font-medium">
                    {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                  </div>
                </div>
                <ul tabIndex={0} className="menu menu-sm dropdown-content bg-white rounded-lg z-[1] mt-2 w-52 p-1.5 shadow-lg border border-zinc-200">
                  <li className="px-2 py-1.5 text-xs font-medium text-zinc-500">Account</li>
                  <li><span className="text-sm text-zinc-500 cursor-default">{user.email}</span></li>
                  <li><button onClick={logout} className="text-sm text-red-600 hover:bg-red-50">Sign out</button></li>
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
      <VersionFooter tone={variant} />
    </div>
  )
}
