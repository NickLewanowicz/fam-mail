import type { Address } from '../types/address'
import { generateFrontHTML } from './postcardTemplate'
import { getAuthHeaders, authFetch } from '../services/authApi'
import { API_BASE_URL } from './apiConfig'
import { fileToDataUrl } from './imageData'
import { throwApiError } from './apiError'

export interface PostcardSubmission {
  to: Address
  from: Address
  frontHTML: string
  backHTML?: string
  message?: string
  /** Bare base64 photo (no data: prefix) — lets the backend persist card
   *  content for the History "Again" flow (#120; the frontHTML already
   *  carries the same image as a data URL for printing). */
  image?: string
  size: '6x4' | '9x6' | '11x6'
}

export interface PostcardResponse {
  success: boolean
  postcard?: {
    id: string
    object: 'postcard'
    live: boolean
    to: Address
    from: Address
    url?: string
    frontTemplate?: string
    backTemplate?: string
    size: string
    mailedDate?: string
    expectedDeliveryDate?: string
    status: 'ready' | 'rendered' | 'submitted' | 'processed' | 'delivered' | 'failed'
    carrier?: string
    trackingNumber?: string
    createdAt: string
    updatedAt: string
  }
  testMode?: boolean
  error?: string
  details?: unknown
  selectedImage?: { file: File; preview: string }
}

export type { PostcardSize } from './postcardTemplate'
import type { PostcardSize } from './postcardTemplate'

export async function submitPostcard(
  address: Address,
  returnAddress: Address,
  imageFile: File,
  message?: string,
  size: PostcardSize = '6x4'
): Promise<PostcardResponse> {
  const imageDataUrl = await fileToDataUrl(imageFile)
  const frontHTML = generateFrontHTML(imageDataUrl)

  const submission: PostcardSubmission = {
    to: address,
    from: returnAddress,
    frontHTML,
    size
  }

  // #120: ship the raw photo so the backend persists it as card content
  // (History "Again") — bare base64, matching the backend's image contract
  // and the drafts pipeline. The data URL stays in frontHTML for printing.
  const rawBase64 = imageDataUrl.split(',')[1]
  if (rawBase64) {
    submission.image = rawBase64
  }

  if (message) {
    submission.message = message
  }

  const headers = getAuthHeaders()

  const response = await authFetch(`${API_BASE_URL}/api/postcards`, {
    method: 'POST',
    headers,
    body: JSON.stringify(submission),
  })

  if (!response.ok) {
    await throwApiError(response, 'Failed to submit postcard')
  }

  return response.json()
}



/** Structured recipient address — persisted by the backend since #109. */
export interface SentPostcardAddress {
  firstName?: string
  lastName?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  provinceOrState?: string
  postalOrZip?: string
  countryCode?: string
}

export interface SentPostcard {
  id: string
  postgridId?: string
  recipientName: string
  recipientAddress: string
  /** Structured address, present on cards sent after #109; older records omit it. */
  to?: SentPostcardAddress
  /** Card content (photo + message), present on cards sent after #114; older records omit it. */
  content?: {
    imageData?: string
    message?: string
  }
  status: string
  mode: 'test' | 'live' | string
  createdAt: string
}

/** List the signed-in user's sent postcards, newest first. */
export async function listSentPostcards(limit = 50): Promise<SentPostcard[]> {
  // #112: without getAuthHeaders() every History visit went out header-less,
  // triggering a doomed silent-refresh cycle on each load
  const response = await authFetch(`${API_BASE_URL}/api/postcards?limit=${limit}`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    await throwApiError(response, 'Failed to load postcards')
  }

  const body = (await response.json()) as { data: SentPostcard[] }
  return body.data
}


