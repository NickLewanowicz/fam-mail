import { useEffect, useState } from 'react'
import type { UsePostcardReturn } from '../../hooks/usePostcard'
import { fetchPostgridStatus, type PostgridApiMode } from '../../utils/postgridApi'

interface Props {
  postcard: UsePostcardReturn
  onBack: () => void
  onSend: () => void
  onSaveDraft: () => void
  sending: boolean
  saving: boolean
}

export function ReviewStep({ postcard, onBack, onSend, onSaveDraft, sending, saving }: Props) {
  const { image, message, address, returnAddress, size, setSize, isComplete } = postcard
  const [postgridMode, setPostgridMode] = useState<PostgridApiMode | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const s = await fetchPostgridStatus()
        if (!cancelled) setPostgridMode(s.mode)
      } catch {
        if (!cancelled) setPostgridMode(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-4">
      {postgridMode === 'test' && (
        <div className="alert alert-warning shadow-sm" role="status">
          <span>This postcard will be sent via PostGrid in TEST mode</span>
        </div>
      )}
      {postgridMode === 'live' && (
        <div className="alert alert-error shadow-sm" role="alert">
          <span>WARNING: This postcard will be ACTUALLY PRINTED AND MAILED (LIVE mode)</span>
        </div>
      )}
      {postgridMode === 'mock' && (
        <div className="alert alert-neutral shadow-sm" role="status">
          <span>This postcard will run in MOCK mode (nothing is sent to PostGrid)</span>
        </div>
      )}
      <div>
        <h2 className="text-xl font-bold">Review Your Postcard</h2>
        <p className="text-base-content/60 text-sm mt-1">Make sure everything looks right before sending</p>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        <div className={`flex items-center gap-2 ${image ? 'text-success' : 'text-error'}`}>
          <span>{image ? '\u2713' : '\u2717'}</span>
          <span className="text-sm">Photo {image ? 'uploaded' : 'missing'}</span>
        </div>
        <div className={`flex items-center gap-2 ${message.trim() ? 'text-success' : 'text-warning'}`}>
          <span>{message.trim() ? '\u2713' : '\u26A0'}</span>
          <span className="text-sm">Message {message.trim() ? `(${message.length} chars)` : '(optional, empty)'}</span>
        </div>
        <div className={`flex items-center gap-2 ${address?.firstName ? 'text-success' : 'text-error'}`}>
          <span>{address?.firstName ? '\u2713' : '\u2717'}</span>
          <span className="text-sm">
            {address?.firstName ? `To: ${address.firstName} ${address.lastName}, ${address.city}, ${address.provinceOrState}` : 'Recipient address missing'}
          </span>
        </div>
        <div className={`flex items-center gap-2 ${returnAddress?.firstName ? 'text-success' : 'text-error'}`}>
          <span>{returnAddress?.firstName ? '\u2713' : '\u2717'}</span>
          <span className="text-sm">
            {returnAddress?.firstName ? `From: ${returnAddress.firstName} ${returnAddress.lastName}, ${returnAddress.city}, ${returnAddress.provinceOrState}` : 'Return address missing'}
          </span>
        </div>
      </div>

      <div className="divider"></div>

      {/* Size selector */}
      <div>
        <label className="label"><span className="label-text font-semibold">Postcard Size</span></label>
        <div className="flex gap-2">
          {(['6x4', '9x6', '11x6'] as const).map(s => (
            <button
              key={s}
              type="button"
              className={`btn btn-sm ${size === s ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSize(s)}
            >
              {s === '6x4' ? '6×4"' : s === '9x6' ? '9×6"' : '11×6"'}
            </button>
          ))}
        </div>
        <p className="text-xs text-base-content/50 mt-1">
          {size === '6x4' ? 'Standard postcard' : size === '9x6' ? 'Large postcard' : 'Extra-large postcard'}
        </p>
      </div>

      <div className="divider"></div>
      <div className="flex flex-col gap-3">
        <button
          className="btn btn-primary btn-lg w-full"
          disabled={!isComplete || sending}
          onClick={onSend}
        >
          {sending ? <><span className="loading loading-spinner loading-sm"></span> Sending...</> : 'Send Postcard'}
        </button>
        <div className="flex gap-2">
          <button className="btn btn-ghost flex-1" onClick={onBack}>Back</button>
          <button
            className="btn btn-outline flex-1"
            disabled={!address?.firstName || saving}
            onClick={onSaveDraft}
          >
            {saving ? <><span className="loading loading-spinner loading-xs"></span> Saving...</> : 'Save as Draft'}
          </button>
        </div>
      </div>
    </div>
  )
}
