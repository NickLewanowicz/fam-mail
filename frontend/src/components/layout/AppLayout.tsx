import { Outlet, useLocation } from 'react-router-dom'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { AppShell } from './AppShell'

/**
 * Layout route (mounted in main.tsx): owns the AppShell so the shell
 * persists across navigations instead of remounting per page — the
 * prerequisite for route exit animations (June's spec, slice 2).
 * The editor variant is derived from the pathname: /create and /drafts/:id
 * run the wizard chrome; everything else uses the default shell.
 */
export function AppLayout() {
  const location = useLocation()
  const variant = location.pathname.startsWith('/create') || location.pathname.startsWith('/drafts/')
    ? 'editor' as const
    : 'default' as const
  return (
    <ProtectedRoute>
      <AppShell variant={variant}>
        <Outlet />
      </AppShell>
    </ProtectedRoute>
  )
}
