import { useState, useRef, useEffect } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { marked } from 'marked'
import { generatePreviewHTML, POSTCARD_6X4_DIMENSIONS } from '../../utils/postcardTemplate'
import { AddressForm } from '../address/AddressForm'
import type { Address } from '../../types/address'

interface PostcardBuilderProps {
  onAddressChange: (address: Address | null) => void
  onImageChange: (image: { file: File; preview: string } | null) => void
  onMessageChange: (message: string) => void
  selectedImage: { file: File; preview: string } | null
  recipientAddress: Address | null
  message: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']

export function PostcardBuilder({
  onAddressChange,
  onImageChange,
  onMessageChange,
  selectedImage,
  recipientAddress,
  message
}: PostcardBuilderProps) {
  const [showSafeZones, setShowSafeZones] = useState(true)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [messageHTML, setMessageHTML] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const convertMarkdown = async () => {
      if (message) {
        const html = await marked(message)
        setMessageHTML(html)
      } else {
        setMessageHTML('')
      }
    }
    convertMarkdown()
  }, [message])

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
      onImageChange({ file, preview })
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
    onImageChange(null)
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const frontHTML = selectedImage
    ? generatePreviewHTML(selectedImage.preview, 'front', showSafeZones)
    : generatePreviewHTML('', 'front', showSafeZones)
  const backHTML = generatePreviewHTML('', 'back', showSafeZones, messageHTML)

  // Handle address form submission
  const handleAddressSubmit = (address: Address) => {
    onAddressChange(address)
  }

  // Calculate progress for visual feedback
  const progressSteps = [
    recipientAddress?.firstName && recipientAddress?.lastName && recipientAddress?.addressLine1,
    message.trim(),
    selectedImage
  ]
  const progressPercentage = (progressSteps.filter(Boolean).length / progressSteps.length) * 100

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Create Your Postcard</h2>
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

      {/* Progress Indicator */}
      <div className="w-full bg-base-300 rounded-full h-3">
        <div
          className="bg-primary h-3 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      <p className="text-sm text-center opacity-70">
        Complete: {progressSteps.filter(Boolean).length} of {progressSteps.length} steps
      </p>

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

      {/* Single Column Layout */}
      <div className="space-y-6">
        {/* Step 1: Address */}
        <AddressForm
          onSubmit={handleAddressSubmit}
          initialAddress={recipientAddress || undefined}
        />

        {/* Step 2: Message */}
        <div className="bg-base-100 shadow-xl rounded-lg">
          <div className="p-6">
            <h2 className="text-xl font-medium mb-6">Message Content</h2>
            <div className="space-y-2">
              <label className="label">
                <span className="label-text">Your Message</span>
                <span className="label-text-alt text-xs opacity-70">Markdown with live preview</span>
              </label>
              <div data-color-mode="light">
                <MDEditor
                  value={message}
                  onChange={(val) => onMessageChange(val || '')}
                  preview="live"
                  height={300}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Image Upload and Preview */}
        <div className="bg-base-100 shadow-xl rounded-lg">
          <div className="p-6">
            <h2 className="text-xl font-medium mb-6">Postcard Image</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Upload Image</h3>

                {uploadError && (
                  <div className="alert alert-error">
                    <span className="text-sm">{uploadError}</span>
                  </div>
                )}

                {!selectedImage ? (
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragging
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
                ) : (
                  <div className="space-y-4">
                    <div className="alert alert-success">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{selectedImage.file.name}</span>
                    </div>
                    <button onClick={handleRemoveImage} className="btn btn-ghost btn-block">
                      Change Image
                    </button>
                  </div>
                )}
              </div>

              {/* Preview Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Live Preview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Front Preview */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-center">Front</h4>
                    <div className="bg-base-200 rounded-lg p-3 flex justify-center items-center">
                      <div
                        style={{
                          width: '100%',
                          maxWidth: `${POSTCARD_6X4_DIMENSIONS.width / 4}px`,
                          aspectRatio: '6/4',
                          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                        }}
                      >
                        <iframe
                          srcDoc={frontHTML}
                          title="Postcard Front Preview"
                          style={{
                            width: `${POSTCARD_6X4_DIMENSIONS.width}px`,
                            height: `${POSTCARD_6X4_DIMENSIONS.height}px`,
                            transform: 'scale(0.25)',
                            transformOrigin: 'top left',
                            border: 'none',
                            display: 'block',
                          }}
                          sandbox="allow-same-origin"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Back Preview */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-center">Back</h4>
                    <div className="bg-base-200 rounded-lg p-3 flex justify-center items-center">
                      <div
                        style={{
                          width: '100%',
                          maxWidth: `${POSTCARD_6X4_DIMENSIONS.width / 4}px`,
                          aspectRatio: '6/4',
                          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                        }}
                      >
                        <iframe
                          srcDoc={backHTML}
                          title="Postcard Back Preview"
                          style={{
                            width: `${POSTCARD_6X4_DIMENSIONS.width}px`,
                            height: `${POSTCARD_6X4_DIMENSIONS.height}px`,
                            transform: 'scale(0.25)',
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
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-sm text-center opacity-70">
        Dimensions: 6" × 4" (1800px × 1200px at 300 DPI)
      </div>
    </div>
  )
}
