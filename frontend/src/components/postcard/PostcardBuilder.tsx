import { useState, useRef, useEffect } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { marked } from 'marked'
import { generatePreviewHTML, POSTCARD_6X4_DIMENSIONS } from '../../utils/postcardTemplate'
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
  const [activeTab, setActiveTab] = useState<'address' | 'message'>('address')
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Front</h3>
            {selectedImage && (
              <button onClick={handleRemoveImage} className="btn btn-ghost btn-xs">
                Change Image
              </button>
            )}
          </div>

          <div className="bg-base-200 rounded-lg p-3 lg:p-4">
            <div
              className="mx-auto"
              style={{
                width: '100%',
                maxWidth: `${POSTCARD_6X4_DIMENSIONS.width / 3}px`,
                aspectRatio: '6/4',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <iframe
                srcDoc={frontHTML}
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
          </div>

          {uploadError && (
            <div className="alert alert-error">
              <span className="text-sm">{uploadError}</span>
            </div>
          )}

          {!selectedImage ? (
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${isDragging
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
                className="h-10 w-10 mx-auto mb-2 opacity-50"
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
              <p className="text-sm mb-1">
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
            <div className="alert alert-success py-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{selectedImage.file.name}</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Back</h3>

          <div className="bg-base-200 rounded-lg p-3 lg:p-4">
            <div
              className="mx-auto"
              style={{
                width: '100%',
                maxWidth: `${POSTCARD_6X4_DIMENSIONS.width / 3}px`,
                aspectRatio: '6/4',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                position: 'relative',
                overflow: 'hidden',
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

          <div className="card bg-base-100 shadow-lg">
            <div className="card-body p-0">
              <div className="tabs tabs-boxed bg-base-200">
                <button
                  className={`tab tab-md lg:tab-lg flex-1 ${activeTab === 'address' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('address')}
                >
                  Address
                </button>
                <button
                  className={`tab tab-md lg:tab-lg flex-1 ${activeTab === 'message' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('message')}
                >
                  Message
                </button>
              </div>

              <div className="p-3 lg:p-4">
                {activeTab === 'address' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="First Name"
                        className="input input-bordered input-sm lg:input-md"
                        value={recipientAddress?.firstName || ''}
                        onChange={(e) => onAddressChange({
                          ...recipientAddress,
                          firstName: e.target.value,
                          lastName: recipientAddress?.lastName || '',
                          addressLine1: recipientAddress?.addressLine1 || '',
                          city: recipientAddress?.city || '',
                          provinceOrState: recipientAddress?.provinceOrState || '',
                          postalOrZip: recipientAddress?.postalOrZip || '',
                          countryCode: recipientAddress?.countryCode || 'CA',
                        })}
                      />
                      <input
                        type="text"
                        placeholder="Last Name"
                        className="input input-bordered input-sm lg:input-md"
                        value={recipientAddress?.lastName || ''}
                        onChange={(e) => onAddressChange({
                          ...recipientAddress,
                          firstName: recipientAddress?.firstName || '',
                          lastName: e.target.value,
                          addressLine1: recipientAddress?.addressLine1 || '',
                          city: recipientAddress?.city || '',
                          provinceOrState: recipientAddress?.provinceOrState || '',
                          postalOrZip: recipientAddress?.postalOrZip || '',
                          countryCode: recipientAddress?.countryCode || 'CA',
                        })}
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Address Line 1"
                      className="input input-bordered input-sm lg:input-md w-full"
                      value={recipientAddress?.addressLine1 || ''}
                      onChange={(e) => onAddressChange({
                        ...recipientAddress,
                        firstName: recipientAddress?.firstName || '',
                        lastName: recipientAddress?.lastName || '',
                        addressLine1: e.target.value,
                        city: recipientAddress?.city || '',
                        provinceOrState: recipientAddress?.provinceOrState || '',
                        postalOrZip: recipientAddress?.postalOrZip || '',
                        countryCode: recipientAddress?.countryCode || 'CA',
                      })}
                    />

                    <input
                      type="text"
                      placeholder="Address Line 2 (Optional)"
                      className="input input-bordered input-sm lg:input-md w-full"
                      value={recipientAddress?.addressLine2 || ''}
                      onChange={(e) => onAddressChange({
                        ...recipientAddress,
                        firstName: recipientAddress?.firstName || '',
                        lastName: recipientAddress?.lastName || '',
                        addressLine1: recipientAddress?.addressLine1 || '',
                        addressLine2: e.target.value,
                        city: recipientAddress?.city || '',
                        provinceOrState: recipientAddress?.provinceOrState || '',
                        postalOrZip: recipientAddress?.postalOrZip || '',
                        countryCode: recipientAddress?.countryCode || 'CA',
                      })}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="City"
                        className="input input-bordered input-sm lg:input-md"
                        value={recipientAddress?.city || ''}
                        onChange={(e) => onAddressChange({
                          ...recipientAddress,
                          firstName: recipientAddress?.firstName || '',
                          lastName: recipientAddress?.lastName || '',
                          addressLine1: recipientAddress?.addressLine1 || '',
                          city: e.target.value,
                          provinceOrState: recipientAddress?.provinceOrState || '',
                          postalOrZip: recipientAddress?.postalOrZip || '',
                          countryCode: recipientAddress?.countryCode || 'CA',
                        })}
                      />
                      <input
                        type="text"
                        placeholder="Province/State"
                        className="input input-bordered input-sm lg:input-md"
                        value={recipientAddress?.provinceOrState || ''}
                        onChange={(e) => onAddressChange({
                          ...recipientAddress,
                          firstName: recipientAddress?.firstName || '',
                          lastName: recipientAddress?.lastName || '',
                          addressLine1: recipientAddress?.addressLine1 || '',
                          city: recipientAddress?.city || '',
                          provinceOrState: e.target.value,
                          postalOrZip: recipientAddress?.postalOrZip || '',
                          countryCode: recipientAddress?.countryCode || 'CA',
                        })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Postal/Zip Code"
                        className="input input-bordered input-sm lg:input-md"
                        value={recipientAddress?.postalOrZip || ''}
                        onChange={(e) => onAddressChange({
                          ...recipientAddress,
                          firstName: recipientAddress?.firstName || '',
                          lastName: recipientAddress?.lastName || '',
                          addressLine1: recipientAddress?.addressLine1 || '',
                          city: recipientAddress?.city || '',
                          provinceOrState: recipientAddress?.provinceOrState || '',
                          postalOrZip: e.target.value,
                          countryCode: recipientAddress?.countryCode || 'CA',
                        })}
                      />
                      <select
                        className="select select-bordered select-sm lg:select-md"
                        value={recipientAddress?.countryCode || 'CA'}
                        onChange={(e) => onAddressChange({
                          ...recipientAddress,
                          firstName: recipientAddress?.firstName || '',
                          lastName: recipientAddress?.lastName || '',
                          addressLine1: recipientAddress?.addressLine1 || '',
                          city: recipientAddress?.city || '',
                          provinceOrState: recipientAddress?.provinceOrState || '',
                          postalOrZip: recipientAddress?.postalOrZip || '',
                          countryCode: e.target.value,
                        })}
                      >
                        <option value="">Select Country</option>
                        <option value="CA">Canada</option>
                        <option value="US">United States</option>
                        <option value="GB">United Kingdom</option>
                      </select>
                    </div>
                  </div>
                )}

                {activeTab === 'message' && (
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
                )}
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
