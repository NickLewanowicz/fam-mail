import { getAuthHeaders, authFetch } from '../services/authApi'
import { throwApiError } from './apiError'
import { API_BASE_URL } from './apiConfig'

export type PostgridApiMode = 'test' | 'live' | 'mock'

export type PostcardSizePricing = Record<'6x4' | '9x6' | '11x6', number | null>

export interface PostgridStatusResponse {
  mode: PostgridApiMode
  mockMode: boolean
  /** ADR 0004: server-side price estimates; null when unset/invalid per size */
  pricing?: PostcardSizePricing
}

export async function fetchPostgridStatus(): Promise<PostgridStatusResponse> {
  const response = await authFetch(`${API_BASE_URL}/api/postgrid/status`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    await throwApiError(response, 'Request failed')
  }
  return response.json() as Promise<PostgridStatusResponse>
}

export async function setPostgridMode(mode: 'test' | 'live'): Promise<PostgridStatusResponse> {
  const response = await authFetch(`${API_BASE_URL}/api/postgrid/mode`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ mode }),
  })
  if (!response.ok) {
    await throwApiError(response, 'Request failed')
  }
  return response.json() as Promise<PostgridStatusResponse>
}
