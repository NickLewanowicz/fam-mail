import { getAuthHeaders } from '../services/authApi'
import { API_BASE_URL } from './apiConfig'

export type PostgridApiMode = 'test' | 'live' | 'mock'

export interface PostgridStatusResponse {
  mode: PostgridApiMode
  mockMode: boolean
}

export async function fetchPostgridStatus(): Promise<PostgridStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/postgrid/status`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || `Request failed (${response.status})`)
  }
  return response.json() as Promise<PostgridStatusResponse>
}

export async function setPostgridMode(mode: 'test' | 'live'): Promise<PostgridStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/postgrid/mode`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ mode }),
  })
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || `Request failed (${response.status})`)
  }
  return response.json() as Promise<PostgridStatusResponse>
}
