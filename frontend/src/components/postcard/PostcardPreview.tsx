import { useMemo, useRef, useCallback, useState } from 'react'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import type { Address } from '../../types/address'
import type { PostcardImage } from '../../hooks/usePostcard'
import type { CountryCode } from '../../utils/postcardTemplate'
import { InlineMessageEditor } from './InlineMessageEditor'
import { InlineAddressForm } from './InlineAddressForm'

const MAX_PHOTO_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export type ActiveZone = 'photo' | 'message' | 'address' | null

interface Props {
  image: string | null
  message: string
  address: Address | null
  showBack: boolean
  onFlip: () => void
  activeZone?: ActiveZone
  onImageChange?: (img: PostcardImage | null) => void
  onMessageChange?: (msg: string) => void
  onAddressChange?: (addr: Address) => void
  countryCode?: CountryCode
}

export function PostcardPreview({
  image,
  message,
  address,
  showBack,
  onFlip,
  activeZone,
  onImageChange,
  onMessageChange,
  onAddressChange,
  countryCode,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [editingMessage, setEditingMessage] = useState(false)
  const [editingAddress, setEditingAddress] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const messageHtml = useMemo(() => {
    if (!message.trim()) return ''
    const raw = marked.parse(message, { async: false }) as string
    return DOMPurify.sanitize(raw)
  }, [message])

  const processFile = useCallback((file: File) => {
    setPhotoError(null)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setPhotoError('Please upload a JPEG, PNG, or WebP image')
      return
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoError('Image must be under 10MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      onImageChange?.({ file, preview: reader.result as string })
    }
    reader.readAsDataURL(file)
  }, [onImageChange])

  const handleFrontClick = useCallback(() => {
    if (activeZone === 'photo') {
      inputRef.current?.click()
    }
  }, [activeZone])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (activeZone === 'photo') {
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    }
  }, [activeZone, processFile])

  const handleMessageClick = useCallback(() => {
    if (activeZone === 'message' && !editingMessage) {
      setEditingMessage(true)
    }
  }, [activeZone, editingMessage])

  const handleAddressClick = useCallback(() => {
    if (activeZone === 'address' && !editingAddress) {
      setEditingAddress(true)
    }
  }, [activeZone, editingAddress])

  const isPhotoActive = activeZone === 'photo'
  const isMessageActive = activeZone === 'message'
  const isAddressActive = activeZone === 'address'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-base-content/60 uppercase tracking-wide">Preview</h3>
        <button onClick={onFlip} className="btn btn-ghost btn-xs gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Flip
        </button>
      </div>

      {photoError && (
        <div className="alert alert-error text-sm py-1">
          <span>{photoError}</span>
          <button onClick={() => setPhotoError(null)} className="btn btn-ghost btn-xs">Dismiss</button>
        </div>
      )}

      {/* Hidden file input for photo upload */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) processFile(f)
          e.target.value = ''
        }}
      />

      {/* Card container with perspective */}
      <div className="relative w-full" style={{ perspective: '1200px' }}>
        <div
          className="relative w-full transition-transform duration-500"
          style={{
            aspectRatio: '3/2',
            transformStyle: 'preserve-3d',
            transform: showBack ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front */}
          <div
            className={`absolute inset-0 rounded-xl shadow-lg overflow-hidden border-2 transition-colors duration-200 ${
              isPhotoActive
                ? 'border-primary shadow-primary/20 shadow-lg'
                : 'border-base-300'
            } ${isPhotoActive ? 'cursor-pointer' : ''}`}
            style={{ backfaceVisibility: 'hidden' }}
            onClick={handleFrontClick}
            onDragOver={(e) => { if (isPhotoActive) { e.preventDefault(); setDragOver(true) } }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            role={isPhotoActive ? 'button' : undefined}
            tabIndex={isPhotoActive ? 0 : undefined}
          >
            {image ? (
              <>
                <img src={image} alt="Postcard front" className="w-full h-full object-cover" />
                {isPhotoActive && (
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                    <span className="btn btn-sm btn-ghost bg-white/80 text-black">Change photo</span>
                  </div>
                )}
                {isPhotoActive && (
                  <button
                    className="absolute top-2 right-2 btn btn-xs btn-error btn-circle opacity-70 hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); onImageChange?.(null) }}
                    title="Remove photo"
                  >
                    ✕
                  </button>
                )}
              </>
            ) : (
              <div className={`w-full h-full flex flex-col items-center justify-center transition-colors ${
                dragOver ? 'bg-primary/10 border-primary' : isPhotoActive ? 'bg-gradient-to-br from-primary/5 to-primary/10' : 'bg-gradient-to-br from-base-200 to-base-300'
              }`}>
                {isPhotoActive && (
                  <div className={`border-2 border-dashed rounded-xl w-[85%] h-[85%] flex flex-col items-center justify-center transition-colors ${
                    dragOver ? 'border-primary bg-primary/5' : 'border-primary/40'
                  }`}>
                    <span className="text-4xl mb-2 opacity-60">📷</span>
                    <span className="text-sm font-medium text-base-content/60">Click to upload photo</span>
                    <span className="text-xs text-base-content/40 mt-1">or drag and drop</span>
                    <span className="text-xs text-base-content/30 mt-2">JPEG, PNG, or WebP up to 10MB</span>
                  </div>
                )}
                {!isPhotoActive && (
                  <>
                    <span className="text-5xl mb-2">&#x1F5BC;&#xFE0F;</span>
                    <span className="text-sm text-base-content/30">Upload a photo</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-xl shadow-lg overflow-hidden border border-base-300 bg-white"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="h-full flex relative">
              {/* Message side (60%) */}
              <div
                className={`relative w-3/5 p-4 border-r border-dashed border-gray-300 overflow-hidden transition-colors duration-200 ${
                  isMessageActive ? 'border-primary/60' : ''
                } ${isMessageActive && !editingMessage ? 'cursor-pointer' : ''}`}
                onClick={handleMessageClick}
                role={isMessageActive && !editingMessage ? 'button' : undefined}
                tabIndex={isMessageActive && !editingMessage ? 0 : undefined}
              >
                {/* Active zone glow */}
                {isMessageActive && (
                  <div className="absolute inset-0 rounded-lg ring-2 ring-primary/30 pointer-events-none" />
                )}
                {editingMessage && onMessageChange ? (
                  <InlineMessageEditor
                    message={message}
                    onMessageChange={onMessageChange}
                    onClose={() => setEditingMessage(false)}
                  />
                ) : messageHtml ? (
                  <div className="prose prose-sm max-w-none text-gray-800" style={{ fontSize: '11px', lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: messageHtml }} />
                ) : (
                  <p className="text-gray-300 text-xs italic">
                    {isMessageActive ? 'Click to write your message...' : 'Your message here...'}
                  </p>
                )}
              </div>

              {/* Address side (40%) */}
              <div
                className={`relative w-2/5 p-4 flex flex-col justify-between overflow-hidden transition-colors duration-200 ${
                  isAddressActive && !editingAddress ? 'cursor-pointer' : ''
                }`}
                onClick={handleAddressClick}
                role={isAddressActive && !editingAddress ? 'button' : undefined}
                tabIndex={isAddressActive && !editingAddress ? 0 : undefined}
              >
                {/* Active zone glow */}
                {isAddressActive && (
                  <div className="absolute inset-0 rounded-lg ring-2 ring-primary/30 pointer-events-none" />
                )}
                {editingAddress && onAddressChange ? (
                  <InlineAddressForm
                    address={address}
                    onAddressChange={onAddressChange}
                    onClose={() => setEditingAddress(false)}
                    countryCode={countryCode}
                  />
                ) : (
                  <>
                    {/* Stamp placeholder */}
                    <div className="flex justify-end">
                      <div className="w-12 h-14 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                        <span className="text-gray-300 text-xs">STAMP</span>
                      </div>
                    </div>
                    {/* Address block */}
                    <div className="mt-auto">
                      {address ? (
                        <div className="font-mono text-xs leading-relaxed text-gray-800">
                          <p>{address.firstName} {address.lastName}</p>
                          <p>{address.addressLine1}</p>
                          {address.addressLine2 && <p>{address.addressLine2}</p>}
                          <p>{address.city}, {address.provinceOrState} {address.postalOrZip}</p>
                          <p>{address.countryCode}</p>
                        </div>
                      ) : (
                        <p className="text-gray-300 text-xs italic font-mono">
                          {isAddressActive ? 'Click to add address...' : 'Recipient address...'}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-center text-base-content/40">6" x 4" postcard &bull; {showBack ? 'Back' : 'Front'}</p>
    </div>
  )
}
