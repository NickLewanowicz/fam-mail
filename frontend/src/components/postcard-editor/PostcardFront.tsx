import { useState, useRef, useEffect, useCallback } from 'react'
import { useImageEditor } from '../../hooks/useImageEditor'
import { POSTCARD_DIMENSIONS } from '../../utils/imageProcessing'
import type { PostcardImage } from '../../hooks/usePostcardState'

interface PostcardFrontProps {
  imageData?: string
  onImageUpload: (image: PostcardImage | null) => void
  onError?: (error: string) => void
  showSafeZones?: boolean
  readOnly?: boolean
}

export function PostcardFront({
  imageData,
  onImageUpload,
  onError,
  showSafeZones = false,
  readOnly = false
}: PostcardFrontProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [showQualityInfo, setShowQualityInfo] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const imageEditor = useImageEditor()

  // Sync with external imageData prop
  useEffect(() => {
    if (imageData && imageData !== imageEditor.getImageData()) {
      // If external image changes, load it into editor
      const file = dataURLtoFile(imageData, 'image.jpg')
      if (file) {
        imageEditor.loadImage(file)
      }
    }
  }, [imageData, imageEditor])

  // Handle image upload success
  const handleImageLoad = useCallback((success: boolean) => {
    if (success) {
      const processedImageData = imageEditor.getImageData()
      if (processedImageData) {
        // Get the original file from the image editor
        const originalFile = imageEditor.originalImage
        if (originalFile) {
          // originalImage is a base64 string, convert to File
          const file = dataURLtoFile(originalFile, 'image.jpg')
          if (file) {
            onImageUpload({
              file: file,
              preview: processedImageData
            })
            setShowEditor(true)
          }
        }
      }
    } else if (imageEditor.error) {
      onError?.(imageEditor.error)
    }
  }, [imageEditor, onImageUpload, onError])

  // Convert data URL to File (helper function)
  function dataURLtoFile(dataurl: string, filename: string): File | null {
    try {
      const arr = dataurl.split(',')
      const mime = arr[0].match(/:(.*?);/)![1]
      const bstr = atob(arr[1])
      let n = bstr.length
      const u8arr = new Uint8Array(n)
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
      }
      return new File([u8arr], filename, { type: mime })
    } catch {
      return null
    }
  }

  const handleFileSelect = async (file: File) => {
    if (readOnly) return

    imageEditor.clearError()
    const success = await imageEditor.loadImage(file)
    handleImageLoad(success)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!readOnly) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (readOnly) return

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleClick = () => {
    if (!readOnly && !imageEditor.originalImage) {
      fileInputRef.current?.click()
    }
  }

  const handleReplaceImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!readOnly) {
      fileInputRef.current?.click()
    }
  }

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!readOnly) {
      imageEditor.reset()
      onImageUpload(null)
      setShowEditor(false)
      setShowQualityInfo(false)
    }
  }

  // Pan handlers for mouse events
  const handlePanStart = (e: React.MouseEvent) => {
    if (!readOnly && e.shiftKey) {
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
      e.preventDefault()
    }
  }

  const handlePanMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - panStart.x
      const deltaY = e.clientY - panStart.y
      imageEditor.pan(deltaX * 2, deltaY * 2) // Scale for better control
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handlePanEnd = () => {
    setIsPanning(false)
  }

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (readOnly || !imageEditor.originalImage) return

    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        if (e.shiftKey) {
          handleRemoveImage(e as any)
        }
        break
      case '+':
      case '=':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          imageEditor.zoomIn()
        }
        break
      case '-':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          imageEditor.zoomOut()
        }
        break
      case 'r':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          imageEditor.resetTransform()
        }
        break
      case 'ArrowLeft':
        if (e.altKey) {
          e.preventDefault()
          imageEditor.rotateLeft()
        }
        break
      case 'ArrowRight':
        if (e.altKey) {
          e.preventDefault()
          imageEditor.rotateRight()
        }
        break
    }
  }, [readOnly, imageEditor, handleRemoveImage])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const aspectRatio = POSTCARD_DIMENSIONS.aspectRatio

  return (
    <div
      data-testid="postcard-front"
      ref={containerRef}
      className={`relative w-full h-full ${readOnly ? '' : 'cursor-pointer'} overflow-hidden bg-white rounded-lg shadow-lg group`}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseDown={handlePanStart}
      onMouseMove={handlePanMove}
      onMouseUp={handlePanEnd}
      onMouseLeave={handlePanEnd}
      role="button"
      tabIndex={readOnly ? -1 : 0}
      aria-label={imageEditor.originalImage ? "Postcard image - click to edit, Shift+drag to pan" : "Upload image for postcard front"}
      aria-describedby={imageEditor.qualityWarnings.length > 0 ? "quality-warnings" : undefined}
    >
      {imageEditor.originalImage ? (
        <div className="relative w-full h-full">
          {/* Main image display */}
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden"
            style={{ aspectRatio }}
          >
            <img
              src={imageEditor.getImageData() || ''}
              alt="Postcard front"
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{
                transform: `scale(${imageEditor.transform.scale}) rotate(${imageEditor.transform.rotation}deg) translate(${imageEditor.transform.offsetX}px, ${imageEditor.transform.offsetY}px)`,
                cursor: isPanning ? 'grabbing' : 'grab'
              }}
            />
          </div>

          {/* Safe zone overlay */}
          {showSafeZones && imageEditor.safeZoneOverlay && (
            <div className="absolute inset-0 pointer-events-none opacity-30">
              <img
                src={imageEditor.safeZoneOverlay}
                alt="Safe zone guidelines"
                className="w-full h-full"
              />
            </div>
          )}

          {/* Loading overlay */}
          {imageEditor.isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white rounded-lg p-4 flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue mb-2"></div>
                <span className="text-sm text-gray-600">Processing...</span>
              </div>
            </div>
          )}

          {/* Control toolbar */}
          {!readOnly && (
            <div className={`absolute top-4 right-4 transition-opacity duration-200 ${
              showEditor ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}>
              <div className="bg-black bg-opacity-75 text-white rounded-lg p-2 space-y-2">
                {/* Change/Remove buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={handleReplaceImage}
                    className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                    aria-label="Change image"
                  >
                    Change
                  </button>
                  <button
                    onClick={handleRemoveImage}
                    className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded transition-colors"
                    aria-label="Remove image"
                  >
                    Remove
                  </button>
                </div>

                {/* Editor toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowEditor(!showEditor)
                  }}
                  className="w-full px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 rounded transition-colors text-left"
                  aria-label={showEditor ? "Hide editor" : "Show editor"}
                >
                  {showEditor ? "Hide Editor" : "Show Editor"}
                </button>
              </div>
            </div>
          )}

          {/* Editor controls */}
          {showEditor && !readOnly && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black bg-opacity-75 text-white rounded-lg p-3">
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {/* Zoom controls */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); imageEditor.zoomOut(); }}
                      className="p-1 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
                      aria-label="Zoom out"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <span className="text-xs px-1">{Math.round(imageEditor.transform.scale * 100)}%</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); imageEditor.zoomIn(); }}
                      className="p-1 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
                      aria-label="Zoom in"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>

                  {/* Rotation controls */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); imageEditor.rotateLeft(); }}
                      className="p-1 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
                      aria-label="Rotate left"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4v5h5M6 9a9 9 0 0111.5 5.5" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); imageEditor.resetRotation(); }}
                      className="p-1 bg-gray-600 hover:bg-gray-700 rounded transition-colors text-xs"
                      aria-label="Reset rotation"
                    >
                      0°
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); imageEditor.rotateRight(); }}
                      className="p-1 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
                      aria-label="Rotate right"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 20v-5h-5M18 15a9 9 0 01-11.5-5.5" />
                      </svg>
                    </button>
                  </div>

                  {/* Reset button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); imageEditor.resetTransform(); }}
                    className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 rounded transition-colors"
                    aria-label="Reset all transformations"
                  >
                    Reset
                  </button>
                </div>

                {/* Quality info toggle */}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowQualityInfo(!showQualityInfo); }}
                  className="w-full text-xs text-center bg-gray-700 hover:bg-gray-600 rounded py-1 transition-colors"
                  aria-label="Toggle quality information"
                >
                  {showQualityInfo ? "Hide" : "Show"} Quality Info
                </button>
              </div>
            </div>
          )}

          {/* Quality warnings */}
          {showQualityInfo && imageEditor.qualityWarnings.length > 0 && (
            <div className="absolute top-4 left-4 max-w-xs">
              <div id="quality-warnings" className="bg-yellow-100 border border-yellow-400 text-yellow-800 p-3 rounded-lg">
                <h4 className="font-semibold text-sm mb-1">Quality Warnings</h4>
                <ul className="text-xs space-y-1">
                  {imageEditor.qualityWarnings.map((warning, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-1">⚠️</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
                {imageEditor.qualityRecommendations.length > 0 && (
                  <div className="mt-2">
                    <h5 className="font-semibold text-sm mb-1">Recommendations</h5>
                    <ul className="text-xs space-y-1">
                      {imageEditor.qualityRecommendations.map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-1">💡</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Upload area */
        <div
          className={`flex flex-col items-center justify-center h-full p-8 border-2 border-dashed rounded-lg transition-all ${
            isDragging
              ? 'border-accent-blue bg-blue-50 scale-[1.02]'
              : 'border-gray-300 hover:border-accent-blue hover:bg-gray-50'
          } ${readOnly ? 'cursor-not-allowed opacity-75' : ''}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mb-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-lg font-medium text-gray-700 mb-2">
            {readOnly ? "No image uploaded" : "Click to upload image"}
          </p>
          {!readOnly && (
            <>
              <p className="text-sm text-gray-500">or drag and drop</p>
              <p className="text-xs text-gray-400 mt-2">JPG, PNG, GIF, or WebP (max 10MB)</p>
              <p className="text-xs text-gray-400 mt-1">Recommended: 6×4 ratio, high quality</p>
            </>
          )}
        </div>
      )}

      {/* Error display */}
      {imageEditor.error && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-500 text-white p-3 rounded-lg shadow-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold text-sm">Error</p>
              <p className="text-xs">{imageEditor.error}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); imageEditor.clearError(); }}
              className="ml-auto pl-2"
              aria-label="Dismiss error"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* File input */}
      {!readOnly && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="Upload image file"
        />
      )}
    </div>
  )
}