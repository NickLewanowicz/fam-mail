import { useCallback, useEffect, useRef, useState } from 'react'

interface UseLocalStorageDraftOptions<T> {
  key: string
  defaultValue: T
  debounceMs?: number
  serialize?: (value: T) => string
  deserialize?: (value: string) => T
  onError?: (error: Error) => void
}

export function useLocalStorageDraft<T>({
  key,
  defaultValue,
  debounceMs = 1000,
  serialize = JSON.stringify,
  deserialize = JSON.parse,
  onError
}: UseLocalStorageDraftOptions<T>) {
  const [value, setValue] = useState<T>(defaultValue)
  const [isLoading, setIsLoading] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout>()
  const isMountedRef = useRef(true)
  // Ref to always hold the latest value, avoiding stale closures in callbacks
  const valueRef = useRef<T>(value)
  valueRef.current = value

  // Load value from localStorage on mount
  useEffect(() => {
    try {
      const storedValue = localStorage.getItem(key)
      if (storedValue) {
        const parsedValue = deserialize(storedValue)
        if (isMountedRef.current) {
          setValue(parsedValue)
          setLastSaved(new Date())
        }
      }
    } catch (error) {
      // Properly handle unknown errors by converting them to Error instances
      const errorInstance = error instanceof Error ? error : new Error(String(error))
      onError?.(errorInstance)
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [key, deserialize, onError])

  // Save value to localStorage with debouncing
  const saveValue = useCallback((newValue: T) => {
    clearTimeout(debounceTimerRef.current)
    setIsDirty(true)

    debounceTimerRef.current = setTimeout(() => {
      try {
        const serializedValue = serialize(newValue)
        localStorage.setItem(key, serializedValue)
        if (isMountedRef.current) {
          setLastSaved(new Date())
          setIsDirty(false)
        }
      } catch (error) {
        // Properly handle unknown errors by converting them to Error instances
        const errorInstance = error instanceof Error ? error : new Error(String(error))
        onError?.(errorInstance)

        // If localStorage is full, try to clear old drafts
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          clearOldDrafts()
        }
      }
    }, debounceMs)
  }, [key, debounceMs, serialize, onError])

  // Update value and trigger save
  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    let resolvedValue: T

    if (typeof newValue === 'function') {
      // Use the ref to get the latest value, avoiding stale closure over state
      resolvedValue = (newValue as (prev: T) => T)(valueRef.current)
    } else {
      resolvedValue = newValue
    }

    if (isMountedRef.current) {
      setValue(resolvedValue)
      saveValue(resolvedValue)
    }
  }, [saveValue])

  // Clear the draft
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key)
      if (isMountedRef.current) {
        setValue(defaultValue)
        setLastSaved(null)
        setIsDirty(false)
      }
    } catch (error) {
      // Properly handle unknown errors by converting them to Error instances
      const errorInstance = error instanceof Error ? error : new Error(String(error))
      onError?.(errorInstance)
    }
  }, [key, defaultValue, onError])

  // Force immediate save — reads current value via ref to avoid stale closure
  const forceSave = useCallback(() => {
    clearTimeout(debounceTimerRef.current)
    try {
      const serializedValue = serialize(valueRef.current)
      localStorage.setItem(key, serializedValue)
      if (isMountedRef.current) {
        setLastSaved(new Date())
        setIsDirty(false)
      }
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error))
      onError?.(errorInstance)
    }
  }, [key, serialize, onError])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      clearTimeout(debounceTimerRef.current)
    }
  }, [])

  return {
    value,
    setValue: updateValue,
    isLoading,
    isDirty,
    lastSaved,
    clearDraft,
    forceSave
  }
}

// Helper function to clear old drafts (all keys starting with 'postcard-draft-')
function clearOldDrafts() {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('postcard-draft-')) {
        // Keep only the most recent draft
        const match = key.match(/postcard-draft-(\d+)/)
        if (match) {
          const timestamp = parseInt(match[1])
          const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
          if (timestamp < oneDayAgo) {
            keysToRemove.push(key)
          }
        }
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })
  } catch {
    // Silently fail - clearing old drafts is best-effort
  }
}

// Hook to get all available drafts
export function useAvailableDrafts() {
  const [drafts, setDrafts] = useState<Array<{key: string, timestamp: number, name: string}>>([])

  useEffect(() => {
    const loadDrafts = () => {
      const availableDrafts: Array<{key: string, timestamp: number, name: string}> = []

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('postcard-draft-')) {
          const match = key.match(/postcard-draft-(\d+)/)
          if (match) {
            const timestamp = parseInt(match[1])
            const date = new Date(timestamp)
            const name = `Draft from ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
            availableDrafts.push({ key, timestamp, name })
          }
        }
      }

      // Sort by timestamp (newest first)
      availableDrafts.sort((a, b) => b.timestamp - a.timestamp)

      setDrafts(availableDrafts)
    }

    loadDrafts()

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('postcard-draft-')) {
        loadDrafts()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return drafts
}
