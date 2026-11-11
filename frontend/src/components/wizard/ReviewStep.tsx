import { useEffect, useState, type MutableRefObject } from 'react'
import type { UsePostcardReturn } from '../../hooks/usePostcard'
import type { WizardStepActions } from './AddressStep'
import { toast } from 'sonner'
import type { PostgridApiMode, PostgridCountryPricing } from '../../utils/postgridApi'
import { PRICE_QUALIFIER, estimateLabel, priceFor, truthCopy } from '../../utils/postcardPricing'
import type { CountryCode } from '../../utils/postcardTemplate'

interface Props {
  postcard: UsePostcardReturn
  onBack: () => void
  onSend: () => void
  onSaveDraft: () => void
  onSchedule: (scheduledFor: string) => Promise<void> | void
  sending: boolean
  saving: boolean
  keyboardHint?: string
  /** M5: lifts send to the sticky bar; sendDisabled mirrors the in-panel gate */
  actionRef?: MutableRefObject<WizardStepActions | null>
  /** ISSUE-0117: PostGrid mode, lifted to CreatePage (single fetch). Absent
   *  = unavailable — the truth line fails closed. */
  mode?: PostgridApiMode | null
  /** D3: server-side price estimates keyed by destination country; absent = no estimates */
  pricing?: PostgridCountryPricing | null
  /** D3: the recipient's destination country — prices resolve against it */
  countryCode?: CountryCode | null
}

function CheckItem({ ok, warn, label }: { ok: boolean; warn?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
        ok ? 'bg-green-100 text-green-700' : warn ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
      }`}>
        {ok ? '✓' : warn ? '!' : '×'}
      </div>
      <span className="text-sm text-stone-600">{label}</span>
    </div>
  )
}

export function ReviewStep({ postcard, onBack, onSend, onSaveDraft, onSchedule, sending, saving, keyboardHint, actionRef, mode = null, pricing = null, countryCode = null }: Props) {
  const [scheduleAt, setScheduleAt] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const { image, message, address, returnAddress, size, setSize, isComplete } = postcard

  // M5: lift send to the sticky bar; the disabled gate rides along so the
  // bar's primary reflects this step's completeness
  useEffect(() => {
    if (!actionRef) return
    actionRef.current = { send: () => onSend(), sendDisabled: !isComplete || sending }
    return () => { actionRef.current = null }
  })

  return (
    <div className="space-y-4">

      <div>
        <h2 className="text-lg font-semibold text-stone-900">Review & Send</h2>
        <p className="text-stone-500 text-sm mt-0.5">Double-check everything before sending</p>
      </div>

      <div className="bg-stone-100 rounded-md border border-stone-200 p-3">
        <CheckItem ok={!!image} label={image ? 'Photo uploaded' : 'Photo missing'} />
        <CheckItem ok={!!message.trim()} warn={!message.trim()} label={message.trim() ? `Message (${message.length} chars)` : 'Message missing — required to send'} />
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
        <label className="text-sm font-medium text-stone-700 mb-2 block">Postcard size</label>
        <div className="flex gap-2">
          {(['6x4', '9x6', '11x6'] as const).map(s => (
            <button
              key={s}
              type="button"
              className={`press flex-1 h-11 scroll-mb-24 flex flex-col items-center justify-center leading-tight rounded-md text-sm font-medium border ${
                size === s
                  ? 'bg-stone-900 text-paper border-stone-900'
                  : 'bg-paper text-stone-600 border-stone-200 hover:border-stone-400'
              }`}
              onClick={() => setSize(s)}
            >
              <span>{s === '6x4' ? '6×4"' : s === '9x6' ? '9×6"' : '11×6"'}</span>
              {/* D3: estimate priced for the recipient's country; hidden when unpriced */}
              {priceFor(pricing, countryCode, s) !== null && (
                <span className="text-[11px] text-current opacity-80">{estimateLabel(priceFor(pricing, countryCode, s) as number)}</span>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-500 mt-1">
          {size === '6x4' ? 'Standard' : size === '9x6' ? 'Large' : 'Extra-large'} — {PRICE_QUALIFIER}
        </p>
      </div>

      <div className="pt-2 space-y-2">
        {/* ISSUE-0117: the truth line lives above Send, max-md hidden — the
            mobile bar strip (#send-truth-bar) carries it at the thumb */}
        <p
          id="send-truth-panel"
          role="status"
          className={`px-3 py-2 rounded-md text-sm ${
            mode === 'live'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : mode === 'test' || mode === 'mock'
                ? 'bg-amber-50 border border-amber-200 text-amber-700'
                : 'bg-stone-100 border border-stone-200 text-stone-500'
          }`}
        >
          {truthCopy(mode, address?.firstName, priceFor(pricing, countryCode, size))}
        </p>
        {/* Schedule for later — uses the drafts schedule API; the backend
            dispatcher mails the draft when the date passes */}
        <details className="rounded-md border border-stone-200 px-3 py-2">
          <summary className="text-sm text-stone-600 cursor-pointer select-none py-3 -my-1">Schedule for later…</summary>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="datetime-local"
              className="flex-1 min-w-0 h-11 rounded-md border border-stone-300 bg-paper px-2.5 text-base text-stone-900 outline-none transition-colors focus:border-stone-500"
              value={scheduleAt}
              min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
              onChange={(e) => setScheduleAt(e.target.value)}
            />
            <button
              className="press h-11 px-3 rounded-md border border-stone-300 text-sm font-medium text-stone-800 hover:border-stone-500 disabled:opacity-50"
              disabled={!scheduleAt || !isComplete || scheduling}
              onClick={async () => {
                const when = new Date(scheduleAt)
                if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
                  toast.error('Pick a date and time in the future')
                  return
                }
                setScheduling(true)
                try {
                  await onSchedule(new Date(scheduleAt).toISOString())
                  setScheduleAt('')
                } finally {
                  setScheduling(false)
                }
              }}
            >
              {scheduling ? 'Scheduling...' : 'Save & schedule'}
            </button>
          </div>
          <p className="text-xs text-stone-500 mt-1.5">The card is saved now and mailed automatically when the date arrives.</p>
        </details>

        <button
          aria-describedby="send-truth-panel"
          className="press active:scale-[0.97] max-md:hidden w-full h-11 bg-clay text-ink-bg text-sm font-medium rounded-md hover:bg-clay-hover disabled:opacity-50 flex items-center justify-center gap-2"
          disabled={!isComplete || sending}
          onClick={onSend}
        >
          {sending ? (
            <>
              <div className="w-4 h-4 border-2 border-ink-bg/40 border-t-ink-bg rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            'Send Postcard'
          )}
        </button>
        {keyboardHint && !sending && (
          <p className="text-center text-[11px] text-stone-500">{keyboardHint}</p>
        )}
        <div className="flex gap-2">
          <button className="press max-md:hidden flex-1 h-11 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-md" onClick={onBack}>
            Back
          </button>
          <button
            className="press flex-1 h-11 scroll-mb-24 text-sm text-stone-600 border border-stone-200 hover:border-stone-300 rounded-md disabled:opacity-50"
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
