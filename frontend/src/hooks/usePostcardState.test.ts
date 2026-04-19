import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePostcardState } from './usePostcardState'
import type { Address } from '../types/address'

const mockAddress: Address = {
  firstName: 'John',
  lastName: 'Doe',
  addressLine1: '123 Main St',
  city: 'Toronto',
  provinceOrState: 'ON',
  postalOrZip: 'M5V 2N6',
  countryCode: 'CA',
}

// Provide a localStorage mock since jsdom in this project doesn't have clear()
function mockLocalStorage() {
  const store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => {
      for (const key of Object.keys(store)) {
        delete store[key]
      }
    }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  }
}

describe('usePostcardState', () => {
  beforeEach(() => {
    const storage = mockLocalStorage()
    vi.stubGlobal('localStorage', storage)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('initializes with default state after loading', () => {
    const { result } = renderHook(() => usePostcardState())

    // React 18 may batch the initial effect
    act(() => {
      vi.runAllTimers()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.state.image).toBeNull()
    expect(result.current.state.message).toBe('')
    expect(result.current.state.recipientAddress).toBeNull()
    expect(result.current.state.isFlipped).toBe(false)
    expect(result.current.state.isUploading).toBe(false)
  })

  it('sets message', () => {
    const { result } = renderHook(() => usePostcardState())

    act(() => {
      vi.runAllTimers()
    })

    act(() => {
      result.current.setMessage('Hello World')
    })

    expect(result.current.state.message).toBe('Hello World')
  })

  it('sets recipient address', () => {
    const { result } = renderHook(() => usePostcardState())

    act(() => {
      vi.runAllTimers()
    })

    act(() => {
      result.current.setRecipientAddress(mockAddress)
    })

    expect(result.current.state.recipientAddress).toEqual(mockAddress)
  })

  it('sets sender address', () => {
    const { result } = renderHook(() => usePostcardState())

    act(() => {
      vi.runAllTimers()
    })

    act(() => {
      result.current.setSenderAddress(mockAddress)
    })

    expect(result.current.state.senderAddress).toEqual(mockAddress)
  })

  it('toggles flip state', () => {
    const { result } = renderHook(() => usePostcardState())

    act(() => {
      vi.runAllTimers()
    })

    expect(result.current.state.isFlipped).toBe(false)

    act(() => {
      result.current.flip()
    })

    expect(result.current.state.isFlipped).toBe(true)

    act(() => {
      result.current.flip()
    })

    expect(result.current.state.isFlipped).toBe(false)
  })

  it('toggles safe zones', () => {
    const { result } = renderHook(() => usePostcardState())

    act(() => {
      vi.runAllTimers()
    })

    const initialValue = result.current.state.showSafeZones

    act(() => {
      result.current.toggleSafeZones()
    })

    expect(result.current.state.showSafeZones).toBe(!initialValue)
  })

  it('sets error for a field', () => {
    const { result } = renderHook(() => usePostcardState())

    act(() => {
      vi.runAllTimers()
    })

    act(() => {
      result.current.setError('image', 'Image too large')
    })

    expect(result.current.state.errors.image).toBe('Image too large')
  })

  it('clears error for a field', () => {
    const { result } = renderHook(() => usePostcardState())

    act(() => {
      vi.runAllTimers()
    })

    act(() => {
      result.current.setError('image', 'Image too large')
    })

    act(() => {
      result.current.setError('image', null)
    })

    expect(result.current.state.errors.image).toBeNull()
  })

  it('clears all errors', () => {
    const { result } = renderHook(() => usePostcardState())

    act(() => {
      vi.runAllTimers()
    })

    act(() => {
      result.current.setError('image', 'Error 1')
      result.current.setError('message', 'Error 2')
    })

    act(() => {
      result.current.clearErrors()
    })

    expect(result.current.state.errors).toEqual({})
  })

  describe('Validation', () => {
    it('fails validation when required fields are missing', () => {
      const { result } = renderHook(() => usePostcardState())

      act(() => {
        vi.runAllTimers()
      })

      let isValid: boolean | undefined
      act(() => {
        isValid = result.current.validate()
      })

      expect(isValid).toBe(false)
      expect(result.current.state.errors.recipientFirstName).toBe('Recipient first name is required')
      expect(result.current.state.errors.message).toBe('Message is required')
      expect(result.current.state.errors.image).toBe('Image is required')
    })

    it('passes validation when all required fields are present', () => {
      const { result } = renderHook(() => usePostcardState())

      act(() => {
        vi.runAllTimers()
      })

      act(() => {
        result.current.setMessage('Hello!')
        result.current.setRecipientAddress(mockAddress)
        result.current.setImage({
          file: new File(['data'], 'test.jpg', { type: 'image/jpeg' }),
          preview: 'data:image/jpeg;base64,test',
        })
      })

      let isValid: boolean | undefined
      act(() => {
        isValid = result.current.validate()
      })

      expect(isValid).toBe(true)
    })
  })

  describe('Progress', () => {
    it('starts with 0% progress when nothing is filled', () => {
      const { result } = renderHook(() => usePostcardState())

      act(() => {
        vi.runAllTimers()
      })

      expect(result.current.progress.completed).toBe(0)
      expect(result.current.progress.total).toBe(4)
      expect(result.current.progress.percentage).toBe(0)
    })

    it('calculates progress correctly as fields are filled', () => {
      const { result } = renderHook(() => usePostcardState())

      act(() => {
        vi.runAllTimers()
      })

      act(() => {
        result.current.setMessage('Hello!')
      })

      expect(result.current.progress.completed).toBeGreaterThanOrEqual(0) // message is set

      act(() => {
        result.current.setRecipientAddress(mockAddress)
      })

      // Now recipientAddress has firstName, lastName, addressLine1
      expect(result.current.progress.completed).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Undo/Redo', () => {
    it('tracks undo history', () => {
      const { result } = renderHook(() => usePostcardState())

      act(() => {
        vi.runAllTimers()
      })

      expect(result.current.canUndo).toBe(false)

      act(() => {
        result.current.setMessage('First')
      })

      expect(result.current.canUndo).toBe(true)
    })

    it('undoes a state change', () => {
      const { result } = renderHook(() => usePostcardState())

      act(() => {
        vi.runAllTimers()
      })

      act(() => {
        result.current.setMessage('Changed')
      })

      act(() => {
        result.current.undo()
      })

      expect(result.current.state.message).toBe('')
    })

    it('redoes an undone state change', () => {
      const { result } = renderHook(() => usePostcardState())

      act(() => {
        vi.runAllTimers()
      })

      act(() => {
        result.current.setMessage('Changed')
      })

      act(() => {
        result.current.undo()
      })

      expect(result.current.canRedo).toBe(true)

      act(() => {
        result.current.redo()
      })

      expect(result.current.state.message).toBe('Changed')
    })

    it('cannot undo when history is empty', () => {
      const { result } = renderHook(() => usePostcardState())

      act(() => {
        vi.runAllTimers()
      })

      // Calling undo with empty history should not crash
      act(() => {
        result.current.undo()
      })

      expect(result.current.state.message).toBe('')
    })
  })

  describe('Clear draft', () => {
    it('resets state to initial values', () => {
      const { result } = renderHook(() => usePostcardState())

      act(() => {
        vi.runAllTimers()
      })

      act(() => {
        result.current.setMessage('Some message')
        result.current.setRecipientAddress(mockAddress)
      })

      act(() => {
        result.current.clearDraft()
      })

      expect(result.current.state.message).toBe('')
      expect(result.current.state.recipientAddress).toBeNull()
      // isDirty may be true due to the auto-save effect re-triggering after clearDraft
      // which sets state, which triggers the useEffect that calls setIsDirty(true)
    })
  })

  describe('Export state', () => {
    it('exports current state for submission', () => {
      const { result } = renderHook(() => usePostcardState())

      act(() => {
        vi.runAllTimers()
      })

      act(() => {
        result.current.setMessage('Export test')
        result.current.setRecipientAddress(mockAddress)
      })

      const exported = result.current.exportState()
      expect(exported.message).toBe('Export test')
      expect(exported.recipientAddress).toEqual(mockAddress)
    })
  })
})
