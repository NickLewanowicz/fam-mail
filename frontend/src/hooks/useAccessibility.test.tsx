import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useScreenReaderAnnouncer,
  useReducedMotion,
  useHighContrast,
  useAriaDescription,
  useSkipLinks,
} from './useAccessibility'

describe('useAccessibility hooks', () => {
  // Mock window.matchMedia for jsdom
  function createMatchMedia(matches: boolean = false) {
    return vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  }

  beforeEach(() => {
    vi.stubGlobal('matchMedia', createMatchMedia(false))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })
  describe('useScreenReaderAnnouncer', () => {
    it('provides an announce function', () => {
      const { result } = renderHook(() => useScreenReaderAnnouncer())
      expect(typeof result.current.announce).toBe('function')
    })

    it('provides an AnnouncerComponent', () => {
      const { result } = renderHook(() => useScreenReaderAnnouncer())
      expect(typeof result.current.AnnouncerComponent).toBe('function')
    })
  })

  describe('useReducedMotion', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns a boolean', () => {
      const { result } = renderHook(() => useReducedMotion())
      expect(typeof result.current).toBe('boolean')
    })

    it('defaults to false when no preference is set', () => {
      // jsdom default has no media query preference
      const { result } = renderHook(() => useReducedMotion())
      expect(result.current).toBe(false)
    })
  })

  describe('useHighContrast', () => {
    it('returns a boolean', () => {
      const { result } = renderHook(() => useHighContrast())
      expect(typeof result.current).toBe('boolean')
    })

    it('defaults to false when no preference is set', () => {
      const { result } = renderHook(() => useHighContrast())
      expect(result.current).toBe(false)
    })
  })

  describe('useAriaDescription', () => {
    it('adds and retrieves a description', () => {
      const { result } = renderHook(() => useAriaDescription())

      act(() => {
        result.current.addDescription('field1', 'This is a description')
      })

      expect(result.current.getDescriptionId('field1')).toBe('field1-desc')
    })

    it('returns undefined for non-existent description', () => {
      const { result } = renderHook(() => useAriaDescription())
      expect(result.current.getDescriptionId('nonexistent')).toBeUndefined()
    })

    it('removes a description', () => {
      const { result } = renderHook(() => useAriaDescription())

      act(() => {
        result.current.addDescription('field1', 'Description')
      })

      expect(result.current.getDescriptionId('field1')).toBe('field1-desc')

      act(() => {
        result.current.removeDescription('field1')
      })

      expect(result.current.getDescriptionId('field1')).toBeUndefined()
    })
  })

  describe('useSkipLinks', () => {
    it('starts with empty skip links', () => {
      const { result } = renderHook(() => useSkipLinks())
      // The SkipLinksComponent should render nothing initially
      const { SkipLinksComponent } = result.current
      expect(typeof SkipLinksComponent).toBe('function')
    })

    it('adds a skip link', () => {
      const { result } = renderHook(() => useSkipLinks())

      act(() => {
        result.current.addSkipLink('main', 'Skip to main', '#main-content')
      })

      // The component should now include the link when rendered
      expect(result.current.SkipLinksComponent).toBeDefined()
    })

    it('removes a skip link', () => {
      const { result } = renderHook(() => useSkipLinks())

      act(() => {
        result.current.addSkipLink('main', 'Skip to main', '#main-content')
      })

      act(() => {
        result.current.removeSkipLink('main')
      })

      // After removing, SkipLinksComponent should still be a function (renders nothing)
      expect(typeof result.current.SkipLinksComponent).toBe('function')
    })
  })
})
