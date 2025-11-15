import { useState, useRef } from 'react'
import { generatePreviewHTML, POSTCARD_6X4_DIMENSIONS } from '../../utils/postcardTemplate'
import { submitPostcard, type PostcardResponse } from '../../utils/api'
import type { Address } from '../../types/address'

interface PostcardPreviewCombinedProps {
  recipientAddress: Address
  isOpen?: boolean
  onToggle?: () => void
  onSuccess: (response: PostcardResponse) => void
  onError: (error: string) => void
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']

export function PostcardPreviewCombined({ 
  recipientAddress, 
  isOpen = false, 
  onToggle,
  onSuccess,
  onError
}: PostcardPreviewCombinedProps) {
  const [showSafeZones, setShowSafeZones] = useState(true)
  const [selectedImage, setSelectedImage] = useState<{ file: File; preview: string } | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Invalid file type. Please upload a JPG, PNG, or GIF image.`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`
    }
    return null
  }

  const handleFileSelect = async (file: File) => {
    setUploadError(null)
    
    const error = validateFile(file)
    if (error) {
      setUploadError(error)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const preview = e.target?.result as string
      setSelectedImage({ file, preview })
    }
    reader.onerror = () => {
      setUploadError('Failed to read file')
    }
    reader.readAsDataURL(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    if (!selectedImage) return

    setIsSubmitting(true)
    try {
      const response = await submitPostcard(recipientAddress, selectedImage.file)
      onSuccess({ ...response, selectedImage })
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to send postcard')
    } finally {
      setIsSubmitting(false)
    }
  }

  const frontHTML = selectedImage 
    ? generatePreviewHTML(selectedImage.preview, 'front', showSafeZones)
    : null
  const backHTML = generatePreviewHTML('', 'back', showSafeZones)

  return (
    <div className="collapse collapse-arrow bg-base-100 shadow-xl">
      <input type="checkbox" checked={isOpen} onChange={onToggle || (() => {})} />
      <div className="collapse-title text-xl font-medium">
        Preview
      </div>
      <div className="collapse-content">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="form-control">
              <label className="label cursor-pointer gap-2">
                <span className="label-text">Show Safe Zones</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={showSafeZones}
                  onChange={(e) => setShowSafeZones(e.target.checked)}
                />
              </label>
            </div>
          </div>

          {showSafeZones && (
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm">
                <p className="font-semibold">Safe Zone Guide:</p>
                <ul className="list-disc list-inside mt-1">
                  <li><span className="text-success font-bold">Green</span>: Safe zone - keep important content here</li>
                  <li><span className="text-warning font-bold">Yellow</span>: Bleed zone - design can extend here</li>
                  <li><span className="text-error font-bold">Red</span>: Address block - reserved area</li>
                </ul>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-center">Front</h3>
              <div className="bg-base-200 rounded-lg p-4 flex flex-col justify-center items-center">
                {!selectedImage ? (
                  <div className="w-full">
                    {uploadError && (
                      <div className="alert alert-error mb-4">
                        <span className="text-sm">{uploadError}</span>
                      </div>
                    )}
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                        isDragging
                          ? 'border-primary bg-primary/10'
                          : 'border-base-300 hover:border-primary hover:bg-base-300'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-12 w-12 mx-auto mb-4 opacity-50"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="text-sm mb-2">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs opacity-70">
                        JPG, PNG or GIF (max {MAX_FILE_SIZE / 1024 / 1024}MB)
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ALLOWED_TYPES.join(',')}
                        onChange={handleFileInputChange}
                        className="hidden"
                        id="postcard-front-image"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-full space-y-2">
                    <div
                      style={{
                        width: '100%',
                        maxWidth: `${POSTCARD_6X4_DIMENSIONS.width / 3}px`,
                        height: `${POSTCARD_6X4_DIMENSIONS.height / 3}px`,
                        margin: '0 auto',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                      }}
                    >
                      <iframe
                        srcDoc={frontHTML || ''}
                        title="Postcard Front Preview"
                        style={{
                          width: `${POSTCARD_6X4_DIMENSIONS.width}px`,
                          height: `${POSTCARD_6X4_DIMENSIONS.height}px`,
                          transform: 'scale(0.333)',
                          transformOrigin: 'top left',
                          border: 'none',
                          display: 'block',
                        }}
                        sandbox="allow-same-origin"
                      />
                    </div>
                    <button onClick={handleRemoveImage} className="btn btn-ghost btn-sm btn-block">
                      Change Image
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-center">Back</h3>
              <div className="bg-base-200 rounded-lg p-4 flex justify-center items-center">
                <div
                  style={{
                    width: '100%',
                    maxWidth: `${POSTCARD_6X4_DIMENSIONS.width / 3}px`,
                    height: `${POSTCARD_6X4_DIMENSIONS.height / 3}px`,
                    margin: '0 auto',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                  }}
                >
                  <iframe
                    srcDoc={backHTML}
                    title="Postcard Back Preview"
                    style={{
                      width: `${POSTCARD_6X4_DIMENSIONS.width}px`,
                      height: `${POSTCARD_6X4_DIMENSIONS.height}px`,
                      transform: 'scale(0.333)',
                      transformOrigin: 'top left',
                      border: 'none',
                      display: 'block',
                    }}
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="text-sm text-center opacity-70">
            Dimensions: 6" × 4" (1800px × 1200px at 300 DPI)
          </div>

          {selectedImage && (
            <div className="card bg-primary text-primary-content">
              <div className="card-body">
                <h3 className="card-title">Ready to Send!</h3>
                <p>Your postcard will be sent to {recipientAddress.firstName} {recipientAddress.lastName} in {recipientAddress.city}, {recipientAddress.provinceOrState}.</p>
                <div className="card-actions justify-end">
                  <button
                    className="btn btn-accent"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Send Postcard
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
