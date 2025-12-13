import { useState, useCallback, useRef, useEffect } from 'react'
import {
  ImageTransform,
  ImageDimensions,
  processImage,
  transformImage,
  generateThumbnail,
  validateImageFile,
  POSTCARD_DIMENSIONS,
  generateSafeZoneOverlay,
  checkImageQuality
} from '../utils/imageProcessing'

export interface ImageEditorState {
  originalImage: string | null
  processedImage: string | null
  thumbnail: string | null
  dimensions: ImageDimensions | null
  fileSize: number
  transform: ImageTransform
  isLoading: boolean
  error: string | null
  qualityWarnings: string[]
  qualityRecommendations: string[]
  safeZoneOverlay: string | null
}

const INITIAL_TRANSFORM: ImageTransform = {
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0
}

export function useImageEditor() {
  const [state, setState] = useState<ImageEditorState>({
    originalImage: null,
    processedImage: null,
    thumbnail: null,
    dimensions: null,
    fileSize: 0,
    transform: INITIAL_TRANSFORM,
    isLoading: false,
    error: null,
    qualityWarnings: [],
    qualityRecommendations: [],
    safeZoneOverlay: null
  })

  const processingRef = useRef<boolean>(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Generate safe zone overlay on mount
  useEffect(() => {
    const overlay = generateSafeZoneOverlay(
      POSTCARD_DIMENSIONS.width,
      POSTCARD_DIMENSIONS.height
    )
    setState(prev => ({ ...prev, safeZoneOverlay: overlay }))
  }, [])

  // Cancel any ongoing processing
  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    processingRef.current = false
  }, [])

  // Reset editor state
  const reset = useCallback(() => {
    cancelProcessing()
    setState({
      originalImage: null,
      processedImage: null,
      thumbnail: null,
      dimensions: null,
      fileSize: 0,
      transform: INITIAL_TRANSFORM,
      isLoading: false,
      error: null,
      qualityWarnings: [],
      qualityRecommendations: [],
      safeZoneOverlay: state.safeZoneOverlay
    })
  }, [cancelProcessing, state.safeZoneOverlay])

  // Load and process image
  const loadImage = useCallback(async (file: File) => {
    // Validate file
    const validation = validateImageFile(file)
    if (!validation.isValid) {
      setState(prev => ({
        ...prev,
        error: validation.error || null,
        isLoading: false
      }))
      return false
    }

    // Cancel any ongoing processing
    cancelProcessing()

    // Create new abort controller
    abortControllerRef.current = new AbortController()
    processingRef.current = true

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }))

    try {
      // Process image
      const processedResult = await processImage(file, {
        maxWidth: POSTCARD_DIMENSIONS.width,
        maxHeight: POSTCARD_DIMENSIONS.height
      })

      if (!processingRef.current || abortControllerRef.current?.signal.aborted) {
        return false
      }

      // Generate thumbnail
      const thumbnail = await generateThumbnail(processedResult.dataUrl)

      if (!processingRef.current || abortControllerRef.current?.signal.aborted) {
        return false
      }

      // Check image quality
      const qualityCheck = checkImageQuality(
        processedResult.dimensions,
        processedResult.fileSize
      )

      setState(prev => ({
        ...prev,
        originalImage: processedResult.dataUrl,
        processedImage: processedResult.dataUrl,
        thumbnail,
        dimensions: processedResult.dimensions,
        fileSize: processedResult.fileSize,
        isLoading: false,
        qualityWarnings: qualityCheck.warnings,
        qualityRecommendations: qualityCheck.recommendations,
        transform: {
          scale: 1,
          rotation: 0,
          offsetX: 0,
          offsetY: 0
        }
      }))

      return true
    } catch (error) {
      if (!abortControllerRef.current?.signal.aborted) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to process image',
          isLoading: false
        }))
      }
      return false
    } finally {
      processingRef.current = false
      abortControllerRef.current = null
    }
  }, [cancelProcessing])

  // Apply transformations
  const applyTransform = useCallback(async (transform: ImageTransform) => {
    if (!state.originalImage || processingRef.current) return

    setState(prev => ({ ...prev, isLoading: true }))

    try {
      const transformedImage = await transformImage(
        state.originalImage,
        transform,
        POSTCARD_DIMENSIONS
      )

      setState(prev => ({
        ...prev,
        processedImage: transformedImage,
        transform,
        isLoading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to apply transformation',
        isLoading: false
      }))
    }
  }, [state.originalImage])

  // Update transform
  const updateTransform = useCallback((updates: Partial<ImageTransform>) => {
    const newTransform = { ...state.transform, ...updates }
    setState(prev => ({ ...prev, transform: newTransform }))
    applyTransform(newTransform)
  }, [state.transform, applyTransform])

  // Zoom controls
  const zoomIn = useCallback(() => {
    const newScale = Math.min(state.transform.scale * 1.2, 3)
    updateTransform({ scale: newScale })
  }, [state.transform.scale, updateTransform])

  const zoomOut = useCallback(() => {
    const newScale = Math.max(state.transform.scale / 1.2, 0.5)
    updateTransform({ scale: newScale })
  }, [state.transform.scale, updateTransform])

  const resetZoom = useCallback(() => {
    updateTransform({ scale: 1 })
  }, [updateTransform])

  // Rotation controls
  const rotateLeft = useCallback(() => {
    const newRotation = state.transform.rotation - 90
    updateTransform({ rotation: newRotation })
  }, [state.transform.rotation, updateTransform])

  const rotateRight = useCallback(() => {
    const newRotation = state.transform.rotation + 90
    updateTransform({ rotation: newRotation })
  }, [state.transform.rotation, updateTransform])

  const resetRotation = useCallback(() => {
    updateTransform({ rotation: 0 })
  }, [updateTransform])

  // Pan controls
  const pan = useCallback((deltaX: number, deltaY: number) => {
    updateTransform({
      offsetX: state.transform.offsetX + deltaX,
      offsetY: state.transform.offsetY + deltaY
    })
  }, [state.transform, updateTransform])

  const resetPan = useCallback(() => {
    updateTransform({ offsetX: 0, offsetY: 0 })
  }, [updateTransform])

  // Reset all transformations
  const resetTransform = useCallback(() => {
    updateTransform(INITIAL_TRANSFORM)
  }, [updateTransform])

  // Get current image data
  const getImageData = useCallback(() => {
    return state.processedImage || state.originalImage
  }, [state.processedImage, state.originalImage])

  // Get formatted file size
  const getFormattedFileSize = useCallback(() => {
    if (state.fileSize < 1024) {
      return `${state.fileSize} B`
    } else if (state.fileSize < 1024 * 1024) {
      return `${(state.fileSize / 1024).toFixed(1)} KB`
    } else {
      return `${(state.fileSize / 1024 / 1024).toFixed(1)} MB`
    }
  }, [state.fileSize])

  // Check if image has been transformed
  const hasTransformations = useCallback(() => {
    return (
      state.transform.scale !== 1 ||
      state.transform.rotation !== 0 ||
      state.transform.offsetX !== 0 ||
      state.transform.offsetY !== 0
    )
  }, [state.transform])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    // State
    ...state,

    // Actions
    loadImage,
    reset,
    updateTransform,
    zoomIn,
    zoomOut,
    resetZoom,
    rotateLeft,
    rotateRight,
    resetRotation,
    pan,
    resetPan,
    resetTransform,
    clearError,
    cancelProcessing,

    // Getters
    getImageData,
    getFormattedFileSize,
    hasTransformations,
    isProcessing: processingRef.current
  }
}