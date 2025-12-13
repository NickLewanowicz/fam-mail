import { useEffect, useRef, useState, useCallback } from 'react'
import { PostcardFront } from './PostcardFront'
import { PostcardBack } from './PostcardBack'
import { usePostcardState } from '../../hooks/usePostcardState'
import type { Address } from '../../types/address'
import './EnhancedInteractivePostcard.css'

interface EnhancedInteractivePostcardProps {
  onStateChange?: (state: any) => void
  onSubmit?: (data: {
    image: File | null
    message: string
    recipientAddress: Address | null
    senderAddress: Address | null
  }) => void
  className?: string
}

// Animation timing constants
const FLIP_DURATION = 600
const FADE_DURATION = 300
const VELOCITY_THRESHOLD = 0.5

export function EnhancedInteractivePostcard({
  onStateChange,
  onSubmit,
  className = ''
}: EnhancedInteractivePostcardProps) {
  const {
    state,
    isLoading,
    isDirty,
    lastSaved,
    canUndo,
    canRedo,
    undo,
    redo,
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
    progress
  } = usePostcardState()

  const [isKeyboardNavVisible, setIsKeyboardNavVisible] = useState(false)
  const [announceToScreenReader, setAnnounceToScreenReader] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const flipButtonRef = useRef<HTMLButtonElement>(null)

  // Announce changes to screen readers
  const announce = useCallback((message: string) => {
    setAnnounceToScreenReader(message)
    setTimeout(() => setAnnounceToScreenReader(''), 1000)
  }, [])

  // Handle flip with announcement
  const handleFlip = useCallback((trigger: string = 'button click') => {
    flip()
    const newSide = state.isFlipped ? 'front' : 'back'
    announce(`Flipped to ${newSide} side. ${trigger}`)
  }, [flip, state.isFlipped, announce])

  // Custom gesture handling
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const startTime = Date.now()

    const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
      const deltaX = currentX - startX
      const deltaTime = Date.now() - startTime

      // No-op during drag - just tracking
    }

    const handleDragEnd = (endEvent: MouseEvent | TouchEvent) => {
      const endX = 'changedTouches' in endEvent ? endEvent.changedTouches[0].clientX : endEvent.clientX
      const deltaX = endX - startX
      const deltaTime = Date.now() - startTime
      const velocity = Math.abs(deltaX) / deltaTime

      if (velocity > VELOCITY_THRESHOLD) {
        // Swipe detected
        if (deltaX < 0 && !state.isFlipped) {
          handleFlip('swipe left')
        } else if (deltaX > 0 && state.isFlipped) {
          handleFlip('swipe right')
        }
      }

      // Clean up event listeners
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mouseup', handleDragEnd)
      document.removeEventListener('touchmove', handleDragMove)
      document.removeEventListener('touchend', handleDragEnd)
    }

    // Add event listeners
    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
    document.addEventListener('touchmove', handleDragMove)
    document.addEventListener('touchend', handleDragEnd)
  }, [state.isFlipped, handleFlip])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Use wheel to flip with modifier key
    if (e.shiftKey) {
      e.preventDefault()
      handleFlip('scroll wheel with shift')
    }
  }, [handleFlip])

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(state)
  }, [state, onStateChange])

  // Handle keyboard navigation visibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show keyboard shortcuts help with ?
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        setIsKeyboardNavVisible(prev => !prev)
      }
      // Hide with Escape
      if (e.key === 'Escape') {
        setIsKeyboardNavVisible(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Handle form submission
  const handleSubmit = async () => {
    if (validate()) {
      setIsUploading(true)
      try {
        const data = exportState()
        onSubmit?.({
          image: data.image?.file || null,
          message: data.message,
          recipientAddress: data.recipientAddress,
          senderAddress: data.senderAddress
        })
        announce('Postcard submitted successfully!')
      } catch (error) {
        setError('submit', 'Failed to submit postcard. Please try again.')
        announce('Error submitting postcard')
      } finally {
        setIsUploading(false)
      }
    } else {
      announce('Please fill in all required fields')
      // Focus on first error field (type-safe approach)
      const firstErrorField = document.querySelector('[aria-invalid="true"]')
      if (firstErrorField instanceof HTMLElement) {
        firstErrorField.focus()
      }
    }
  }

  // Clear draft with confirmation
  const handleClearDraft = () => {
    if (isDirty && window.confirm('Are you sure you want to clear your draft? This cannot be undone.')) {
      clearDraft()
      announce('Draft cleared')
    }
  }

  // Focus management
  useEffect(() => {
    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && containerRef.current) {
        // Get focusable elements with type safety
        const focusableElementSelectors = [
          'button', '[href]', 'input', 'select', 'textarea', '[tabindex]:not([tabindex="-1"])'
        ]
        const nodeList = containerRef.current.querySelectorAll(focusableElementSelectors.join(', '))
        const focusableElements: HTMLElement[] = Array.from(nodeList).filter(
          node => node instanceof HTMLElement
        )

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    if (containerRef.current) {
      containerRef.current.addEventListener('keydown', handleFocusTrap)
    }

    return () => {
      containerRef.current?.removeEventListener('keydown', handleFocusTrap)
    }
  }, [])

  return (
    <div className={`enhanced-postcard-wrapper ${className}`} ref={containerRef}>
      {/* Screen Reader Announcements */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announceToScreenReader}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div
          className="loading-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          style={{
            animation: `fadeIn ${FADE_DURATION}ms ease-out`
          }}
        >
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="loading loading-spinner loading-lg mb-4"></div>
            <p className="text-lg font-medium">Loading your draft...</p>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="progress-bar-container mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">
            Progress: {progress.completed} of {progress.total}
          </span>
          {isDirty && (
            <span className="text-xs text-gray-500">
              {lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : 'Saving...'}
            </span>
          )}
        </div>
        <div className="progress bg-gray-200 h-2 rounded-full overflow-hidden">
          <div
            className="progress-bar bg-accent-blue h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Error Display */}
      {Object.values(state.errors).some(error => error) && (
        <div className="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h3 className="font-bold">Please fix the following errors:</h3>
            <ul className="mt-1">
              {Object.entries(state.errors).map(([field, error]) => (
                error && <li key={field} className="text-sm">{error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 3D Postcard Container */}
      <div className="flex flex-col items-center space-y-6">
        <div
          className="postcard-3d-container"
          style={{ perspective: '1200px' }}
          role="region"
          aria-label={`Interactive postcard ${state.isFlipped ? 'back' : 'front'} side`}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          onWheel={handleWheel}
        >
          <div
            className="postcard-flipper"
            style={{
              transformStyle: 'preserve-3d',
              position: 'relative',
              transform: `rotateY(${state.isFlipped ? 180 : 0}deg)`,
              transition: `transform ${FLIP_DURATION}ms cubic-bezier(0.4, 0.0, 0.2, 1)`
            }}
          >
            {/* Front Side */}
            <div
              className="postcard-face postcard-front"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(0deg)'
              }}
            >
              <PostcardFront
                imageData={state.image?.preview}
                onImageUpload={(image) => setImage(image)}
                onError={(error) => setError('image', error)}
                showSafeZones={state.showSafeZones}
              />
            </div>

            {/* Back Side */}
            <div
              className="postcard-face postcard-back"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <PostcardBack
                message={state.message}
                recipientAddress={state.recipientAddress}
                senderAddress={state.senderAddress}
                onMessageChange={setMessage}
                onRecipientAddressChange={setRecipientAddress}
                onSenderAddressChange={setSenderAddress}
                onError={(field, error) => setError(field, error)}
                showSafeZones={state.showSafeZones}
              />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="controls-container flex flex-col items-center space-y-4">
          {/* Flip Button */}
          <button
            ref={flipButtonRef}
            onClick={() => handleFlip('button click')}
            className="btn btn-primary btn-circle btn-lg shadow-lg hover:scale-105 transition-transform"
            aria-label={`Show ${state.isFlipped ? 'front' : 'back'} side`}
            disabled={state.isUploading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>

          {/* Side Indicator */}
          <div className="flex items-center space-x-2 text-sm text-gray-600" role="tablist">
            <span
              className={`px-3 py-1 rounded-full transition-colors ${
                !state.isFlipped
                  ? 'bg-accent-blue text-white font-medium'
                  : 'bg-gray-200 text-gray-600'
              }`}
              role="tab"
              aria-selected={!state.isFlipped}
              tabIndex={!state.isFlipped ? 0 : -1}
            >
              Front
            </span>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <span
              className={`px-3 py-1 rounded-full transition-colors ${
                state.isFlipped
                  ? 'bg-accent-blue text-white font-medium'
                  : 'bg-gray-200 text-gray-600'
              }`}
              role="tab"
              aria-selected={state.isFlipped}
              tabIndex={state.isFlipped ? 0 : -1}
            >
              Back
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={toggleSafeZones}
              className={`btn btn-sm ${state.showSafeZones ? 'btn-primary' : 'btn-outline'}`}
              aria-pressed={state.showSafeZones}
            >
              {state.showSafeZones ? 'Hide' : 'Show'} Safe Zones
            </button>

            <button
              onClick={undo}
              className="btn btn-sm btn-outline"
              disabled={!canUndo}
              aria-label="Undo last action"
              title="Undo (Ctrl+Z)"
            >
              ↶ Undo
            </button>

            <button
              onClick={redo}
              className="btn btn-sm btn-outline"
              disabled={!canRedo}
              aria-label="Redo last action"
              title="Redo (Ctrl+Y)"
            >
              ↷ Redo
            </button>

            <button
              onClick={handleClearDraft}
              className="btn btn-sm btn-outline btn-error"
              aria-label="Clear draft"
              title="Clear draft"
            >
              🗑️ Clear
            </button>

            <button
              onClick={handleSubmit}
              className="btn btn-sm btn-success"
              disabled={state.isUploading || progress.percentage < 100}
              aria-label="Submit postcard"
            >
              {state.isUploading ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        {isKeyboardNavVisible && (
          <div
            className="keyboard-help bg-gray-100 rounded-lg p-4 text-sm max-w-md"
            style={{
              animation: 'slideUp 0.3s ease-out'
            }}
          >
            <h3 className="font-bold mb-2">Keyboard Shortcuts:</h3>
            <ul className="space-y-1">
              <li><kbd>Ctrl</kbd> + <kbd>Z</kbd> - Undo</li>
              <li><kbd>Ctrl</kbd> + <kbd>Y</kbd> - Redo</li>
              <li><kbd>Ctrl</kbd> + <kbd>S</kbd> - Save draft</li>
              <li><kbd>Shift</kbd> + Scroll - Flip postcard</li>
              <li><kbd>?</kbd> - Toggle this help</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}