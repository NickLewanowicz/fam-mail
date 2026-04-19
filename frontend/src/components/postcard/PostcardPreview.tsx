import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import type { Address } from '../../types/address'

interface Props {
  image: string | null
  message: string
  address: Address | null
  showBack: boolean
  onFlip: () => void
}

export function PostcardPreview({ image, message, address, showBack, onFlip }: Props) {
  const messageHtml = useMemo(() => {
    if (!message.trim()) return ''
    const raw = marked.parse(message, { async: false }) as string
    return DOMPurify.sanitize(raw)
  }, [message])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-base-content/60 uppercase tracking-wide">Preview</h3>
        <button onClick={onFlip} className="btn btn-ghost btn-xs gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Flip
        </button>
      </div>

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
            className="absolute inset-0 rounded-xl shadow-lg overflow-hidden border border-base-300"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {image ? (
              <img src={image} alt="Postcard front" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-base-200 to-base-300 flex flex-col items-center justify-center text-base-content/30">
                <span className="text-5xl mb-2">&#x1F5BC;&#xFE0F;</span>
                <span className="text-sm">Upload a photo</span>
              </div>
            )}
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-xl shadow-lg overflow-hidden border border-base-300 bg-white"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="h-full flex">
              {/* Message side (60%) */}
              <div className="w-3/5 p-4 border-r border-dashed border-gray-300 overflow-hidden">
                {messageHtml ? (
                  <div className="prose prose-sm max-w-none text-gray-800" style={{ fontSize: '11px', lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: messageHtml }} />
                ) : (
                  <p className="text-gray-300 text-xs italic">Your message here...</p>
                )}
              </div>
              {/* Address side (40%) */}
              <div className="w-2/5 p-4 flex flex-col justify-between">
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
                    <p className="text-gray-300 text-xs italic font-mono">Recipient address...</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-center text-base-content/40">6" x 4" postcard &bull; {showBack ? 'Back' : 'Front'}</p>
    </div>
  )
}
