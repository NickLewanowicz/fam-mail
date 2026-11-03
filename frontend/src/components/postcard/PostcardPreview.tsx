import { useEffect, useMemo, useCallback, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { fileToDataUrl } from '../../utils/imageData'
import { motion, useReducedMotion } from 'framer-motion'
import { T } from '../../utils/motion'
import type { Address } from '../../types/address'
import type { PostcardImage } from '../../hooks/usePostcard'
import type { CountryCode, PostcardSize } from '../../utils/postcardTemplate'
import { calculateSafeZones, getCountrySpec, getPostcardDimensions } from '../../utils/postcardTemplate'
import { renderMessageHtml } from '../../utils/messageSanitizer'
import { InlineMessageEditor } from './InlineMessageEditor'
import { InlineAddressForm } from './InlineAddressForm'

const MAX_PHOTO_SIZE = 10 * 1024 * 1024

const SIZE_LABELS: Record<PostcardSize, string> = {
  '6x4': '6×4″',
  '9x6': '9×6″',
  '11x6': '11×6″',
}

export type ActiveZone = 'photo' | 'message' | 'address' | null

interface Props {
  image: string | null
  imageFile?: File | null
  message: string
  address: Address | null
  showBack: boolean
  onFlip: () => void
  activeZone?: ActiveZone
  onImageChange?: (img: PostcardImage | null) => void
  onMessageChange?: (msg: string) => void
  onAddressChange?: (addr: Address) => void
  countryCode?: CountryCode
  size?: PostcardSize
}

export function PostcardPreview({
  image, imageFile, message, address, showBack, onFlip,
  activeZone, onImageChange, onMessageChange, onAddressChange, countryCode, size = '6x4',
}: Props) {
  const [editingMessage, setEditingMessage] = useState(false)
  const [editingAddress, setEditingAddress] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const reduce = useReducedMotion()

  const isPhotoActive = activeZone === 'photo'
  const isMessageActive = activeZone === 'message'
  const isAddressActive = activeZone === 'address'

  // Leaving a step must close its inline editor — otherwise the overlay
  // stays stacked on top of the card while a different step is active.
  useEffect(() => {
    setEditingMessage(false)
    setEditingAddress(false)
  }, [activeZone])

  const messageHtml = useMemo(() => renderMessageHtml(message), [message])

  // Upload plumbing lives in react-dropzone (accept + size validation and
  // drag/drop); we only convert the accepted file to a preview data URL.
  const onDropAccepted = useCallback(async (files: File[]) => {
    let file = files[0]
    if (!file) return
    try {
      // Phone cameras produce 3-8MB shots; downscale before base64 upload
      const imageCompression = (await import('browser-image-compression')).default
      file = await imageCompression(file, { maxSizeMB: 4, maxWidthOrHeight: 2400, useWebWorker: true })
    } catch {
      /* fall back to the original file if compression fails */
    }
    const preview = await fileToDataUrl(file)
    onImageChange?.({ file, preview })
  }, [onImageChange])

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    const code = rejections[0]?.errors[0]?.code
    setPhotoError(code === 'file-too-large' ? 'Image must be under 10MB' : 'Please upload a JPEG, PNG, or WebP image')
  }, [])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    multiple: false,
    disabled: !isPhotoActive,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: MAX_PHOTO_SIZE,
    noClick: true,
    noKeyboard: true,
    onDropAccepted,
    onDropRejected,
  })

  const handleFrontClick = useCallback(() => {
    if (isPhotoActive) open()
  }, [isPhotoActive, open])

  const handleMessageClick = useCallback(() => {
    if (activeZone === 'message' && !editingMessage) setEditingMessage(true)
  }, [activeZone, editingMessage])

  const handleAddressClick = useCallback(() => {
    if (activeZone === 'address' && !editingAddress) setEditingAddress(true)
  }, [activeZone, editingAddress])

  // Divs with role=button don't fire click on Enter/Space — bridge it.
  const zoneKeyDown = useCallback((e: React.KeyboardEvent, activate: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      activate()
    }
  }, [])

  const aspectRatio = size === '11x6' ? '11/6' : '3/2'

  const dimensions = useMemo(() => getPostcardDimensions(size), [size])
  const safeZones = useMemo(() => calculateSafeZones(dimensions, true, countryCode ?? 'US'), [dimensions, countryCode])
  const countrySpec = useMemo(() => getCountrySpec(countryCode ?? 'US'), [countryCode])

  const messageWidthPercent = useMemo(() => {
    if (!safeZones.messageArea) return 60
    return (safeZones.messageArea.width / dimensions.width) * 100
  }, [safeZones, dimensions])

  const addressWidthPercent = useMemo(() => {
    if (!safeZones.addressBlock) return 40
    return (safeZones.addressBlock.width / dimensions.width) * 100
  }, [safeZones, dimensions])

  const dividerLeftPercent = useMemo(() => (1 - countrySpec.addressWidthRatio) * 100, [countrySpec])

  const barcodeZonePercent = useMemo(() => {
    if (!safeZones.barcodeZone) return 0
    return (safeZones.barcodeZone.height / dimensions.height) * 100
  }, [safeZones, dimensions])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          {showBack ? 'Back' : 'Front'} — {SIZE_LABELS[size]}
        </span>
        <button
          onClick={onFlip}
          aria-keyshortcuts="F"
          title="Flip card (F)"
          className="press inline-flex items-center justify-center gap-1 min-h-11 min-w-11 px-1 text-xs font-medium text-warm-text2 hover:text-warm-text"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Flip
        </button>
      </div>

      {photoError && (
        <div className="flex items-center justify-between px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          <span>{photoError}</span>
          <button onClick={() => setPhotoError(null)} className="press text-xs font-medium text-red-700">Dismiss</button>
        </div>
      )}

      <input {...getInputProps()} className="hidden" />

      <div className="relative w-full" style={{ perspective: '1200px' }}>
        <motion.div
          className="relative w-full"
          animate={reduce ? { opacity: 1 } : { rotateY: showBack ? 180 : 0 }}
          transition={T.flip}
          style={{ aspectRatio, transformStyle: 'preserve-3d' }}
        >
          {/* Front */}
          <div
            className={`absolute inset-0 rounded-lg overflow-hidden transition-shadow duration-200 ${
              isPhotoActive ? 'shadow-xl ring-2 ring-warm-ring' : 'shadow-lg'
            } ${isPhotoActive ? 'cursor-pointer' : ''}`}
            style={{
              backfaceVisibility: 'hidden',
              // Reduced motion: crossfade faces instead of rotateY
              opacity: reduce ? (showBack ? 0 : 1) : 1,
              transition: reduce ? 'opacity 150ms linear' : undefined,
            }}
            {...getRootProps()}
            onClick={handleFrontClick}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && isPhotoActive) { e.preventDefault(); handleFrontClick() } }}
            role={isPhotoActive ? 'button' : undefined}
            tabIndex={isPhotoActive ? 0 : undefined}
          >
            {image ? (
              <>
                {imageFile && (
                  <div
                    className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-full bg-zinc-950/60 text-[10px] text-white"
                    title={`${imageFile.name} · ${(imageFile.size / 1024 / 1024).toFixed(2)} MB`}
                  >
                    {imageFile.name.length > 24 ? imageFile.name.slice(0, 21) + '…' : imageFile.name} · {(imageFile.size / 1024 / 1024).toFixed(1)} MB
                  </div>
                )}
                <img src={image} alt="Postcard front" className="w-full h-full object-cover" />
                {isPhotoActive && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-5">
                    <span className="px-3 py-1.5 bg-white text-sm font-medium rounded-md text-zinc-700">
                      Change photo
                    </span>
                  </div>
                )}
                {isPhotoActive && (
                  <button
                    className="press absolute top-1 right-1 w-11 h-11 flex items-center justify-center group/remove"
                    onClick={(e) => { e.stopPropagation(); onImageChange?.(null) }}
                    title="Remove"
                    aria-label="Remove photo"
                  >
                    <span className="w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center transition-colors group-hover/remove:bg-red-600">
                      ×
                    </span>
                  </button>
                )}
              </>
            ) : (
              <div className={`group w-full h-full flex flex-col items-center justify-center transition-colors ${
                isDragActive ? 'bg-clay/10' : isPhotoActive ? 'bg-ink-raised' : 'bg-ink-surface'
              }`}>
                {isPhotoActive ? (
                  <div className={`border-2 border-dashed rounded-lg w-[80%] h-[75%] flex flex-col items-center justify-center gap-2 transition-colors group-hover:border-zinc-400 group-hover:bg-zinc-50 ${
                    isDragActive ? 'border-warm-ring bg-ink-raised' : 'border-ink-line'
                  }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-warm-text2 group-hover:text-warm-text transition-colors">
                      <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-warm-text2">Upload your photo</span>
                    <span className="text-xs text-warm-text3">or drag and drop</span>
                  </div>
                ) : (
                  <span className="text-sm text-warm-text2">Photo</span>
                )}
              </div>
            )}
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-lg overflow-hidden shadow-lg bg-paper"
            style={reduce
              ? {
                  // Reduced motion: crossfade faces instead of rotateY
                  opacity: showBack ? 1 : 0,
                  transition: 'opacity 150ms linear',
                }
              : { backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="h-full flex relative">
              {/* Message area */}
              <div
                className={`relative z-10 p-4 overflow-hidden transition-all duration-200 ${
                  isMessageActive && !editingMessage ? 'cursor-pointer' : ''
                }`}
                style={{ width: `${messageWidthPercent}%` }}
                onClick={handleMessageClick}
                onKeyDown={(e) => zoneKeyDown(e, handleMessageClick)}
                role={isMessageActive && !editingMessage ? 'button' : undefined}
                tabIndex={isMessageActive && !editingMessage ? 0 : undefined}
              >
                {isMessageActive && (
                  <div className="absolute inset-1 rounded ring-2 ring-warm-ring pointer-events-none" />
                )}
                {editingMessage && onMessageChange ? (
                  <InlineMessageEditor
                    message={message}
                    onMessageChange={onMessageChange}
                    onClose={() => setEditingMessage(false)}
                  />
                ) : messageHtml ? (
                  <div className="prose prose-sm max-w-none text-stone-800" style={{ fontSize: '12px', lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: messageHtml }} />
                ) : (
                  <p className="text-stone-600 text-xs italic">
                    {isMessageActive ? 'Click to write...' : 'Your message'}
                  </p>
                )}
              </div>

              {/* Address area */}
              <div
                className={`relative z-10 flex flex-col justify-between overflow-hidden transition-all duration-200 ${
                  isAddressActive && !editingAddress ? 'cursor-pointer' : ''
                }`}
                style={{
                  width: `${addressWidthPercent}%`,
                  // Keep address text clear of the US barcode strip
                  paddingBottom: countryCode === 'US' && barcodeZonePercent > 0 ? `${barcodeZonePercent}%` : undefined,
                }}
                onClick={handleAddressClick}
                onKeyDown={(e) => zoneKeyDown(e, handleAddressClick)}
                role={isAddressActive && !editingAddress ? 'button' : undefined}
                tabIndex={isAddressActive && !editingAddress ? 0 : undefined}
              >
                {isAddressActive && (
                  <div className="absolute inset-1 rounded ring-2 ring-warm-ring pointer-events-none" />
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
                    <div className="flex justify-end">
                      <div className="w-11 h-12 border border-dashed border-stone-300 rounded flex items-center justify-center">
                        <span aria-hidden="true" className="text-stone-300 text-[9px] font-medium">STAMP</span>
                      </div>
                    </div>
                    <div className="mt-auto relative">
                      {address ? (
                        <div className="text-[12px] leading-relaxed text-stone-700">
                          <p className="font-semibold text-stone-800">{address.firstName} {address.lastName}</p>
                          <p>{address.addressLine1}</p>
                          {address.addressLine2 && <p>{address.addressLine2}</p>}
                          <p>{address.city}, {address.provinceOrState} {address.postalOrZip}</p>
                          <p className="text-stone-400">{address.countryCode}</p>
                        </div>
                      ) : (
                        <p className="text-stone-600 text-xs italic">
                          {isAddressActive ? 'Click to add...' : 'Address'}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Divider line */}
              <div
                className="absolute top-3 bottom-3 border-r border-dashed border-stone-200 pointer-events-none"
                style={{ left: `${dividerLeftPercent}%` }}
              />

              {/* US barcode zone */}
              {countryCode === 'US' && barcodeZonePercent > 0 && (
                <div
                  className="absolute left-0 right-0 bg-red-50/30 border-t border-dashed border-red-200/50 flex items-center pointer-events-none"
                  style={{ bottom: 0, height: `${barcodeZonePercent}%` }}
                >
                  <span aria-hidden="true" className="text-[7px] text-red-300/80 tracking-wider pl-2">BARCODE ZONE</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
