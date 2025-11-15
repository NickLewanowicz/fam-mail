import { useState } from 'react'
import { generatePreviewHTML, POSTCARD_6X4_DIMENSIONS } from '../../utils/postcardTemplate'

interface PostcardPreviewProps {
  imagePreview: string
  isOpen?: boolean
  onToggle?: () => void
}

export function PostcardPreview({ imagePreview, isOpen = false, onToggle }: PostcardPreviewProps) {
  const [showSafeZones, setShowSafeZones] = useState(true)
  const [currentSide, setCurrentSide] = useState<'front' | 'back'>('front')

  const previewHTML = generatePreviewHTML(imagePreview, currentSide, showSafeZones)

  return (
    <div className="collapse collapse-arrow bg-base-100 shadow-xl">
      <input type="checkbox" checked={isOpen} onChange={onToggle || (() => {})} />
      <div className="collapse-title text-xl font-medium">
        Postcard Preview
      </div>
      <div className="collapse-content">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="btn-group">
              <button
                className={`btn btn-sm ${currentSide === 'front' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCurrentSide('front')}
              >
                Front
              </button>
              <button
                className={`btn btn-sm ${currentSide === 'back' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCurrentSide('back')}
              >
                Back
              </button>
            </div>

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
                  {currentSide === 'back' && (
                    <li><span className="text-error font-bold">Red</span>: Address block - reserved area</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          <div className="bg-base-200 rounded-lg p-4 flex justify-center items-center overflow-auto">
            <div
              style={{
                width: `${POSTCARD_6X4_DIMENSIONS.width / 3}px`,
                height: `${POSTCARD_6X4_DIMENSIONS.height / 3}px`,
                transform: 'scale(1)',
                transformOrigin: 'center center',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              }}
            >
              <iframe
                srcDoc={previewHTML}
                title="Postcard Preview"
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

          <div className="text-sm text-center opacity-70">
            Dimensions: 6" × 4" (1800px × 1200px at 300 DPI)
          </div>
        </div>
      </div>
    </div>
  )
}
