import type { Address } from '../types/address'
import type { Draft } from '../types/postcard'

// ---- Request/Response types ----

export interface CreateDraftRequest {
  recipientAddress: Address
  senderAddress?: Address
  message?: string
  frontHTML?: string
  backHTML?: string
  imageData?: string
  imageMetadata?: unknown
  size?: '4x6' | '6x9' | '11x6'
}

export interface UpdateDraftRequest {
  recipientAddress?: Address
  senderAddress?: Address
  message?: string
  frontHTML?: string
  backHTML?: string
  imageData?: string
  imageMetadata?: unknown
  size?: '4x6' | '6x9' | '11x6'
  state?: 'draft' | 'ready'
}

export interface DraftListResponse {
  drafts: Draft[]
}

export interface DraftResponse {
  draft: Draft
}

export interface PublishResponse {
  success: boolean
  message: string
}

export interface DeleteResponse {
  message: string
}

// ---- Error handling ----

class DraftApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'DraftApiError'
    this.status = status
  }
}

// ---- API functions ----

const API_BASE = '/api/drafts'

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new DraftApiError(
      data.error || `Request failed with status ${response.status}`,
      response.status,
    )
  }
  return response.json()
}

/** Get auth token from localStorage */
function getAuthToken(): string | null {
  try {
    const session = localStorage.getItem('fam-mail-session')
    if (session) {
      const parsed = JSON.parse(session)
      return parsed.token || null
    }
  } catch {
    // Session not found or invalid JSON
  }
  return null
}

/** Build headers with auth token */
function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const token = getAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/** List all drafts, optionally filtered by state */
export async function listDrafts(state?: 'draft' | 'ready'): Promise<Draft[]> {
  const url = state ? `${API_BASE}?state=${state}` : API_BASE
  const response = await fetch(url, {
    method: 'GET',
    headers: authHeaders(),
  })
  const data = await handleResponse<DraftListResponse>(response)
  return data.drafts
}

/** Get a single draft by ID */
export async function getDraft(id: string): Promise<Draft> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'GET',
    headers: authHeaders(),
  })
  const data = await handleResponse<DraftResponse>(response)
  return data.draft
}

/** Create a new draft */
export async function createDraft(request: CreateDraftRequest): Promise<Draft> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(request),
  })
  const data = await handleResponse<DraftResponse>(response)
  return data.draft
}

/** Update an existing draft */
export async function updateDraft(id: string, request: UpdateDraftRequest): Promise<Draft> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(request),
  })
  const data = await handleResponse<DraftResponse>(response)
  return data.draft
}

/** Delete a draft */
export async function deleteDraft(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  await handleResponse<DeleteResponse>(response)
}

/** Publish a draft (mark as ready to send) */
export async function publishDraft(id: string): Promise<PublishResponse> {
  const response = await fetch(`${API_BASE}/${id}/publish`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return handleResponse<PublishResponse>(response)
}

export { DraftApiError }
