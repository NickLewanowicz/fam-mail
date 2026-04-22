import type { Address } from '../types/address'
import { generateFrontHTML } from './postcardTemplate'
import { getAuthHeaders } from '../services/authApi'
import { API_BASE_URL } from './apiConfig'

export interface PostcardSubmission {
  to: Address
  from: Address
  frontHTML: string
  backHTML?: string
  message?: string
  size: '6x4'
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

export async function submitPostcard(
  address: Address,
  returnAddress: Address,
  imageFile: File,
  message?: string
): Promise<PostcardResponse> {
  const imageBase64 = await fileToBase64(imageFile)
  const frontHTML = generateFrontHTML(imageBase64)

  const submission: PostcardSubmission = {
    to: address,
    from: returnAddress,
    frontHTML,
    size: '6x4'
  }

  if (message) {
    submission.message = message
  }

  const headers = getAuthHeaders()

  const response = await fetch(`${API_BASE_URL}/api/postcards`, {
    method: 'POST',
    headers,
    body: JSON.stringify(submission),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to submit postcard')
  }

  return response.json()
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
