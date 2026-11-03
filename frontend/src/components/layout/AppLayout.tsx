import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { AppShell } from './AppShell'
import { T } from '../../utils/motion'

/**
 * Layout route (mounted in main.tsx): owns the AppShell so the shell
 * persists across navigations, and animates route swaps — enter 200 ms,
 * exit 120 ms (D2). `initial={false}` means no fake transition on first
 * load / hard refresh. The editor variant is derived from the pathname:
 * /create and /drafts/:id run the wizard chrome; everything else uses the
 * default shell.
 *
 * Lazy routes suspend inside AnimatePresence: a first visit to a route
 * shows AppLoader and skips that route's exit — accepted per spec (R5
 * may eager-import the small pages if D9 allows).
 */
export function AppLayout() {
  const location = useLocation()
  const variant = location.pathname.startsWith('/create') || location.pathname.startsWith('/drafts/')
    ? 'editor' as const
    : 'default' as const
  return (
    <ProtectedRoute>
      <AppShell variant={variant}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: T.standard }}
            exit={{ opacity: 0, y: -6, transition: T.exit }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </AppShell>
    </ProtectedRoute>
  )
}
