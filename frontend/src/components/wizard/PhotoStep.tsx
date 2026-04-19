import { useCallback, useRef, useState } from 'react'
import type { PostcardImage } from '../../hooks/usePostcard'

const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface Props {
  image: PostcardImage | null
  onImageChange: (img: PostcardImage | null) => void
  onNext: () => void
}

export function PhotoStep({ image, onImageChange, onNext }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processFile = useCallback((file: File) => {
    setError(null)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please upload a JPEG, PNG, or WebP image')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('Image must be under 10MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      onImageChange({ file, preview: reader.result as string })
    }
    reader.readAsDataURL(file)
  }, [onImageChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Choose a Photo</h2>
        <p className="text-base-content/60 text-sm mt-1">This will be the front of your postcard</p>
      </div>

      {image ? (
        <div className="space-y-3">
          <div className="aspect-[3/2] rounded-lg overflow-hidden bg-base-200">
            <img src={image.preview} alt="Selected" className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => inputRef.current?.click()}>Change photo</button>
            <button className="btn btn-ghost btn-sm text-error" onClick={() => onImageChange(null)}>Remove</button>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-primary/50'}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="text-4xl mb-3 opacity-40">&#x1F4F7;</div>
          <p className="font-medium">Drop an image here or click to browse</p>
          <p className="text-sm text-base-content/50 mt-1">JPEG, PNG, or WebP up to 10MB</p>
        </div>
      )}

      {error && <div className="alert alert-error text-sm py-2"><span>{error}</span></div>}

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = '' }} />

      <div className="flex justify-end pt-2">
        <button className="btn btn-primary" disabled={!image} onClick={onNext}>
          Next: Write Message
        </button>
      </div>
    </div>
  )
}
