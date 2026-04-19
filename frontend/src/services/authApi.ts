import type { User } from '../types/auth'

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

export async function initiateLogin(): Promise<string> {
  const response = await fetch('/api/auth/login', {
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
  return data.authUrl as string
}

export async function fetchCurrentUser(token: string): Promise<User> {
  const response = await fetch('/api/auth/me', {
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
  const response = await fetch('/api/auth/logout', {
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

export { AuthApiError }
