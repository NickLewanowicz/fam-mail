import { JWTService } from '../services/jwtService'
import { Database } from '../database'

/**
 * Request logging middleware that logs each request as structured JSON.
 *
 * Logs include:
 * - method: HTTP method (GET, POST, etc.)
 * - path: Request path (without query string to avoid logging sensitive data)
 * - status: HTTP status code
 * - duration_ms: Request processing time in milliseconds
 * - user_id: User ID if authenticated (extracted from JWT token)
 *
 * Sensitive data is NOT logged:
 * - Authorization headers are never included
 * - Query strings are stripped from paths
 * - Request bodies are never logged
 * - Passwords and tokens are excluded
 */

export interface RequestLogContext {
  method: string
  path: string
  status: number
  duration_ms: number
  user_id?: string
}

/**
 * Extract user ID from a JWT token in the Authorization header.
 * Returns undefined if no valid token is found or if user cannot be verified.
 */
async function extractUserId(
  req: Request,
  jwtService: JWTService,
  db: Database
): Promise<string | undefined> {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return undefined
    }

    const token = authHeader.substring(7)
    const payload = await jwtService.verifyToken(token)
    const userId = payload.sub as string

    // Verify the user actually exists
    const user = db.getUserById(userId)
    return user ? userId : undefined
  } catch {
    // If token is invalid or any error occurs, return undefined
    return undefined
  }
}

/**
 * Create a request logging wrapper function.
 *
 * @param handler - The original request handler function
 * @param jwtService - JWT service for token verification
 * @param db - Database for user verification
 * @returns A new handler function that logs requests before calling the original
 */
export function withRequestLogging(
  handler: (req: Request) => Promise<Response>,
  jwtService: JWTService,
  db: Database
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const startTime = performance.now()
    const url = new URL(req.url)

    try {
      const response = await handler(req)
      const endTime = performance.now()
      const durationMs = endTime - startTime

      const logContext: RequestLogContext = {
        method: req.method,
        path: url.pathname, // Intentionally exclude search/query string
        status: response.status,
        duration_ms: Math.round(durationMs),
      }

      // Try to extract user ID (non-blocking if it fails)
      try {
        const userId = await extractUserId(req, jwtService, db)
        if (userId) {
          logContext.user_id = userId
        }
      } catch {
        // Silently ignore errors in user ID extraction
      }

      // Log as JSON line to stdout
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(logContext))

      return response
    } catch (error) {
      const endTime = performance.now()
      const durationMs = endTime - startTime

      const logContext: RequestLogContext = {
        method: req.method,
        path: url.pathname,
        status: 500, // Unhandled errors result in 500
        duration_ms: Math.round(durationMs),
      }

      // Try to extract user ID even on errors
      try {
        const userId = await extractUserId(req, jwtService, db)
        if (userId) {
          logContext.user_id = userId
        }
      } catch {
        // Silently ignore errors in user ID extraction
      }

      // Log as JSON line to stdout
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(logContext))

      // Re-throw the error to be handled by Bun's default error handling
      throw error
    }
  }
}
