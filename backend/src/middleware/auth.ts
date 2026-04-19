import { JWTService } from '../services/jwtService'
import { Database } from '../database'
import type { User } from '../models/user'
import { jsonResponse } from '../utils/response'

export class AuthMiddleware {
  private jwtService: JWTService
  private db: Database

  constructor(jwtService: JWTService, db: Database) {
    this.jwtService = jwtService
    this.db = db
  }

  async authenticate(req: Request): Promise<{ user?: User; error?: string }> {
    const authHeader = req.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Missing or invalid authorization header' }
    }

    const token = authHeader.substring(7)

    try {
      const payload = await this.jwtService.verifyToken(token)
      const userId = payload.sub as string
      const user = this.db.getUserById(userId)

      if (!user) {
        return { error: 'User not found' }
      }

      return { user }
    } catch (error) {
      return { error: 'Invalid or expired token' }
    }
  }

  requireAuth(handler: (req: Request, user: User) => Promise<Response>) {
    return async (req: Request): Promise<Response> => {
      const { user, error } = await this.authenticate(req)

      if (error) {
        return jsonResponse({ error }, 401)
      }

      if (!user) {
        return jsonResponse({ error: 'User not found' }, 401)
      }

      return handler(req, user)
    }
  }
}
