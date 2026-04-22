import type { User } from '../types/auth'
import { API_BASE_URL } from '../utils/apiConfig'

const TOKEN_KEY = 'fam_mail_token'
const REFRESH_TOKEN_KEY = 'fam_mail_refresh_token'

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

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export function removeRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export interface LoginResult {
  type: 'redirect' | 'dev-token'
  authUrl?: string
  accessToken?: string
  refreshToken?: string
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
    return { type: 'dev-token', accessToken: data.accessToken, refreshToken: data.refreshToken }
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

/** Remove both access and refresh tokens from storage */
export function clearAllTokens(): void {
  removeToken()
  removeRefreshToken()
}

export interface RefreshResult {
  accessToken: string
  refreshToken: string
}

/** Attempt to refresh the access token using the stored refresh token.
 *  On success, stores the new token pair and returns them.
 *  On failure, clears all tokens and throws. */
export async function refreshAccessToken(): Promise<RefreshResult> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    clearAllTokens()
    throw new AuthApiError('No refresh token available', 401)
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  })

  if (!response.ok) {
    clearAllTokens()
    throw new AuthApiError('Token refresh failed', response.status)
  }

  const data = await response.json() as { accessToken: string; refreshToken: string }
  setToken(data.accessToken)
  setRefreshToken(data.refreshToken)
  return data
}

// ---- authFetch: 401 → refresh → retry wrapper ----

/** Custom event dispatched on `window` when a silent token refresh succeeds. */
export const TOKEN_REFRESHED_EVENT = 'fam-mail:token-refreshed'

/** Singleton promise used to coalesce concurrent refresh attempts. */
let pendingRefresh: Promise<RefreshResult> | null = null

/** Attempt a single refresh, reusing any in-flight refresh promise. */
function safeRefresh(): Promise<RefreshResult> {
  if (!pendingRefresh) {
    pendingRefresh = refreshAccessToken().finally(() => {
      pendingRefresh = null
    })
  }
  return pendingRefresh
}

/** Drop-in replacement for `fetch` that automatically retries once on 401
 *  by refreshing the access token. Public/unauthenticated endpoints should
 *  keep using raw `fetch`.
 *
 *  On successful refresh a `TOKEN_REFRESHED_EVENT` is dispatched on `window`
 *  so that React state (AuthProvider) can stay in sync. */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  // First attempt with current token
  const response = await fetch(input, init)

  if (response.status !== 401) {
    return response
  }

  // 401 — try to refresh the token
  try {
    const { accessToken } = await safeRefresh()

    // Notify any listeners (e.g. AuthProvider) that tokens changed
    window.dispatchEvent(new CustomEvent(TOKEN_REFRESHED_EVENT, { detail: { accessToken } }))

    // Clone the original init and update the Authorization header
    const retryInit: RequestInit = {
      ...init,
      headers: {
        ...(init?.headers instanceof Headers
          ? Object.fromEntries(init.headers.entries())
          : Array.isArray(init?.headers)
            ? Object.fromEntries(init.headers as [string, string][])
            : (init?.headers as Record<string, string> | undefined)),
        Authorization: `Bearer ${accessToken}`,
      },
    }

    return fetch(input, retryInit)
  } catch {
    // Refresh failed — return the original 401 response so the caller
    // can handle it (e.g. show an error, redirect to login)
    return response
  }
}

export { AuthApiError }
