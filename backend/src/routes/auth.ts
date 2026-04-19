import { OIDCService } from '../services/oidcService'
import { JWTService } from '../services/jwtService'
import { AuthMiddleware } from '../middleware/auth'
import { Database } from '../database'
import type { User } from '../models/user'
import { jsonResponse, applyHeaders } from '../middleware/headers'

/** TTL-based state store for OIDC PKCE code verifiers.
 *  Entries expire after STATE_TTL_MS (10 min). Cleanup runs lazily on access
 *  and proactively via a periodic timer (every CLEANUP_INTERVAL_MS). */
const STATE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000 // 1 minute

interface StateEntry {
  codeVerifier: string
  createdAt: number
}

const oidcStateStore = new Map<string, StateEntry>()

/** Remove entries older than STATE_TTL_MS. */
function evictExpired(): void {
  const now = Date.now()
  for (const [key, entry] of oidcStateStore) {
    if (now - entry.createdAt > STATE_TTL_MS) {
      oidcStateStore.delete(key)
    }
  }
}

/** Proactive cleanup timer — ensures stale entries are evicted even when no requests arrive. */
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function startCleanupTimer(): void {
  if (cleanupTimer === null) {
    cleanupTimer = setInterval(evictExpired, CLEANUP_INTERVAL_MS)
    // Allow the process to exit even if the timer is still running
    if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
      cleanupTimer.unref()
    }
  }
}

/** Stop the cleanup timer. Useful for clean shutdown and testing. */
export function stopCleanupTimer(): void {
  if (cleanupTimer !== null) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
}

// Auto-start the cleanup timer when this module is imported
startCleanupTimer()

/** Exposed for testing only — not part of the public API. */
export function _clearStateStore(): void {
  oidcStateStore.clear()
}

/** Exposed for testing only — returns the number of entries in the store. */
export function _stateStoreSize(): number {
  return oidcStateStore.size
}

export function setupAuthRoutes(
  oidcService: OIDCService,
  jwtService: JWTService,
  authMiddleware: AuthMiddleware,
  db: Database
) {
  // Generate authorization URL
  async function handleAuthLogin(_req: Request): Promise<Response> {
    const state = crypto.randomUUID()
    const { authUrl, codeVerifier } = await oidcService.generateAuthUrl(state)

    oidcStateStore.set(state, { codeVerifier, createdAt: Date.now() })
    evictExpired()

    return jsonResponse({ authUrl, state }, 200, _req)
  }

  // Handle OIDC callback
  async function handleAuthCallback(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if (!code || !state) {
      return jsonResponse({ error: 'Missing code or state' }, 400, req)
    }

    evictExpired()
    const entry = oidcStateStore.get(state)

    if (!entry) {
      return jsonResponse({ error: 'Invalid or expired state' }, 400, req)
    }

    try {
      const { user } = await oidcService.handleCallback(code, entry.codeVerifier)

      const accessToken = await jwtService.generateAccessToken(user)
      const refreshToken = await jwtService.generateRefreshToken(user)

      db.insertSession({
        id: crypto.randomUUID(),
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })

      oidcStateStore.delete(state)

      const redirectUrl = `${new URL(req.url).origin}/auth/callback?token=${accessToken}`
      return applyHeaders(Response.redirect(redirectUrl), req)
    } catch (error) {
      console.error('OIDC callback error:', error)
      return jsonResponse({ error: 'Authentication failed' }, 500, req)
    }
  }

  // Get current user
  async function handleGetMe(req: Request, user: User): Promise<Response> {
    return jsonResponse({ user }, 200, req)
  }

  // Logout
  async function handleLogout(req: Request, _user: User): Promise<Response> {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.substring(7)

    if (token) {
      db.deleteSession(token)
    }

    return jsonResponse({ message: 'Logged out successfully' }, 200, req)
  }

  // Refresh access token using refresh token
  async function handleAuthRefresh(req: Request): Promise<Response> {
    try {
      const body = await req.json() as { refreshToken?: string }
      const { refreshToken } = body

      if (!refreshToken) {
        return jsonResponse({ error: 'Missing refresh token' }, 400, req)
      }

      // Verify the refresh token is valid and is actually a refresh token
      let payload: { sub?: string }
      try {
        payload = await jwtService.verifyRefreshToken(refreshToken)
      } catch {
        return jsonResponse({ error: 'Invalid or expired refresh token' }, 401, req)
      }

      const userId = payload.sub as string
      if (!userId) {
        return jsonResponse({ error: 'Invalid refresh token' }, 401, req)
      }

      // Look up the session by refresh token to ensure it exists
      const session = db.getSessionByRefreshToken(refreshToken)
      if (!session) {
        return jsonResponse({ error: 'Refresh token not found' }, 401, req)
      }

      // Verify the token belongs to the same user
      if (session.userId !== userId) {
        return jsonResponse({ error: 'Token mismatch' }, 401, req)
      }

      // Look up the user
      const user = db.getUserById(userId)
      if (!user) {
        return jsonResponse({ error: 'User not found' }, 401, req)
      }

      // Delete the old session (refresh token rotation)
      db.deleteSessionById(session.id)

      // Generate new token pair
      const newAccessToken = await jwtService.generateAccessToken(user)
      const newRefreshToken = await jwtService.generateRefreshToken(user)

      // Create new session
      db.insertSession({
        id: crypto.randomUUID(),
        userId: user.id,
        token: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })

      // Clean up expired sessions opportunistically
      db.deleteExpiredSessions()

      return jsonResponse({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      }, 200, req)
    } catch (error) {
      console.error('Token refresh error:', error)
      return jsonResponse({ error: 'Invalid request body' }, 400, req)
    }
  }

  return {
    handleAuthLogin,
    handleAuthCallback,
    handleGetMe: authMiddleware.requireAuth(handleGetMe),
    handleLogout: authMiddleware.requireAuth(handleLogout),
    handleAuthRefresh,
  }
}
