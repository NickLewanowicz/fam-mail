import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorageDraft } from './useLocalStorageDraft'

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

describe('useLocalStorageDraft', () => {
  let storage: ReturnType<typeof mockLocalStorage>

  beforeEach(() => {
    storage = mockLocalStorage()
    vi.stubGlobal('localStorage', storage)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('finishes loading after mount', () => {
    const { result } = renderHook(() =>
      useLocalStorageDraft({ key: 'test1', defaultValue: { name: 'initial' } })
    )

    // React 18 may batch the initial effect, so isLoading could be true or false
    // depending on timing. What matters is it settles to false after timers run.
    act(() => {
      vi.runAllTimers()
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('loads default value when localStorage is empty', () => {
    const { result } = renderHook(() =>
      useLocalStorageDraft({ key: 'test2', defaultValue: { name: 'initial' }, debounceMs: 100 })
    )

    act(() => {
      vi.runAllTimers()
    })

    expect(result.current.value).toEqual({ name: 'initial' })
    expect(result.current.isLoading).toBe(false)
  })

  it('loads value from localStorage when present', () => {
    storage.setItem('existing-key', JSON.stringify({ name: 'stored' }))

    const { result } = renderHook(() =>
      useLocalStorageDraft({ key: 'existing-key', defaultValue: { name: 'initial' }, debounceMs: 100 })
    )

    act(() => {
      vi.runAllTimers()
    })

    expect(result.current.value).toEqual({ name: 'stored' })
  })

  it('updates value when updateValue is called', () => {
    const { result } = renderHook(() =>
      useLocalStorageDraft({ key: 'test3', defaultValue: { name: 'initial' }, debounceMs: 100 })
    )

    act(() => {
      vi.runAllTimers()
    })

    act(() => {
      result.current.setValue({ name: 'updated' })
    })

    expect(result.current.value).toEqual({ name: 'updated' })
  })

  it('marks isDirty when value is updated', () => {
    const { result } = renderHook(() =>
      useLocalStorageDraft({ key: 'test4', defaultValue: { name: 'initial' }, debounceMs: 100 })
    )

    act(() => {
      vi.runAllTimers()
    })

    act(() => {
      result.current.setValue({ name: 'updated' })
    })

    expect(result.current.isDirty).toBe(true)
  })

  it('saves to localStorage after debounce', () => {
    const { result } = renderHook(() =>
      useLocalStorageDraft({ key: 'test5', defaultValue: { name: 'initial' }, debounceMs: 50 })
    )

    act(() => {
      vi.runAllTimers()
    })

    act(() => {
      result.current.setValue({ name: 'updated' })
    })

    // Not saved yet
    expect(storage.getItem('test5')).toBeNull()

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(storage.setItem).toHaveBeenCalledWith('test5', JSON.stringify({ name: 'updated' }))
  })

  it('clears draft from localStorage', () => {
    storage.setItem('clear-key', JSON.stringify({ name: 'stored' }))

    const { result } = renderHook(() =>
      useLocalStorageDraft({ key: 'clear-key', defaultValue: { name: 'default' }, debounceMs: 100 })
    )

    act(() => {
      vi.runAllTimers()
    })

    act(() => {
      result.current.clearDraft()
    })

    expect(storage.removeItem).toHaveBeenCalledWith('clear-key')
    expect(result.current.value).toEqual({ name: 'default' })
  })

  it('force save writes to localStorage immediately', () => {
    const { result } = renderHook(() =>
      useLocalStorageDraft({ key: 'force-key', defaultValue: { name: 'initial' }, debounceMs: 5000 })
    )

    act(() => {
      vi.runAllTimers()
    })

    act(() => {
      result.current.forceSave()
    })

    expect(storage.setItem).toHaveBeenCalledWith('force-key', JSON.stringify({ name: 'initial' }))
  })

  it('handles deserialization errors gracefully', () => {
    storage.getItem.mockReturnValue('not-valid-json{{{')
    const onError = vi.fn()

    const { result } = renderHook(() =>
      useLocalStorageDraft({
        key: 'bad-key',
        defaultValue: { name: 'fallback' },
        debounceMs: 100,
        onError,
      })
    )

    act(() => {
      vi.runAllTimers()
    })

    expect(result.current.value).toEqual({ name: 'fallback' })
    expect(onError).toHaveBeenCalled()
  })
})
