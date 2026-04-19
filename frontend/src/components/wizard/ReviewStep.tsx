import type { UsePostcardReturn } from '../../hooks/usePostcard'

interface Props {
  postcard: UsePostcardReturn
  onBack: () => void
  onSend: () => void
  onSaveDraft: () => void
  sending: boolean
  saving: boolean
}

export function ReviewStep({ postcard, onBack, onSend, onSaveDraft, sending, saving }: Props) {
  const { image, message, address, isComplete } = postcard

  return (
    <div className="space-y-4">
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
            {address?.firstName ? `${address.firstName} ${address.lastName}, ${address.city}, ${address.provinceOrState}` : 'Address missing'}
          </span>
        </div>
      </div>

      <div className="divider"></div>

      {/* Actions */}
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
