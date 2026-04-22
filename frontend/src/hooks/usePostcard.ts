import { useState, useCallback } from 'react'
import type { Address } from '../types/address'
import type { CountryCode } from '../utils/postcardTemplate'

export interface PostcardImage {
  file: File
  preview: string
}

export interface PostcardState {
  image: PostcardImage | null
  message: string
  address: Address | null
  returnAddress: Address | null
  size: '6x4'
  countryCode: CountryCode
}

export function usePostcard(initial?: Partial<PostcardState>) {
  const [image, setImage] = useState<PostcardImage | null>(initial?.image ?? null)
  const [message, setMessage] = useState(initial?.message ?? '')
  const [address, setAddress] = useState<Address | null>(initial?.address ?? null)
  const [returnAddress, setReturnAddress] = useState<Address | null>(initial?.returnAddress ?? null)
  const [countryCode, setCountryCode] = useState<CountryCode>(initial?.countryCode ?? 'US')

  const reset = useCallback(() => {
    setImage(null)
    setMessage('')
    setAddress(null)
    setReturnAddress(null)
    setCountryCode('US')
  }, [])

  const isComplete = !!(image && message.trim() && address?.firstName && address?.lastName && address?.addressLine1 && address?.city && address?.provinceOrState && address?.postalOrZip && returnAddress?.firstName && returnAddress?.lastName && returnAddress?.addressLine1 && returnAddress?.city && returnAddress?.provinceOrState && returnAddress?.postalOrZip)

  const currentStep = image ? (message.trim() ? (address?.firstName ? 4 : 3) : 2) : 1

  return {
    image, setImage,
    message, setMessage,
    address, setAddress,
    returnAddress, setReturnAddress,
    countryCode, setCountryCode,
    isComplete,
    currentStep,
    reset,
  }
}

export type UsePostcardReturn = ReturnType<typeof usePostcard>
