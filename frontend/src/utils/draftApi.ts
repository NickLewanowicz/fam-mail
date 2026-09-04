import type { Address } from '../types/address'
import type { Draft } from '../types/postcard'
import { getAuthHeaders, authFetch } from '../services/authApi'
import { API_BASE_URL } from './apiConfig'

// ---- Request/Response types ----

export interface CreateDraftRequest {
  recipientAddress: Address
  senderAddress?: Address
  message?: string
  frontHTML?: string
  backHTML?: string
  imageData?: string
  imageMetadata?: unknown
  size?: '6x4' | '9x6' | '11x6'
}

export interface UpdateDraftRequest {
  recipientAddress?: Address
  senderAddress?: Address
  message?: string
  frontHTML?: string
  backHTML?: string
  imageData?: string
  imageMetadata?: unknown
  size?: '6x4' | '9x6' | '11x6'
  state?: 'draft' | 'ready'
}

export interface DraftListResponse {
  drafts: Draft[]
}

export interface DraftResponse {
  draft: Draft
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

const API_BASE = `${API_BASE_URL}/api/drafts`

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

/** List all drafts, optionally filtered by state */
export async function listDrafts(state?: 'draft' | 'ready'): Promise<Draft[]> {
  const url = state ? `${API_BASE}?state=${state}` : API_BASE
  const response = await authFetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })
  const data = await handleResponse<DraftListResponse>(response)
  return data.drafts
}

/** Get a single draft by ID */
export async function getDraft(id: string): Promise<Draft> {
  const response = await authFetch(`${API_BASE}/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })
  const data = await handleResponse<DraftResponse>(response)
  return data.draft
}

/** Create a new draft */
export async function createDraft(request: CreateDraftRequest): Promise<Draft> {
  const response = await authFetch(API_BASE, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  })
  const data = await handleResponse<DraftResponse>(response)
  return data.draft
}

/** Update an existing draft */
export async function updateDraft(id: string, request: UpdateDraftRequest): Promise<Draft> {
  const response = await authFetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  })
  const data = await handleResponse<DraftResponse>(response)
  return data.draft
}

/** Delete a draft */
export async function deleteDraft(id: string): Promise<void> {
  const response = await authFetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  await handleResponse<DeleteResponse>(response)
}


export async function scheduleDraft(id: string, scheduledFor: string): Promise<void> {
  const response = await authFetch(`${API_BASE}/${id}/schedule`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ scheduledFor }),
  })
  await handleResponse<{ message: string }>(response)
}


/** Download a draft as JSON — data portability for self-hosters. */
export function exportDraftJson(draft: Draft): void {
  const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fam-mail-draft-${draft.id.slice(0, 8)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
