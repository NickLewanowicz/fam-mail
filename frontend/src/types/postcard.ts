import type { Address } from './address'

export interface PostcardSubmission {
  to: Address
  from: Address
  frontHTML?: string
  backHTML?: string
  message?: string
  size?: '6x4'
}

export interface PostcardResponse {
  success: boolean
  postcard?: {
    id: string
    status: string
    size: string
    live: boolean
    testMode: boolean
    url?: string
    mailedDate?: string
    expectedDeliveryDate?: string
  }
  error?: string
  details?: unknown
  selectedImage?: string
}

export interface Draft {
  id: string
  userId: string
  recipientAddress: Address
  senderAddress?: Address
  message?: string
  frontHTML?: string
  backHTML?: string
  imageData?: string
  imageMetadata?: unknown
  state: 'draft' | 'ready'
  scheduledFor?: string
  size: '6x4' | '9x6' | '11x6'
  createdAt: string
  updatedAt: string
}

export interface DraftList {
  drafts: Draft[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface DraftRow {
  id: string
  user_id: string
  recipient_address: string
  sender_address: string
  message?: string
  front_html?: string
  back_html?: string
  image_data?: string
  image_metadata?: string
  state: string
  scheduled_for?: string
  size: string
  created_at: string
  updated_at: string
}

export interface ImageMetadata {
  width: number
  height: number
  format: string
  quality: number
  sizeBytes: number
}

export interface User {
  id: string
  oidcSub: string
  oidcIssuer: string
  email: string
  emailVerified: boolean
  firstName?: string
  lastName?: string
  avatarUrl?: string
  createdAt: string
  updated_at: string
}

export interface Session {
  id: string
  userId: string
  token: string
  refreshToken?: string
  expiresAt: string
  createdAt: string
}

export interface PostcardList {
  postcards: Postcard[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface Postcard {
  id: string
  userId: string
  emailMessageId?: string
  senderEmail: string
  recipientName: string
  recipientAddress: string
  postgridPostcardId?: string
  postgridMode: 'test' | 'live'
  forcedTestMode: boolean
  status: 'draft' | 'processing' | 'sent' | 'delivered' | 'failed' | 'returned'
  errorMessage?: string
  scheduledFor?: string
  createdAt: string
  updatedAt: string
}
