import type { Address } from '../types'

export interface Draft {
  id: string
  userId: string
  recipientAddress: Address
  senderAddress?: Address
  message?: string
  frontHTML?: string
  backHTML?: string
  imageData?: string
  imageMetadata?: ImageMetadata
  state: 'draft' | 'ready'
  scheduledFor?: string
  size: '6x4' | '9x6' | '11x6'
  createdAt: string
  updatedAt: string
}

export interface ImageMetadata {
  width: number
  height: number
  format: string
  quality: number
  sizeBytes: number
}

export interface DraftRow {
  id: string
  user_id: string
  recipient_address: string
  sender_address?: string
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
