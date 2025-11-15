interface ImageUploadProps {
  onImageSelect?: (file: File) => void
  isOpen?: boolean
  onToggle?: () => void
}

export function ImageUpload({ onImageSelect, isOpen = false, onToggle }: ImageUploadProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onImageSelect) {
      onImageSelect(file)
    }
  }

  return (
    <div className="collapse collapse-arrow bg-base-100 shadow-xl">
      <input type="checkbox" checked={isOpen} onChange={onToggle || (() => {})} />
      <div className="collapse-title text-xl font-medium">
        Postcard Image
      </div>
      <div className="collapse-content">
        <div className="space-y-4">
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Image upload functionality coming soon!</span>
          </div>

          <div className="form-control w-full">
            <label htmlFor="postcard-image-upload" className="label">
              <span className="label-text">Upload your postcard image</span>
            </label>
            <input 
              id="postcard-image-upload"
              type="file" 
              className="file-input file-input-bordered w-full" 
              accept="image/*"
              onChange={handleFileChange}
            />
            <label className="label">
              <span className="label-text-alt">Accepted formats: JPG, PNG, GIF (max 10MB)</span>
            </label>
          </div>

          <div className="bg-base-200 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">🖼️</div>
            <p className="text-base-content/70">Image preview will appear here</p>
          </div>
        </div>
      </div>
    </div>
  )
}
