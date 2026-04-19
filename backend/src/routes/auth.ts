import { OIDCService } from '../services/oidcService'
import { JWTService } from '../services/jwtService'
import { AuthMiddleware } from '../middleware/auth'
import { Database } from '../database'
import type { User } from '../models/user'
import { jsonResponse } from '../utils/response'

// In-memory state store (use Redis in production)
const oidcStateStore = new Map<string, string>()

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

    oidcStateStore.set(state, codeVerifier)

    return jsonResponse({ authUrl, state })
  }

  // Handle OIDC callback
  async function handleAuthCallback(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if (!code || !state) {
      return jsonResponse({ error: 'Missing code or state' }, 400)
    }

    const codeVerifier = oidcStateStore.get(state)

    if (!codeVerifier) {
      return jsonResponse({ error: 'Invalid or expired state' }, 400)
    }

    try {
      const { user } = await oidcService.handleCallback(code, codeVerifier)

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
      return Response.redirect(redirectUrl)
    } catch (error) {
      console.error('OIDC callback error:', error)
      return jsonResponse({ error: 'Authentication failed' }, 500)
    }
  }

  // Get current user
  async function handleGetMe(req: Request, user: User): Promise<Response> {
    return jsonResponse({ user })
  }

  // Logout
  async function handleLogout(req: Request, _user: User): Promise<Response> {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.substring(7)

    if (token) {
      db.deleteSession(token)
    }

    return jsonResponse({ message: 'Logged out successfully' })
  }

  return {
    handleAuthLogin,
    handleAuthCallback,
    handleGetMe: authMiddleware.requireAuth(handleGetMe),
    handleLogout: authMiddleware.requireAuth(handleLogout),
  }
}
