import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePostcard } from './usePostcard'
import type { Address } from '../types/address'

function makeImage() {
  const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
  return { file, preview: 'data:image/jpeg;base64,xx' }
}

function fullAddress(overrides: Partial<Address> = {}): Address {
  return {
    firstName: 'Jane',
    lastName: 'Doe',
    addressLine1: '123 Main',
    addressLine2: '',
    city: 'Toronto',
    provinceOrState: 'ON',
    postalOrZip: 'M5V2T6',
    countryCode: 'CA',
    ...overrides,
  }
}

describe('usePostcard', () => {
  it('default state: image null, message empty, address null, isComplete false, countryCode unselected', () => {
    const { result } = renderHook(() => usePostcard())
    expect(result.current.image).toBeNull()
    expect(result.current.message).toBe('')
    expect(result.current.address).toBeNull()
    expect(result.current.isComplete).toBe(false)
    expect(result.current.countryCode).toBeNull()
  })

  it('setting image updates state', () => {
    const { result } = renderHook(() => usePostcard())
    const img = makeImage()
    act(() => {
      result.current.setImage(img)
    })
    expect(result.current.image).toEqual(img)
    expect(result.current.isComplete).toBe(false)
  })

  it('setting address with image+message completes the card', () => {
    const { result } = renderHook(() => usePostcard())
    act(() => {
      result.current.setImage(makeImage())
      result.current.setMessage('Hello')
      result.current.setAddress(fullAddress())
      result.current.setReturnAddress(fullAddress())
    })
    expect(result.current.isComplete).toBe(true)
  })

  it('isComplete requires all required address fields', () => {
    const { result } = renderHook(() => usePostcard())
    act(() => {
      result.current.setImage(makeImage())
      result.current.setMessage('Hi')
    })
    const requiredKeys: (keyof Address)[] = [
      'firstName',
      'lastName',
      'addressLine1',
      'city',
      'provinceOrState',
      'postalOrZip',
    ]
    for (const omit of requiredKeys) {
      const partial = fullAddress()
      ;(partial as Record<string, string>)[omit] = ''
      act(() => {
        result.current.setAddress(partial)
        result.current.setReturnAddress(fullAddress())
      })
      expect(result.current.isComplete).toBe(false)
    }
  })

  it('isComplete is false if message is whitespace only', () => {
    const { result } = renderHook(() => usePostcard())
    act(() => {
      result.current.setImage(makeImage())
      result.current.setMessage('   \n\t  ')
      result.current.setAddress(fullAddress())
      result.current.setReturnAddress(fullAddress())
    })
    expect(result.current.isComplete).toBe(false)
  })

  it('reset() clears everything back to defaults', () => {
    const { result } = renderHook(() => usePostcard())
    act(() => {
      result.current.setImage(makeImage())
      result.current.setMessage('Hello')
      result.current.setAddress(fullAddress())
      result.current.setReturnAddress(fullAddress())
    })
    act(() => {
      result.current.reset()
    })
    expect(result.current.image).toBeNull()
    expect(result.current.message).toBe('')
    expect(result.current.address).toBeNull()
    expect(result.current.returnAddress).toBeNull()
    expect(result.current.isComplete).toBe(false)
  })


  it('isComplete requires both image AND message (not just image)', () => {
    const { result } = renderHook(() => usePostcard())
    act(() => {
      result.current.setImage(makeImage())
      result.current.setMessage('')
      result.current.setAddress(fullAddress())
      result.current.setReturnAddress(fullAddress())
    })
    expect(result.current.isComplete).toBe(false)
  })

  it('countryCode defaults to unselected (no pre-chosen country)', () => {
    const { result } = renderHook(() => usePostcard())
    expect(result.current.countryCode).toBeNull()
  })

  it('setCountryCode updates countryCode', () => {
    const { result } = renderHook(() => usePostcard())
    act(() => {
      result.current.setCountryCode('CA')
    })
    expect(result.current.countryCode).toBe('CA')

    act(() => {
      result.current.setCountryCode('GB')
    })
    expect(result.current.countryCode).toBe('GB')

    act(() => {
      result.current.setCountryCode('US')
    })
    expect(result.current.countryCode).toBe('US')
  })


  it('reset() clears countryCode back to unselected', () => {
    const { result } = renderHook(() => usePostcard())
    act(() => {
      result.current.setCountryCode('GB')
    })
    expect(result.current.countryCode).toBe('GB')
    act(() => {
      result.current.reset()
    })
    expect(result.current.countryCode).toBeNull()
  })
})
