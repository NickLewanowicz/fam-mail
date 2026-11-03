import { useState, useCallback } from 'react'
import type { Address } from '../types/address'
import type { CountryCode } from '../utils/postcardTemplate'

export interface PostcardImage {
  file: File
  preview: string
}

export type { PostcardSize } from '../utils/postcardTemplate'
import type { PostcardSize } from '../utils/postcardTemplate'

export interface PostcardState {
  image: PostcardImage | null
  message: string
  address: Address | null
  returnAddress: Address | null
  size: PostcardSize
  countryCode: CountryCode
}

export function usePostcard() {
  const [image, setImage] = useState<PostcardImage | null>(null)
  const [message, setMessage] = useState('')
  const [address, setAddress] = useState<Address | null>(null)
  const [returnAddress, setReturnAddress] = useState<Address | null>(null)
  const [size, setSize] = useState<PostcardSize>('6x4')
  const [countryCode, setCountryCode] = useState<CountryCode | null>(null)

  const reset = useCallback(() => {
    setImage(null)
    setMessage('')
    setAddress(null)
    setReturnAddress(null)
    setSize('6x4')
    setCountryCode(null)
  }, [])

  const isComplete = !!(image && message.trim() && address?.firstName && address?.lastName && address?.addressLine1 && address?.city && address?.provinceOrState && address?.postalOrZip && returnAddress?.firstName && returnAddress?.lastName && returnAddress?.addressLine1 && returnAddress?.city && returnAddress?.provinceOrState && returnAddress?.postalOrZip)


  return {
    image, setImage,
    message, setMessage,
    address, setAddress,
    returnAddress, setReturnAddress,
    size, setSize,
    countryCode, setCountryCode,
    isComplete,
    reset,
  }
}

export type UsePostcardReturn = ReturnType<typeof usePostcard>
