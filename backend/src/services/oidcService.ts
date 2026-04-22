import * as client from 'openid-client'
import { Database } from '../database'
import type { User } from '../models/user'

export interface OIDCConfig {
  issuerUrl: string
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string
}

export class OIDCService {
  private config: client.Configuration | null = null
  private db: Database
  private configData: OIDCConfig

  constructor(configData: OIDCConfig, db: Database) {
    this.configData = configData
    this.db = db
  }

  async initialize(): Promise<void> {
    this.config = await client.discovery(
      new URL(this.configData.issuerUrl),
      this.configData.clientId,
      this.configData.clientSecret,
    )
  }

  async generateAuthUrl(state: string): Promise<{ authUrl: string; codeVerifier: string }> {
    if (!this.config) {
      throw new Error('OIDCService not initialized')
    }

    const codeVerifier = client.randomPKCECodeVerifier()
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)

    const parameters: Record<string, string> = {
      redirect_uri: this.configData.redirectUri,
      scope: this.configData.scopes,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    }

    if (!this.config.serverMetadata().supportsPKCE()) {
      parameters.state = state
    }

    const authUrl = client.buildAuthorizationUrl(this.config, parameters)

    return { authUrl: authUrl.href, codeVerifier }
  }

  async handleCallback(callbackParams: URLSearchParams, codeVerifier: string): Promise<{ user: User; tokens: client.TokenEndpointResponse }> {
    if (!this.config) {
      throw new Error('OIDCService not initialized')
    }

    // Reconstruct the callback URL the provider redirected to:
    // base from our configured redirect_uri + actual query params from the request.
    // This avoids hostname mismatches when running behind Docker/reverse proxy.
    const currentUrl = new URL(this.configData.redirectUri)
    for (const [key, value] of callbackParams) {
      currentUrl.searchParams.set(key, value)
    }

    const tokens = await client.authorizationCodeGrant(
      this.config,
      currentUrl,
      {
        pkceCodeVerifier: codeVerifier,
        expectedState: callbackParams.get('state') || undefined,
      }
    )

    const claims = tokens.claims()

    const userInfo: Record<string, unknown> = await client.fetchUserInfo(
      this.config,
      tokens.access_token,
      claims.sub
    )

    let user = this.db.getUserByOidc(userInfo.sub as string, this.configData.issuerUrl)

    if (!user) {
      user = {
        id: crypto.randomUUID(),
        oidcSub: userInfo.sub as string,
        oidcIssuer: this.configData.issuerUrl,
        email: userInfo.email as string,
        emailVerified: userInfo.email_verified === true,
        firstName: userInfo.given_name as string | undefined,
        lastName: userInfo.family_name as string | undefined,
        avatarUrl: userInfo.picture as string | undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      this.db.insertUser(user)
    } else {
      this.db.updateUser(user.id, {
        email: userInfo.email as string,
        emailVerified: userInfo.email_verified === true,
        firstName: userInfo.given_name as string | undefined,
        lastName: userInfo.family_name as string | undefined,
        avatarUrl: userInfo.picture as string | undefined,
        updatedAt: new Date().toISOString(),
      })
    }

    return { user, tokens }
  }
}
