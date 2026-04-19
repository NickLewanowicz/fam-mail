import type { Draft, DraftList } from '../types/postcard'
import type { Address } from '../types/address'

export interface CreateDraftRequest {
  recipientAddress: Address
  senderAddress?: Address
  message?: string
  frontHTML?: string
  backHTML?: string
  imageData?: string
  imageMetadata?: {
    width: number
    height: number
    format: string
    quality: number
    sizeBytes: number
  }
  size?: '4x6' | '6x9' | '11x6'
}

export interface UpdateDraftRequest extends Partial<CreateDraftRequest> {
  state?: 'draft' | 'ready'
  scheduledFor?: string
}

class DraftApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'DraftApiError'
    this.status = status
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new DraftApiError(
      errorData.error || `Request failed with status ${response.status}`,
      response.status
    )
  }
  return response.json()
}

export async function listDrafts(state?: 'draft' | 'ready'): Promise<DraftList> {
  const params = state ? `?state=${state}` : ''
  const response = await fetch(`/api/drafts${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  return handleResponse<DraftList>(response)
}

export async function getDraft(id: string): Promise<{ draft: Draft }> {
  const response = await fetch(`/api/drafts/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  return handleResponse<{ draft: Draft }>(response)
}

export async function createDraft(data: CreateDraftRequest): Promise<{ draft: Draft }> {
  const response = await fetch('/api/drafts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  return handleResponse<{ draft: Draft }>(response)
}

export async function updateDraft(id: string, data: UpdateDraftRequest): Promise<{ draft: Draft }> {
  const response = await fetch(`/api/drafts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  return handleResponse<{ draft: Draft }>(response)
}

export async function deleteDraft(id: string): Promise<{ message: string }> {
  const response = await fetch(`/api/drafts/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  return handleResponse<{ message: string }>(response)
}

export async function publishDraft(id: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`/api/drafts/${id}/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  return handleResponse<{ success: boolean; message: string }>(response)
}

export { DraftApiError }
