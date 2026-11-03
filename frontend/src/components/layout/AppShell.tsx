import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { T } from '../../utils/motion'
import { useAuth } from '../auth/AuthContext'
import { PostGridModeBadge } from './PostGridModeBadge'
import { VersionFooter } from './VersionFooter'

/** M4 tab bar icons — inline, theme-currentColor, no new deps */
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
    </svg>
  )
}
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

const TABS = [
  { to: '/', label: 'Home', Icon: HomeIcon },
  { to: '/create', label: 'Create', Icon: PlusIcon },
  { to: '/history', label: 'History', Icon: ClockIcon },
] as const

export function AppShell({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'editor' }) {
  const { user, logout } = useAuth()
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  // M8: elevation is an opacity-animated pseudo-element shadow (transform/
  // opacity only) — flips on once the page scrolls past 4px
  const [elevated, setElevated] = useState(false)
  useEffect(() => {
    const onScroll = () => setElevated(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    document.documentElement.dataset.theme = next ? 'fammail-dark' : 'fammail'
    try { localStorage.setItem('fam_mail_theme', next ? 'dark' : 'light') } catch { /* private mode */ }
  }
  const location = useLocation()

  // The shell now persists across navigations (layout route), so it owns
  // scroll restoration: reset to top on every route change. No intra-page
  // anchors exist, so back-nav-to-top is acceptable (June's spec, slice 2).
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

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
        aria-label="Site"
        data-elevated={elevated ? 'true' : 'false'}
        className={
          variant === 'editor'
            ? 'sticky top-0 z-50 bg-ink-surface/90 backdrop-blur border-b border-ink-line/60 after:absolute after:inset-x-0 after:top-full after:h-4 after:shadow-[0_1px_3px_rgb(0_0_0/0.3)] after:opacity-0 after:transition-opacity after:duration-micro after:pointer-events-none data-[elevated=true]:after:opacity-100'
            : 'sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 after:absolute after:inset-x-0 after:top-full after:h-4 after:shadow-[0_1px_3px_rgb(0_0_0/0.08)] after:opacity-0 after:transition-opacity after:duration-micro after:pointer-events-none data-[elevated=true]:after:opacity-100'
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
                  ? 'press h-11 w-11 inline-flex items-center justify-center rounded-md text-warm-text2 hover:text-warm-text hover:bg-white/5'
                  : 'press h-11 w-11 inline-flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
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
                className={`hidden md:inline-flex items-center h-11 px-2 sm:px-3 text-sm font-medium rounded-md transition-colors ${
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
              className={`hidden md:inline-flex items-center gap-1.5 h-11 px-2 sm:px-3 text-sm font-medium rounded-md transition-colors ${
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
                  <li><button onClick={logout} className="press text-sm text-red-600 hover:bg-red-50">Sign out</button></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main
        id="main-content"
        className={
          variant === 'editor'
            ? 'flex-1'
            // M4: phones scroll under the tab bar (h-14) — clear it plus the
            // device safe area; md+ has no tab bar
            : 'flex-1 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-8'
        }
      >
        {children}
      </main>
      {variant === 'default' && (
        <nav
          aria-label="Primary"
          className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur pb-[env(safe-area-inset-bottom,0px)]"
        >
          <div className="grid grid-cols-3 h-14">
            {TABS.map(({ to, label, Icon }) => {
              const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className="relative flex flex-col items-center justify-center gap-0.5 min-h-11 text-zinc-500 aria-[current=page]:text-zinc-900 dark:aria-[current=page]:text-white transition-colors duration-micro ease-enter"
                >
                  {active && (
                    <motion.span
                      layoutId="tab-pill"
                      className="absolute inset-x-5 -top-px h-0.5 rounded-full bg-zinc-900 dark:bg-white"
                      transition={T.micro}
                    />
                  )}
                  <Icon className="w-6 h-6" />
                  <span className="text-[11px]">{label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
      <VersionFooter tone={variant} />
    </div>
  )
}
