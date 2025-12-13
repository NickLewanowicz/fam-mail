import { useState, useCallback, useRef, useEffect } from 'react'

// Debounce hook
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>()

  return useCallback(
    (...args: Parameters<T>) => {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => callback(...args), delay)
    },
    [callback, delay]
  )

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  return useCallback(
    (...args: Parameters<T>) => {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => callback(...args), delay)
    },
    [callback, delay]
  )
}

// Throttle hook
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastRun = useRef(Date.now())
  const timeoutRef = useRef<NodeJS.Timeout>()

  return useCallback(
    (...args: Parameters<T>) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args)
        lastRun.current = Date.now()
      } else {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
          callback(...args)
          lastRun.current = Date.now()
        }, delay - (Date.now() - lastRun.current))
      }
    },
    [callback, delay]
  )

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  return useCallback(
    (...args: Parameters<T>) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args)
        lastRun.current = Date.now()
      } else {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
          callback(...args)
          lastRun.current = Date.now()
        }, delay - (Date.now() - lastRun.current))
      }
    },
    [callback, delay]
  )
}

// Memoized value with deep comparison
export function useDeepMemo<T>(value: T, deps: any[] = []): T {
  const ref = useRef<{ value: T; deps: any[] }>()

  if (!ref.current || !depsAreEqual(deps, ref.current.deps)) {
    ref.current = { value, deps: [...deps] }
  }

  return ref.current.value
}

// Check if dependencies are equal (simple deep comparison)
function depsAreEqual(deps1: any[], deps2: any[]): boolean {
  if (deps1.length !== deps2.length) return false

  return deps1.every((dep, index) => {
    if (typeof dep === 'object' && dep !== null) {
      return JSON.stringify(dep) === JSON.stringify(deps2[index])
    }
    return dep === deps2[index]
  })
}

// Idle callback hook for non-critical updates
export function useIdleCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): void {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const handleIdle = () => {
      callbackRef.current()
    }

    if ('requestIdleCallback' in window) {
      const idleId = requestIdleCallback(handleIdle)
      return () => cancelIdleCallback(idleId)
    } else {
      // Fallback for browsers without requestIdleCallback
      const timeoutId = setTimeout(handleIdle, 100)
      return () => clearTimeout(timeoutId)
    }
  }, deps)
}

// Intersection observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): IntersectionObserverEntry | null {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => setEntry(entry),
      options
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [elementRef, options])

  return entry
}

// Resize observer hook for responsive updates
export function useResizeObserver(
  elementRef: React.RefObject<Element>,
  callback: (entry: ResizeObserverEntry) => void
) {
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new ResizeObserver(([entry]) => callback(entry))
    observer.observe(element)
    return () => observer.disconnect()
  }, [elementRef, callback])
}

// Performance monitoring hook
export function usePerformanceMonitor(name: string) {
  const startTimeRef = useRef<number>()

  const start = useCallback(() => {
    startTimeRef.current = performance.now()
  }, [])

  const end = useCallback(() => {
    if (startTimeRef.current) {
      const duration = performance.now() - startTimeRef.current
      console.log(`${name} took ${duration.toFixed(2)}ms`)
      return duration
    }
    return 0
  }, [name])

  const measure = useCallback(
    <T extends (...args: any[]) => any>(fn: T, ...args: Parameters<T>): ReturnType<T> => {
      start()
      const result = fn(...args)
      end()
      return result
    },
    [start, end]
  )

  return { start, end, measure }
}

// Optimized scroll event hook
export function useOptimizedScroll(
  callback: (event: Event) => void,
  deps: React.DependencyList = []
) {
  const tickingRef = useRef(false)

  const optimizedCallback = useCallback((event: Event) => {
    if (!tickingRef.current) {
      requestAnimationFrame(() => {
        callback(event)
        tickingRef.current = false
      })
      tickingRef.current = true
    }
  }, [callback])

  useEffect(() => {
    window.addEventListener('scroll', optimizedCallback, { passive: true })
    return () => window.removeEventListener('scroll', optimizedCallback)
  }, [optimizedCallback, ...deps])
}

// Optimized resize hook
export function useOptimizedResize(
  callback: () => void,
  deps: React.DependencyList = []
) {
  const tickingRef = useRef(false)

  const optimizedCallback = useCallback(() => {
    if (!tickingRef.current) {
      requestAnimationFrame(() => {
        callback()
        tickingRef.current = false
      })
      tickingRef.current = true
    }
  }, [callback])

  useEffect(() => {
    window.addEventListener('resize', optimizedCallback)
    return () => window.removeEventListener('resize', optimizedCallback)
  }, [optimizedCallback, ...deps])
}

// Memory leak prevention hook
export function useCleanup(cleanup: () => void, deps: React.DependencyList) {
  useEffect(() => {
    return cleanup
  }, deps)
}

// Batch state updates hook
export function useBatchUpdates<T extends Record<string, any>>(
  initialState: T
): [T, (updates: Partial<T>) => void] {
  const [state, setState] = useState(initialState)
  const pendingUpdates = useRef<Partial<T>>({})
  const timeoutRef = useRef<NodeJS.Timeout>()

  const batchedSetState = useCallback((updates: Partial<T>) => {
    Object.assign(pendingUpdates.current, updates)

    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setState(prevState => ({ ...prevState, ...pendingUpdates.current }))
      pendingUpdates.current = {}
    }, 0)
  }, [])

  return [state, batchedSetState]
}