import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import type { User } from '../models/user'

export interface JWTConfig {
  secret: string
  expiresIn: string
  refreshExpiresIn: string
}

export class JWTService {
  private secret: Uint8Array
  private expiresIn: string
  private refreshExpiresIn: string

  constructor(config: JWTConfig) {
    this.secret = new TextEncoder().encode(config.secret)
    this.expiresIn = config.expiresIn
    this.refreshExpiresIn = config.refreshExpiresIn
  }

  async generateAccessToken(user: User): Promise<string> {
    return await new SignJWT({ sub: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.expiresIn)
      .sign(this.secret)
  }

  async generateRefreshToken(user: User): Promise<string> {
    return await new SignJWT({ sub: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.refreshExpiresIn)
      .sign(this.secret)
  }

  async verifyToken(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.secret)
    return payload
  }

  async extractUserIdFromToken(token: string): Promise<string | null> {
    try {
      const payload = await this.verifyToken(token)
      return payload.sub as string
    } catch {
      return null
    }
  }
}
