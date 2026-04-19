export interface User {
  id: string
  oidcSub: string
  oidcIssuer: string
  email: string
  emailVerified: boolean
  firstName?: string
  lastName?: string
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

export interface UserRow {
  id: string
  oidc_sub: string
  oidc_issuer: string
  email: string
  email_verified: number
  first_name?: string
  last_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}
