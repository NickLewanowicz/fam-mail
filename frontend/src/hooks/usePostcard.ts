import { useState, useCallback } from 'react'
import type { Address } from '../types/address'

export interface PostcardImage {
  file: File
  preview: string
}

export interface PostcardState {
  image: PostcardImage | null
  message: string
  address: Address | null
  size: '6x4'
}

export function usePostcard(initial?: Partial<PostcardState>) {
  const [image, setImage] = useState<PostcardImage | null>(initial?.image ?? null)
  const [message, setMessage] = useState(initial?.message ?? '')
  const [address, setAddress] = useState<Address | null>(initial?.address ?? null)

  const reset = useCallback(() => {
    setImage(null)
    setMessage('')
    setAddress(null)
  }, [])

  const isComplete = !!(image && message.trim() && address?.firstName && address?.lastName && address?.addressLine1 && address?.city && address?.provinceOrState && address?.postalOrZip)

  const currentStep = image ? (message.trim() ? (address?.firstName ? 4 : 3) : 2) : 1

  return {
    image, setImage,
    message, setMessage,
    address, setAddress,
    isComplete,
    currentStep,
    reset,
  }
}

export type UsePostcardReturn = ReturnType<typeof usePostcard>
