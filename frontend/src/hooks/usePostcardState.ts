import { useState, useEffect, useCallback, useRef } from 'react'
import type { Address } from '../types/address'

export interface PostcardImage {
  file: File
  preview: string
}

export interface PostcardState {
  image: PostcardImage | null
  message: string
  recipientAddress: Address | null
  senderAddress: Address | null
  showSafeZones: boolean
  isFlipped: boolean
  isUploading: boolean
  errors: Record<string, string | null>
}

export interface PostcardHistory {
  past: Partial<PostcardState>[]
  present: PostcardState
  future: Partial<PostcardState>[]
}

const STORAGE_KEY = 'postcard-draft'
const DEBOUNCE_DELAY = 1000
const MAX_HISTORY_SIZE = 50

const initialAddress: Address = {
  firstName: '',
  lastName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  provinceOrState: '',
  postalOrZip: '',
  countryCode: 'US'
}

const initialState: PostcardState = {
  image: null,
  message: '',
  recipientAddress: null,
  senderAddress: { ...initialAddress },
  showSafeZones: true,
  isFlipped: false,
  isUploading: false,
  errors: {}
}

export function usePostcardState() {
  const [state, setState] = useState<PostcardState>(initialState)
  const [history, setHistory] = useState<PostcardHistory>({
    past: [],
    present: initialState,
    future: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const debounceTimerRef = useRef<NodeJS.Timeout>()
  const saveInProgressRef = useRef(false)

  // Load draft from local storage on mount
  useEffect(() => {
    const loadDraft = () => {
      try {
        const savedDraft = localStorage.getItem(STORAGE_KEY)
        if (savedDraft) {
          const draft = JSON.parse(savedDraft)
          // Reconstruct File object from stored data
          if (draft.imageData?.data && draft.imageData?.metadata) {
            const byteCharacters = atob(draft.imageData.data)
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            const blob = new Blob([byteArray], { type: draft.imageData.metadata.type })
            const file = new File([blob], draft.imageData.metadata.name, {
              type: draft.imageData.metadata.type,
              lastModified: draft.imageData.metadata.lastModified
            })

            draft.image = {
              file,
              preview: draft.imageData.preview
            }
            // Clean up the temporary imageData
            delete draft.imageData
          }

          setState(draft)
          setHistory(prev => ({ ...prev, present: draft }))
        }
      } catch (error) {
        console.error('Failed to load draft:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDraft()
  }, [])

  // Save draft to local storage with debouncing
  const saveDraft = useCallback((currentState: PostcardState) => {
    if (saveInProgressRef.current) return

    clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(async () => {
      saveInProgressRef.current = true

      try {
        const draftToSave = { ...currentState }

        // Convert File to base64 for storage
        if (draftToSave.image?.file) {
          const reader = new FileReader()
          const imageDataPromise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string
              // Extract base64 data (remove data URL prefix)
              const base64Data = result.split(',')[1]
              resolve(base64Data)
            }
            reader.onerror = reject
          })

          const base64Data = await imageDataPromise

          // Create a serializable version of the image for storage
          if (draftToSave.image) {
            // Type-safe approach: create a proper interface for draft storage
            const draftWithImageData = draftToSave as PostcardState & {
              imageData: {
                data: string
                preview: string
                metadata: {
                  name: string
                  type: string
                  size: number
                  lastModified: number
                }
              }
            }
            draftWithImageData.imageData = {
              data: base64Data,
              preview: draftToSave.image.preview,
              metadata: {
                name: draftToSave.image.file.name,
                type: draftToSave.image.file.type,
                size: draftToSave.image.file.size,
                lastModified: draftToSave.image.file.lastModified
              }
            }
          }
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(draftToSave))
        setLastSaved(new Date())
        setIsDirty(false)
      } catch (error) {
        console.error('Failed to save draft:', error)
      } finally {
        saveInProgressRef.current = false
      }
    }, DEBOUNCE_DELAY)
  }, [])

  // Auto-save when state changes
  useEffect(() => {
    if (!isLoading) {
      setIsDirty(true)
      saveDraft(state)
    }
  }, [state, isLoading, saveDraft])

  // Update state with history tracking
  const updateState = useCallback((updates: Partial<PostcardState>) => {
    setState(prevState => {
      const newState = { ...prevState, ...updates }

      // Add to history for undo/redo
      setHistory(prevHistory => {
        const newPast = [...prevHistory.past, prevState]
        // Keep history size manageable
        if (newPast.length > MAX_HISTORY_SIZE) {
          newPast.shift()
        }
        return {
          past: newPast,
          present: newState,
          future: []
        }
      })

      return newState
    })
  }, [])

  // Undo functionality
  const undo = useCallback(() => {
    setHistory(prevHistory => {
      if (prevHistory.past.length === 0) return prevHistory

      const previous = prevHistory.past[prevHistory.past.length - 1]
      if (!previous || typeof previous !== 'object') return prevHistory

      // Ensure we have a complete PostcardState
      const completePrevious: PostcardState = {
        ...initialState,
        ...previous
      }

      const newPast = prevHistory.past.slice(0, prevHistory.past.length - 1)

      setState(completePrevious)
      return {
        past: newPast,
        present: completePrevious,
        future: [prevHistory.present, ...prevHistory.future]
      }
    })
  }, [])

  // Redo functionality
  const redo = useCallback(() => {
    setHistory(prevHistory => {
      if (prevHistory.future.length === 0) return prevHistory

      const next = prevHistory.future[0]
      if (!next || typeof next !== 'object') return prevHistory

      // Ensure we have a complete PostcardState
      const completeNext: PostcardState = {
        ...initialState,
        ...next
      }

      const newFuture = prevHistory.future.slice(1)

      setState(completeNext)
      return {
        past: [...prevHistory.past, prevHistory.present],
        present: completeNext,
        future: newFuture
      }
    })
  }, [])

  // Image handling
  const setImage = useCallback((image: PostcardImage | null) => {
    updateState({ image })
  }, [updateState])

  // Message handling
  const setMessage = useCallback((message: string) => {
    updateState({ message })
  }, [updateState])

  // Address handling
  const setRecipientAddress = useCallback((address: Address | null) => {
    updateState({ recipientAddress: address })
  }, [updateState])

  const setSenderAddress = useCallback((address: Address) => {
    updateState({ senderAddress: address })
  }, [updateState])

  // UI state handling
  const toggleSafeZones = useCallback(() => {
    setState(prev => {
      const newState = { ...prev, showSafeZones: !prev.showSafeZones }

      // Add to history
      setHistory(prevHistory => {
        const newPast = [...prevHistory.past, prev]
        if (newPast.length > MAX_HISTORY_SIZE) {
          newPast.shift()
        }
        return {
          past: newPast,
          present: newState,
          future: []
        }
      })

      return newState
    })
  }, [])

  const flip = useCallback(() => {
    setState(prev => {
      const newState = { ...prev, isFlipped: !prev.isFlipped }

      // Add to history
      setHistory(prevHistory => {
        const newPast = [...prevHistory.past, prev]
        if (newPast.length > MAX_HISTORY_SIZE) {
          newPast.shift()
        }
        return {
          past: newPast,
          present: newState,
          future: []
        }
      })

      return newState
    })
  }, [])

  const setIsUploading = useCallback((isUploading: boolean) => {
    updateState({ isUploading })
  }, [updateState])

  // Error handling
  const setError = useCallback((field: string, error: string | null) => {
    setState(prev => {
      const newState = {
        ...prev,
        errors: { ...prev.errors, [field]: error }
      }

      // Add to history for errors
      setHistory(prevHistory => {
        const newPast = [...prevHistory.past, prev]
        if (newPast.length > MAX_HISTORY_SIZE) {
          newPast.shift()
        }
        return {
          past: newPast,
          present: newState,
          future: []
        }
      })

      return newState
    })
  }, [])

  const clearErrors = useCallback(() => {
    updateState({ errors: {} })
  }, [updateState])

  // Progress calculation
  const getProgress = useCallback(() => {
    const steps = [
      state.recipientAddress?.firstName && state.recipientAddress?.lastName,
      state.recipientAddress?.addressLine1,
      state.message.trim(),
      state.image
    ]
    return {
      completed: steps.filter(Boolean).length,
      total: steps.length,
      percentage: (steps.filter(Boolean).length / steps.length) * 100
    }
  }, [state])

  // Validation
  const validate = useCallback(() => {
    const errors: Record<string, string> = {}

    if (!state.recipientAddress?.firstName) {
      errors.recipientFirstName = 'Recipient first name is required'
    }
    if (!state.recipientAddress?.lastName) {
      errors.recipientLastName = 'Recipient last name is required'
    }
    if (!state.recipientAddress?.addressLine1) {
      errors.recipientAddress1 = 'Street address is required'
    }
    if (!state.recipientAddress?.city) {
      errors.recipientCity = 'City is required'
    }
    if (!state.recipientAddress?.provinceOrState) {
      errors.recipientState = 'State/province is required'
    }
    if (!state.recipientAddress?.postalOrZip) {
      errors.recipientPostal = 'Postal/ZIP code is required'
    }
    if (!state.message.trim()) {
      errors.message = 'Message is required'
    }
    if (!state.image) {
      errors.image = 'Image is required'
    }

    updateState({ errors })
    return Object.keys(errors).length === 0
  }, [state, updateState])

  // Clear draft
  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState(initialState)
    setHistory({ past: [], present: initialState, future: [] })
    setIsDirty(false)
    setLastSaved(null)
  }, [])

  // Export state for submission
  const exportState = useCallback(() => {
    return {
      image: state.image,
      message: state.message,
      recipientAddress: state.recipientAddress,
      senderAddress: state.senderAddress
    }
  }, [state])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for redo
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z') ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault()
        redo()
      }
      // Ctrl/Cmd + S to save (manual save trigger)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveDraft(state)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, saveDraft, state])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(debounceTimerRef.current)
    }
  }, [])

  return {
    // State
    state,
    isLoading,
    isDirty,
    lastSaved,

    // History
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo,
    redo,

    // Actions
    setImage,
    setMessage,
    setRecipientAddress,
    setSenderAddress,
    toggleSafeZones,
    flip,
    setIsUploading,
    setError,
    clearErrors,
    validate,
    clearDraft,
    exportState,

    // Computed
    progress: getProgress()
  }
}

export type UsePostcardStateReturn = ReturnType<typeof usePostcardState>