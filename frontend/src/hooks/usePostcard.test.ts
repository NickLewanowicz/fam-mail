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
  it('default state: image null, message empty, address null, isComplete false, currentStep 1', () => {
    const { result } = renderHook(() => usePostcard())
    expect(result.current.image).toBeNull()
    expect(result.current.message).toBe('')
    expect(result.current.address).toBeNull()
    expect(result.current.isComplete).toBe(false)
    expect(result.current.currentStep).toBe(1)
  })

  it('setting image updates state and moves currentStep to 2 when no message', () => {
    const { result } = renderHook(() => usePostcard())
    const img = makeImage()
    act(() => {
      result.current.setImage(img)
    })
    expect(result.current.image).toEqual(img)
    expect(result.current.currentStep).toBe(2)
    expect(result.current.isComplete).toBe(false)
  })

  it('setting message with image moves currentStep to 3', () => {
    const { result } = renderHook(() => usePostcard())
    act(() => {
      result.current.setImage(makeImage())
      result.current.setMessage('Hello')
    })
    expect(result.current.currentStep).toBe(3)
    expect(result.current.isComplete).toBe(false)
  })

  it('setting address with image+message moves currentStep to 4 and isComplete true', () => {
    const { result } = renderHook(() => usePostcard())
    act(() => {
      result.current.setImage(makeImage())
      result.current.setMessage('Hello')
      result.current.setAddress(fullAddress())
    })
    expect(result.current.currentStep).toBe(4)
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
    })
    expect(result.current.isComplete).toBe(false)
    expect(result.current.currentStep).toBe(2)
  })

  it('reset() clears everything back to defaults', () => {
    const { result } = renderHook(() => usePostcard())
    act(() => {
      result.current.setImage(makeImage())
      result.current.setMessage('Hello')
      result.current.setAddress(fullAddress())
    })
    act(() => {
      result.current.reset()
    })
    expect(result.current.image).toBeNull()
    expect(result.current.message).toBe('')
    expect(result.current.address).toBeNull()
    expect(result.current.isComplete).toBe(false)
    expect(result.current.currentStep).toBe(1)
  })

  it('initial values can be passed via initial parameter', () => {
    const img = makeImage()
    const addr = fullAddress({ firstName: 'Pat' })
    const { result } = renderHook(() =>
      usePostcard({
        image: img,
        message: 'Started',
        address: addr,
      }),
    )
    expect(result.current.image).toEqual(img)
    expect(result.current.message).toBe('Started')
    expect(result.current.address).toEqual(addr)
    expect(result.current.currentStep).toBe(4)
    expect(result.current.isComplete).toBe(true)
  })

  it('isComplete requires both image AND message (not just image)', () => {
    const { result } = renderHook(() => usePostcard())
    act(() => {
      result.current.setImage(makeImage())
      result.current.setMessage('')
      result.current.setAddress(fullAddress())
    })
    expect(result.current.isComplete).toBe(false)
  })
})
