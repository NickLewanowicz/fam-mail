import { useState } from 'react'

interface ImageUploadProps {
  onImageSelect: (file: File, preview: string) => void
  selectedImage?: { file: File; preview: string } | null
  isOpen?: boolean
  onToggle?: () => void
}

export function ImageUpload({ onImageSelect, selectedImage, isOpen = false, onToggle }: ImageUploadProps) {
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const ACCEPTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
  const MAX_FILE_SIZE = 10 * 1024 * 1024

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return 'Please upload a JPG, PNG, or PDF file'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 10MB'
    }
    return null
  }

  const handleFileSelect = async (file: File) => {
    setError(null)
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const preview = e.target?.result as string
      onImageSelect(file, preview)
    }
    reader.onerror = () => {
      setError('Failed to read file. Please try again.')
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleRemove = () => {
    setError(null)
    const emptyFile = new File([], '', { type: 'application/octet-stream' })
    onImageSelect(emptyFile, '')
  }

  return (
    <div className="collapse collapse-arrow bg-base-100 shadow-xl">
      <input type="checkbox" checked={isOpen} onChange={onToggle || (() => { })} />
      <div className="collapse-title text-xl font-medium">
        Postcard Image
      </div>
      <div className="collapse-content">
        <div className="space-y-4">
          {error && (
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {!selectedImage ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? 'border-primary bg-primary/10' : 'border-base-300'
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="text-6xl mb-4">🖼️</div>
              <p className="text-base-content/70 mb-4">
                Drag and drop your image here, or click to browse
              </p>
              <div className="form-control w-full">
                <input
                  id="postcard-image-upload"
                  type="file"
                  className="file-input file-input-bordered w-full"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                />
                <label className="label">
                  <span className="label-text-alt">Accepted formats: JPG, PNG, PDF (max 10MB)</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative bg-base-200 rounded-lg overflow-hidden">
                <img
                  src={selectedImage.preview}
                  alt="Postcard preview"
                  className="w-full h-auto max-h-96 object-contain"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-base-content/70">
                  {selectedImage.file.name} ({(selectedImage.file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
                <button onClick={handleRemove} className="btn btn-ghost btn-sm">
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
