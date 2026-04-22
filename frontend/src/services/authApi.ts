import type { User } from '../types/auth'
import { API_BASE_URL } from '../utils/apiConfig'

const TOKEN_KEY = 'fam_mail_token'

class AuthApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export interface LoginResult {
  type: 'redirect' | 'dev-token'
  authUrl?: string
  accessToken?: string
}

export async function initiateLogin(): Promise<LoginResult> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Login initiation failed' }))
    throw new AuthApiError(
      errorData.error || `Login failed with status ${response.status}`,
      response.status
    )
  }

  const data = await response.json()

  if (data.devMode && data.accessToken) {
    return { type: 'dev-token', accessToken: data.accessToken }
  }

  return { type: 'redirect', authUrl: data.authUrl as string }
}

export async function fetchCurrentUser(token: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new AuthApiError(
      'Failed to fetch user',
      response.status
    )
  }

  const data = await response.json()
  return data.user as User
}

export async function logoutUser(token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new AuthApiError(
      'Logout failed',
      response.status
    )
  }
}

/** Build standard JSON headers with Bearer token if available */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export { AuthApiError }
