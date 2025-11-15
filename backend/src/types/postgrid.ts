export interface PostGridAddress {
  firstName: string
  lastName: string
  addressLine1: string
  addressLine2?: string
  city: string
  provinceOrState: string
  postalOrZip: string
  countryCode: string
}

export interface PostGridPostcardRequest {
  to: PostGridAddress
  from?: PostGridAddress
  size?: '6x4' | '9x6' | '11x6'
  frontHTML?: string
  backHTML?: string
}

export interface PostGridPostcardResponse {
  id: string
  object: 'postcard'
  live: boolean
  to: PostGridAddress
  from: PostGridAddress
  url?: string
  frontTemplate?: string
  backTemplate?: string
  mergeVariables?: Record<string, unknown>
  size: string
  mailedDate?: string
  expectedDeliveryDate?: string
  status: 'ready' | 'rendered' | 'submitted' | 'processed' | 'delivered' | 'failed'
  carrier?: string
  trackingNumber?: string
  createdAt: string
  updatedAt: string
}

export interface PostGridError {
  status: number
  message: string
  error?: {
    type: string
    message: string
  }
}
