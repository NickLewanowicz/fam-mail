import type { Address } from '../types/address'

export interface PostcardSubmission {
  to: Address
  frontHTML: string
  size: '4x6'
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
}

export async function submitPostcard(
  address: Address,
  imageFile: File
): Promise<PostcardResponse> {
  const imageBase64 = await fileToBase64(imageFile)
  
  const frontHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; }
          img { width: 100%; height: 100%; object-fit: cover; }
        </style>
      </head>
      <body>
        <img src="${imageBase64}" alt="Postcard" />
      </body>
    </html>
  `

  const submission: PostcardSubmission = {
    to: address,
    frontHTML,
    size: '4x6'
  }

  const response = await fetch('/api/postcards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
