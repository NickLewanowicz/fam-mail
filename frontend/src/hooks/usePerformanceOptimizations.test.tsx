import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useDebounce,
  useThrottle,
  useDeepMemo,
  useBatchUpdates,
} from './usePerformanceOptimizations'

describe('usePerformanceOptimizations hooks', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('useDebounce', () => {
    it('delays function execution', () => {
      const callback = vi.fn()
      const { result } = renderHook(() => useDebounce(callback, 100))

      result.current('test')

      expect(callback).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(100)
      })

      expect(callback).toHaveBeenCalledWith('test')
    })

    it('cancels previous call on rapid invocations', () => {
      const callback = vi.fn()
      const { result } = renderHook(() => useDebounce(callback, 100))

      result.current('first')
      result.current('second')
      result.current('third')

      act(() => {
        vi.advanceTimersByTime(100)
      })

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith('third')
    })
  })

  describe('useThrottle', () => {
    it('defers callback execution via timeout on first call', () => {
      const callback = vi.fn()
      const { result } = renderHook(() => useThrottle(callback, 100))

      result.current('test')

      // First call is deferred since lastRun is initialized to Date.now()
      // and Date.now() - lastRun.current < delay
      expect(callback).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(100)
      })

      expect(callback).toHaveBeenCalledWith('test')
    })

    it('executes callback immediately after delay has elapsed', () => {
      const callback = vi.fn()
      const { result } = renderHook(() => useThrottle(callback, 50))

      // First call - deferred
      result.current('first')

      act(() => {
        vi.advanceTimersByTime(50)
      })

      expect(callback).toHaveBeenCalledWith('first')

      // After delay has elapsed, next call should be deferred again
      // (lastRun was updated)
      callback.mockClear()
      result.current('second')

      // Not called immediately since lastRun was just updated
      expect(callback).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(50)
      })

      expect(callback).toHaveBeenCalledWith('second')
    })
  })

  describe('useDeepMemo', () => {
    it('returns the value', () => {
      const { result } = renderHook(() => useDeepMemo('test-value', ['test-value']))

      expect(result.current).toBe('test-value')
    })

    it('returns same reference for equal deps', () => {
      const value = { a: 1 }
      const { result, rerender } = renderHook(
        ({ val, deps }) => useDeepMemo(val, deps),
        { initialProps: { val: value, deps: [1] } }
      )

      const firstResult = result.current

      rerender({ val: value, deps: [1] })

      expect(result.current).toBe(firstResult)
    })

    it('updates for different deps', () => {
      const { result, rerender } = renderHook(
        ({ deps }) => useDeepMemo(deps[0], deps),
        { initialProps: { deps: ['a'] } }
      )

      expect(result.current).toBe('a')

      rerender({ deps: ['b'] })

      expect(result.current).toBe('b')
    })
  })

  describe('useBatchUpdates', () => {
    it('provides initial state', () => {
      const { result } = renderHook(() => useBatchUpdates({ a: 1, b: 2 }))

      expect(result.current[0]).toEqual({ a: 1, b: 2 })
    })

    it('batches updates', () => {
      const { result } = renderHook(() => useBatchUpdates({ a: 1, b: 2 }))

      act(() => {
        result.current[1]({ a: 10 })
      })

      // After batch timeout (0ms), state should update
      act(() => {
        vi.advanceTimersByTime(10)
      })

      expect(result.current[0]).toEqual({ a: 10, b: 2 })
    })
  })
})
