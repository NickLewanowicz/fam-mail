import { useEffect, useRef, useState, useCallback } from 'react'

// Screen reader announcer hook
export function useScreenReaderAnnouncer() {
  const [announcement, setAnnouncement] = useState('')

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement(message)
    // Clear announcement after it's been read
    setTimeout(() => setAnnouncement(''), 1000)
  }, [])

  const AnnouncerComponent = useCallback(() => (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      role="status"
    >
      {announcement}
    </div>
  ), [announcement])

  return { announce, AnnouncerComponent }
}

// Focus management hook
export function useFocusManagement<T extends HTMLElement = HTMLElement>() {
  const elementRef = useRef<T>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const setFocus = useCallback(() => {
    if (elementRef.current) {
      elementRef.current.focus()
    }
  }, [])

  const trapFocus = useCallback(() => {
    const element = elementRef.current
    if (!element) return

    // Store the current focused element (type-safe check)
    const activeElement = document.activeElement
    if (activeElement && activeElement instanceof HTMLElement) {
      previousFocusRef.current = activeElement
    }

    // Get all focusable elements within the container (type-safe approach)
    const focusableElementSelectors = [
      'button', '[href]', 'input', 'select', 'textarea', '[tabindex]:not([tabindex="-1"])'
    ]
    const nodeList = element.querySelectorAll(focusableElementSelectors.join(', '))
    const focusableElements: HTMLElement[] = Array.from(nodeList).filter(
      node => node instanceof HTMLElement
    )

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    element.addEventListener('keydown', handleTabKey)

    // Set initial focus
    firstElement.focus()

    // Return cleanup function
    return () => {
      element.removeEventListener('keydown', handleTabKey)
      // Restore focus to the previously focused element
      if (previousFocusRef.current) {
        previousFocusRef.current.focus()
      }
    }
  }, [])

  return { elementRef, setFocus, trapFocus }
}

// Keyboard navigation hook
export function useKeyboardNavigation(
  handlers: Record<string, (e: KeyboardEvent) => void>,
  options: { preventDefault?: boolean; stopPropagation?: boolean } = {}
) {
  const { preventDefault = false, stopPropagation = false } = options

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const handler = handlers[e.key]
      if (handler) {
        if (preventDefault) e.preventDefault()
        if (stopPropagation) e.stopPropagation()
        handler(e)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handlers, preventDefault, stopPropagation])
}

// Reduced motion preference hook
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

// High contrast mode preference hook
export function useHighContrast() {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    setPrefersHighContrast(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersHighContrast
}

// Screen reader detection hook
export function useScreenReaderDetection() {
  const [hasScreenReader, setHasScreenReader] = useState(false)

  useEffect(() => {
    // Method 1: Check for screen reader specific APIs
    const hasScreenReaderAPI = !!(
      window.speechSynthesis ||
      ('speechSynthesis' in window) ||
      ('webkitSpeechSynthesis' in window) ||
      navigator.userAgent.match(/NVDA|JAWS|VoiceOver|ChromeVox/i)
    )

    // Method 2: ARIA live region test
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', 'polite')
    liveRegion.style.position = 'absolute'
    liveRegion.style.left = '-10000px'
    liveRegion.setAttribute('aria-atomic', 'true')

    let screenReaderDetected = false

    const observer = new MutationObserver(() => {
      screenReaderDetected = true
    })

    observer.observe(liveRegion, {
      childList: true,
      characterData: true,
      subtree: true
    })

    // Add some content to trigger the observer
    liveRegion.textContent = 'Screen reader test'
    document.body.appendChild(liveRegion)

    // Check after a delay
    setTimeout(() => {
      document.body.removeChild(liveRegion)
      observer.disconnect()
      setHasScreenReader(hasScreenReaderAPI || screenReaderDetected)
    }, 100)

    return () => {
      if (document.body.contains(liveRegion)) {
        document.body.removeChild(liveRegion)
      }
      observer.disconnect()
    }
  }, [])

  return hasScreenReader
}

// Touch device detection hook
export function useTouchDetection() {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0
      )
    }

    checkTouch()
    window.addEventListener('touchstart', checkTouch, { once: true })
    return () => window.removeEventListener('touchstart', checkTouch)
  }, [])

  return isTouch
}

// ARIA description manager
export function useAriaDescription() {
  const descriptions = useRef<Map<string, string>>(new Map())

  const addDescription = useCallback((id: string, text: string) => {
    descriptions.current.set(id, text)
  }, [])

  const removeDescription = useCallback((id: string) => {
    descriptions.current.delete(id)
  }, [])

  const getDescriptionId = useCallback((id: string) => {
    return descriptions.current.has(id) ? `${id}-desc` : undefined
  }, [])

  const getDescriptionElement = useCallback((id: string) => {
    const description = descriptions.current.get(id)
    if (!description) return null

    return (
      <div id={`${id}-desc`} className="sr-only">
        {description}
      </div>
    )
  }, [])

  return {
    addDescription,
    removeDescription,
    getDescriptionId,
    getDescriptionElement
  }
}

// Skip links manager
export function useSkipLinks() {
  const [skipLinks, setSkipLinks] = useState<Array<{id: string; label: string; target: string}>>([])

  const addSkipLink = useCallback((id: string, label: string, target: string) => {
    setSkipLinks(prev => [...prev, { id, label, target }])
  }, [])

  const removeSkipLink = useCallback((id: string) => {
    setSkipLinks(prev => prev.filter(link => link.id !== id))
  }, [])

  const SkipLinksComponent = useCallback(() => (
    <>
      {skipLinks.map(link => (
        <a
          key={link.id}
          href={link.target}
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-accent-blue text-white px-4 py-2 rounded z-50 focus:outline-none focus:ring-2 focus:ring-white"
          onClick={(e) => {
            e.preventDefault()
            const target = document.querySelector(link.target)
            if (target instanceof HTMLElement) {
              target.focus()
              target.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }}
        >
          {link.label}
        </a>
      ))}
    </>
  ), [skipLinks])

  return { addSkipLink, removeSkipLink, SkipLinksComponent }
}