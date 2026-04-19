import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import type { User } from '../models/user'

export interface JWTConfig {
  secret: string
  expiresIn: string
  refreshExpiresIn: string
}

/** JWT payload with a custom `typ` claim to distinguish token types. */
interface TokenPayload extends JWTPayload {
  typ?: 'access' | 'refresh'
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
    return await new SignJWT({ sub: user.id, typ: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.expiresIn)
      .sign(this.secret)
  }

  async generateRefreshToken(user: User): Promise<string> {
    return await new SignJWT({ sub: user.id, typ: 'refresh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.refreshExpiresIn)
      .setJti(crypto.randomUUID()) // Unique ID ensures each token is distinct even within the same second
      .sign(this.secret)
  }

  async verifyToken(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.secret)
    return payload
  }

  /**
   * Verifies a refresh token and returns its payload.
   * Rejects tokens that are not of type "refresh" (e.g. access tokens).
   * @throws {Error} If the token is invalid, expired, or not a refresh token
   */
  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    const { payload } = await jwtVerify(token, this.secret)
    const typed = payload as TokenPayload
    if (typed.typ !== 'refresh') {
      throw new Error('Not a refresh token')
    }
    return typed
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
