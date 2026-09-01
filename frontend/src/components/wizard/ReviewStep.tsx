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

function CheckItem({ ok, warn, label }: { ok: boolean; warn?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
        ok ? 'bg-green-100 text-green-700' : warn ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
      }`}>
        {ok ? '✓' : warn ? '!' : '×'}
      </div>
      <span className="text-sm text-zinc-600">{label}</span>
    </div>
  )
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
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-4">
      {postgridMode === 'test' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          Test mode — no physical mail will be sent
        </div>
      )}
      {postgridMode === 'live' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          LIVE mode — this will be printed and mailed
        </div>
      )}
      {postgridMode === 'mock' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-50 border border-zinc-200 text-zinc-500 text-sm">
          Mock mode — nothing is sent
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Review & Send</h2>
        <p className="text-zinc-500 text-sm mt-0.5">Double-check everything before sending</p>
      </div>

      <div className="bg-zinc-50 rounded-md border border-zinc-200 p-3">
        <CheckItem ok={!!image} label={image ? 'Photo uploaded' : 'Photo missing'} />
        <CheckItem ok={!!message.trim()} warn={!message.trim()} label={message.trim() ? `Message (${message.length} chars)` : 'No message (optional)'} />
        <CheckItem
          ok={!!address?.firstName}
          label={address?.firstName ? `To: ${address.firstName} ${address.lastName}, ${address.city}` : 'Recipient address missing'}
        />
        <CheckItem
          ok={!!returnAddress?.firstName}
          label={returnAddress?.firstName ? `From: ${returnAddress.firstName} ${returnAddress.lastName}` : 'Return address missing'}
        />
      </div>

      {/* Size selector */}
      <div>
        <label className="text-sm font-medium text-zinc-700 mb-2 block">Postcard size</label>
        <div className="flex gap-2">
          {(['6x4', '9x6', '11x6'] as const).map(s => (
            <button
              key={s}
              type="button"
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors border ${
                size === s
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
              }`}
              onClick={() => setSize(s)}
            >
              {s === '6x4' ? '6×4"' : s === '9x6' ? '9×6"' : '11×6"'}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          {size === '6x4' ? 'Standard' : size === '9x6' ? 'Large' : 'Extra-large'}
        </p>
      </div>

      <div className="pt-2 space-y-2">
        <button
          className="w-full h-10 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          disabled={!isComplete || sending}
          onClick={onSend}
        >
          {sending ? (
            <>
              <div className="w-4 h-4 border-2 border-zinc-400 border-t-white rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            'Send Postcard'
          )}
        </button>
        <div className="flex gap-2">
          <button className="flex-1 h-9 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors" onClick={onBack}>
            Back
          </button>
          <button
            className="flex-1 h-9 text-sm text-zinc-600 border border-zinc-200 hover:border-zinc-300 rounded-md transition-colors disabled:opacity-50"
            disabled={!address?.firstName || saving}
            onClick={onSaveDraft}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      </div>
    </div>
  )
}
