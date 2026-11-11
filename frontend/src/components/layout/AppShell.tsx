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
  // M8: elevation is an opacity-animated pseudo-element shadow (transform/
  // opacity only) — flips on once the page scrolls past 4px
  const [elevated, setElevated] = useState(false)
  useEffect(() => {
    const onScroll = () => setElevated(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
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
      className="min-h-dvh flex flex-col bg-ink-bg text-warm-text transition-colors"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:top-2 focus:left-2 focus:px-3 focus:py-1.5 focus:rounded-md focus:bg-clay focus:text-ink-bg focus:text-sm"
      >
        Skip to content
      </a>
      <nav
        aria-label="Site"
        data-elevated={elevated ? 'true' : 'false'}
        className="sticky top-0 z-50 bg-ink-surface/90 backdrop-blur border-b border-ink-line/60 after:absolute after:inset-x-0 after:top-full after:h-4 after:shadow-[0_1px_3px_rgb(0_0_0/0.3)] after:opacity-0 after:transition-opacity after:duration-micro after:pointer-events-none data-[elevated=true]:after:opacity-100"
      >
        <div className="container mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 min-w-11 h-11 hover:opacity-80 transition-opacity" aria-label="Fam Mail home">
            <span className="text-xl" aria-hidden="true">✉️</span>
            {/* Wordmark hides below sm — the nav row must fit 320px viewports */}
            <span className="text-base font-semibold whitespace-nowrap hidden sm:inline text-warm-text font-display tracking-tight">Fam Mail</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            {user && (
              <Link
                to="/history"
                aria-current={location.pathname === '/history' ? 'page' : undefined}
                className={`hidden md:inline-flex items-center h-11 px-2 sm:px-3 text-sm font-medium rounded-md transition-colors ${
                  location.pathname === '/history'
                    ? 'bg-clay text-ink-bg'
                    : 'text-warm-text2 hover:text-warm-text hover:bg-white/5'
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
                  ? 'bg-clay text-ink-bg'
                  : 'text-warm-text2 hover:text-warm-text hover:bg-white/5'
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
                <div tabIndex={0} role="button" aria-label="Account menu" className="h-11 w-11 rounded-full flex items-center justify-center cursor-pointer transition-colors hover:bg-white/5">
                  <div className="w-8 h-8 rounded-full bg-ink-raised flex items-center justify-center text-warm-text text-sm font-medium">
                    {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                  </div>
                </div>
                <ul tabIndex={0} className="menu menu-sm dropdown-content bg-ink-raised rounded-lg z-[1] mt-2 w-52 p-1.5 shadow-lg border border-ink-line">
                  <li className="px-2 py-1.5 text-xs font-medium text-warm-text2">Account</li>
                  <li><span className="text-sm text-warm-text2 cursor-default">{user.email}</span></li>
                  {/* red-400 measured 4.19:1 on ink-raised (4.08 hover) — red-300
                      passes at 6.11/5.95 (June's spec: measure first) */}
                  <li><button onClick={logout} className="press text-sm text-red-300 hover:bg-red-900/30">Sign out</button></li>
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
          className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-ink-line bg-ink-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom,0px)]"
        >
          <div className="grid grid-cols-3 h-14">
            {TABS.map(({ to, label, Icon }) => {
              const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className="relative flex flex-col items-center justify-center gap-0.5 min-h-11 text-warm-text2 aria-[current=page]:text-warm-text transition-colors duration-micro ease-enter"
                >
                  {active && (
                    <motion.span
                      layoutId="tab-pill"
                      className="absolute inset-x-5 -top-px h-0.5 rounded-full bg-clay"
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
      <VersionFooter />
    </div>
  )
}
