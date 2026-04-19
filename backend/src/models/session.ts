export interface Session {
  id: string
  userId: string
  token: string
  refreshToken?: string
  expiresAt: string
  createdAt: string
}

export interface SessionRow {
  id: string
  user_id: string
  token: string
  refresh_token?: string
  expires_at: string
  created_at: string
}
