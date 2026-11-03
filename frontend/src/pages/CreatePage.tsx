import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { T } from '../utils/motion'
import { toast } from 'sonner'
import { usePostcard } from '../hooks/usePostcard'
import { PostcardPreview, type ActiveZone } from '../components/postcard/PostcardPreview'
import { ReviewStep } from '../components/wizard/ReviewStep'
import { WizardActionBar } from '../components/wizard/WizardActionBar'
import { truthCopy } from '../utils/postcardPricing'
import { fetchPostgridStatus, type PostgridApiMode } from '../utils/postgridApi'
import type { WizardStepActions } from '../components/wizard/AddressStep'
import { CountryStep } from '../components/wizard/CountryStep'
import { AddressStep } from '../components/wizard/AddressStep'
import { getDraft, createDraft, updateDraft, scheduleDraft, listDrafts } from '../utils/draftApi'
import type { Address } from '../types/address'
import { submitPostcard, type PostcardResponse } from '../utils/api'

const STEPS = [
  { key: 'destination', label: 'Destination' },
  { key: 'photo', label: 'Photo' },
  { key: 'message', label: 'Message' },
  { key: 'address', label: 'Address' },
  { key: 'review', label: 'Review' },
] as const

const STEP_ZONES: ActiveZone[] = [null, 'photo', 'message', 'address', null]

// D3: direction-aware step slide (June's spec, slice 3). Wrapper carries a
// min-height so country/nav-only steps don't collapse mid-transition —
// height itself never animates (transform/opacity only).
const stepVariants = {
  enter: (d: number) => ({ x: d * 32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d * -32, opacity: 0 }),
}

export default function CreatePage() {
  const { id: draftId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const postcard = usePostcard()
  const { setAddress, setReturnAddress, setMessage, setImage, setCountryCode, setSize } = postcard
  // [step, direction] — direction drives the D3 slide (1 = forward, -1 = back)
  const [[step, dir], setStepState] = useState<[number, 1 | -1]>([0, 1])
  const goTo = useCallback((next: number) => {
    setStepState(([prev]) => [next, next > prev ? 1 : -1])
  }, [])
  const [showBack, setShowBack] = useState(false)
  // M5: steps 3–4 lift their actions to the sticky bar through these refs
  const addressActionRef = useRef<WizardStepActions | null>(null)
  const reviewActionRef = useRef<WizardStepActions | null>(null)
  // ISSUE-0117: one mode fetch for the whole wizard (truth row + truth line)
  const [postgridMode, setPostgridMode] = useState<PostgridApiMode | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const status = await fetchPostgridStatus()
        if (!cancelled) setPostgridMode(status.mode)
      } catch {
        if (!cancelled) setPostgridMode(null)
      }
    })()
    return () => { cancelled = true }
  }, [])
  const [loadingDraft, setLoadingDraft] = useState(!!draftId)
  const [saving, setSaving] = useState(false)
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<PostcardResponse | null>(null)
  const [activeDraftId, setActiveDraftId] = useState<string | null>(draftId ?? null)
  const [recentRecipients, setRecentRecipients] = useState<Address[]>([])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const state = location.state as {
        prefillRecipient?: Address
        prefillContent?: { imageData?: string; message?: string }
      } | null
      const prefill = state?.prefillRecipient
      if (!prefill?.firstName) return

      // Full structured address (post-#109); fields stay editable on the
      // Address step the user lands on.
      postcard.setAddress(prefill)
      // The preview's safe-zones/return-address derive from the destination
      // country — an "Again" card for CA/GB must not render as US (P3)
      if (prefill.countryCode === 'US' || prefill.countryCode === 'CA' || prefill.countryCode === 'GB') {
        setCountryCode(prefill.countryCode)
      }

      // ISSUE-0114: restore the previous card's photo + message when the
      // record carries them — land on the Message step with everything
      // editable. Legacy cards (no content) keep the recipient-only flow.
      const content = state?.prefillContent
      if (content?.imageData || content?.message) {
        if (content.message) setMessage(content.message)
        if (content.imageData) {
          const dataUrl = content.imageData.startsWith('data:')
            ? content.imageData
            : `data:image/jpeg;base64,${content.imageData}`
          try {
            const res = await fetch(dataUrl)
            const blob = await res.blob()
            const file = new File([blob], 'previous-card.jpg', { type: blob.type || 'image/jpeg' })
            if (!cancelled) setImage({ file, preview: dataUrl })
          } catch {
            if (!cancelled) toast.error('Could not restore the previous photo')
          }
        }
        if (!cancelled) {
          toast.success('Photo and message copied from your last card — edit anything you like')
          goTo(2)
        }
        return
      }

      goTo(3)
    }
    void run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!draftId) return
    let cancelled = false
    ;(async () => {
      try {
        const draft = await getDraft(draftId)
        if (cancelled) return
        setAddress(draft.recipientAddress ?? null)
        setReturnAddress(draft.senderAddress ?? draft.recipientAddress ?? null)
        setMessage(draft.message ?? '')
        if (draft.imageData) {
          // imageData is stored as bare base64 (or already a data URL)
          const isDataUrl = draft.imageData.startsWith('data:')
          const preview = isDataUrl ? draft.imageData : `data:image/jpeg;base64,${draft.imageData}`
          try {
            const res = await fetch(preview)
            const blob = await res.blob()
            const file = new File([blob], 'draft-image.jpg', { type: blob.type || 'image/jpeg' })
            setImage({ file, preview })
          } catch {
            setImage({ file: new File([], 'draft-image.jpg', { type: 'image/jpeg' }), preview })
          }
        }
        if (draft.size) {
          setSize(draft.size as '6x4' | '9x6' | '11x6')
        }
        // #116: restore the destination country so preview safe-zones match
        // the saved address (recipientAddress JSON carries countryCode; older
        // drafts may omit it — leave the default rather than guessing)
        const draftCountry = draft.recipientAddress?.countryCode
        if (draftCountry === 'US' || draftCountry === 'CA' || draftCountry === 'GB') {
          setCountryCode(draftCountry)
        }
        setActiveDraftId(draft.id)
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load draft')
      } finally {
        if (!cancelled) setLoadingDraft(false)
      }
    })()
    return () => { cancelled = true }
  }, [draftId, setAddress, setReturnAddress, setMessage, setImage, setSize, setCountryCode])

  useEffect(() => {
    if (step === 1) setShowBack(false)
    else if (step === 2 || step === 3) setShowBack(true)
  }, [step])

  const handleNext = () => goTo(Math.min(step + 1, STEPS.length - 1))
  const handleBack = () => goTo(Math.max(step - 1, 0))

  /** The draft payload as the backend stores it (bare base64 image data). */
  const draftPayload = useCallback((address: Address) => ({
    recipientAddress: address,
    senderAddress: postcard.returnAddress ?? address,
    message: postcard.message || undefined,
    imageData: postcard.image?.preview.split(',')[1],
    size: postcard.size,
  }), [postcard.returnAddress, postcard.message, postcard.image, postcard.size])

  const handleSaveDraft = useCallback(async () => {
    if (!postcard.address) return
    setSaving(true)
    try {
      const payload = draftPayload(postcard.address)
      if (activeDraftId) {
        await updateDraft(activeDraftId, payload)
      } else {
        const draft = await createDraft(payload)
        setActiveDraftId(draft.id)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save draft')
    } finally {
      setSaving(false)
    }
  }, [postcard.address, activeDraftId, draftPayload])

  // Recent recipients: unique recipient addresses from past drafts
  useEffect(() => {
    let cancelled = false
    listDrafts()
      .then((drafts) => {
        if (cancelled) return
        const seen = new Set<string>()
        const recipients: Address[] = []
        for (const d of drafts) {
          const a = d.recipientAddress as Address | undefined
          if (!a?.firstName || !a.addressLine1) continue
          const key = `${a.firstName}|${a.lastName}|${a.addressLine1}`.toLowerCase()
          if (seen.has(key)) continue
          seen.add(key)
          recipients.push(a)
          if (recipients.length >= 5) break
        }
        setRecentRecipients(recipients)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Warn before leaving with an unfinished card (except during submission,
  // which navigates on purpose).
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (submitting) return
      const hasContent = !!(postcard.image || postcard.message.trim())
      if (hasContent) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [postcard.image, postcard.message, submitting])

  // Keyboard shortcuts: ←/→ move between steps (when not typing), and
  // ⌘/Ctrl+Enter on the review step sends. Both are no-ops inside inputs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
      if (typing) return
      if (e.key === 'ArrowRight' && step < STEPS.length - 1) {
        // Same prerequisite rule as the step buttons
        if (stepComplete[step]) goTo(step + 1)
      } else if (e.key === 'ArrowLeft' && step > 0) {
        goTo(step - 1)
      } else if (e.key === 'f' || e.key === 'F') {
        // D4: flip the preview card (keyboard twin of the Flip button)
        setShowBack(b => !b)
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && step === 4) {
        handleSend()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Autosave: debounce-persist an already-saved draft as the user edits.
  const firstRun = useRef(true)
  useEffect(() => {
    if (!activeDraftId || !postcard.address) return
    if (firstRun.current) { firstRun.current = false; return }
    const recipient = postcard.address
    const sender = postcard.returnAddress ?? postcard.address
    setAutosaveState('saving')
    const timer = setTimeout(async () => {
      try {
        await updateDraft(activeDraftId, {
          recipientAddress: recipient,
          senderAddress: sender,
          message: postcard.message || undefined,
          imageData: postcard.image?.preview.split(',')[1],
          size: postcard.size,
        })
        setAutosaveState('saved')
      } catch {
        setAutosaveState('idle')
      }
    }, 2500)
    return () => clearTimeout(timer)
  }, [activeDraftId, postcard.address, postcard.returnAddress, postcard.message, postcard.image, postcard.size])

  // Save the draft, then hand its send date to the backend dispatcher.
  const handleSchedule = useCallback(async (scheduledFor: string) => {
    if (!postcard.address?.firstName) {
      toast.error('Add a recipient address before scheduling')
      return
    }
    setSaving(true)
    try {
      const payload = draftPayload(postcard.address)
      let draftId = activeDraftId
      if (draftId) {
        await updateDraft(draftId, payload)
      } else {
        const created = await createDraft(payload)
        draftId = created.id
        setActiveDraftId(created.id)
      }
      await scheduleDraft(draftId, scheduledFor)
      toast.success(`Scheduled — the postcard mails on ${new Date(scheduledFor).toLocaleString()}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule draft')
    } finally {
      setSaving(false)
    }
  }, [activeDraftId, postcard.address, draftPayload])

  const handleSend = useCallback(async () => {
    if (!postcard.address || !postcard.image) return
    setSubmitting(true)
    try {
      const response = await submitPostcard(
        postcard.address,
        postcard.returnAddress ?? postcard.address,
        postcard.image.file,
        postcard.message,
        postcard.size,
      )
      setResult(response)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send postcard')
    } finally {
      setSubmitting(false)
    }
  }, [postcard.address, postcard.returnAddress, postcard.image, postcard.message, postcard.size])

  if (loadingDraft) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl" aria-busy="true">
        <span className="sr-only">Loading…</span>
        <div className="flex justify-center pt-2">
          <div className="w-full max-w-[640px]">
            <div className="skeleton motion-reduce:animate-none bg-zinc-200 dark:bg-zinc-800 aspect-[3/2] rounded-lg" aria-hidden />
          </div>
        </div>
      </div>
    )
  }

  if (result?.success) {
    return (
      <>
        <div className="container mx-auto px-4 py-16 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg border border-zinc-200 p-8 text-center"
          >
            <div className="text-5xl mb-4">✉️</div>
            <h2 className="text-xl font-semibold text-zinc-900">Postcard Sent!</h2>
            <p className="text-zinc-500 text-sm mt-1">Your postcard is on its way</p>

            {result.testMode && (
              <div className="inline-flex items-center gap-1 px-2 py-1 mt-3 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded">
                Test Mode
              </div>
            )}

            {result.postcard && (
              <div className="bg-zinc-50 rounded-md border border-zinc-200 p-3 mt-5 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">ID</span>
                  <span className="font-mono text-xs text-zinc-600">{result.postcard.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Status</span>
                  <span className="text-xs font-medium text-blue-600">{result.postcard.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">To</span>
                  <span className="text-zinc-900">{result.postcard.to.firstName} {result.postcard.to.lastName}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 mt-6">
              <button
                onClick={() => { postcard.reset(); setResult(null); goTo(0); setActiveDraftId(null) }}
                className="press active:scale-[0.97] w-full h-10 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800"
              >
                Create Another
              </button>
              <button onClick={() => navigate('/')} className="press text-sm text-zinc-500 hover:text-zinc-700 py-2">
                Back to Dashboard
              </button>
              <button onClick={() => navigate('/history')} className="press text-sm text-zinc-500 hover:text-zinc-700 py-2">
                View postcard history
              </button>
            </div>
          </motion.div>
        </div>
      </>
    )
  }

  const activeZone = STEP_ZONES[step]

  // A step shows ✓ only when its content is actually satisfied — jumping
  // ahead must not mark skipped steps (e.g. Photo) as complete.
  const stepComplete: boolean[] = [
    postcard.countryCode !== null,
    postcard.image !== null,
    postcard.message.trim().length > 0,
    postcard.address !== null,
    false, // Review completes by sending
  ]

  return (
    <>
      <div className="container mx-auto px-4 py-6 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] md:pb-10 max-w-3xl">
        <h1 className="sr-only">Create a postcard</h1>
        {/* Step indicator — numbered circles with connecting lines */}
        <div className="flex items-center justify-center mb-6 pt-1">
          {STEPS.map((s, i) => {
            const isDone = stepComplete[i] && i < step
            const isActive = i === step
            return (
              <div key={s.key} className="flex items-center">
                <button
                  onClick={() => {
                    // Can't jump past steps whose prerequisites are missing
                    if (i <= step || stepComplete[i] || stepComplete[i - 1]) goTo(i)
                  }}
                  className="press flex flex-col items-center gap-1 p-1.5 -m-1.5"
                >
                  <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    isActive
                      ? 'text-ink-bg'
                      : isDone
                        ? 'bg-zinc-900 text-white'
                        : 'border-2 border-ink-line text-warm-text3'
                  }`}>
                    {isActive && (
                      <motion.span
                        layoutId="step-pill"
                        className="absolute inset-0 rounded-full bg-clay"
                        transition={T.micro}
                      />
                    )}
                    <span className="relative z-10">{isDone ? '✓' : i + 1}</span>
                  </div>
                  <span className={`text-[11px] hidden sm:block ${
                    isActive ? 'text-warm-text font-medium' : 'text-warm-text3'
                  }`}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className="relative w-5 md:w-12 h-px mx-1 bg-ink-line">
                    <motion.div
                      className="absolute inset-0 bg-clay origin-left"
                      initial={false}
                      animate={{ scaleX: i < step ? 1 : 0 }}
                      transition={T.micro}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>


        {autosaveState !== 'idle' && (
          <div className="flex justify-end px-2 mb-1" aria-live="polite">
            <span className="text-[11px] text-zinc-400">
              {autosaveState === 'saving' ? 'Saving…' : 'Draft saved'}
            </span>
          </div>
        )}

        {/* Postcard preview — stays on screen while panels scroll (mobile) */}
        {/* overflow-x-clip: the 3D-flipped card's projected subtree extends
            ~15px past the viewport at mobile widths (perspective projection)
            — without this, flipping the card opens a horizontal scroll leak.
            clip (not hidden) so no scroll container is created; the 3D flip
            itself lives one level deeper and is unaffected.
            The preview pins (sticky) only on steps 0–2: the nav-row steps
            benefit from the always-visible card, while Address/Review are
            forms a scrolling thumb must be able to tap — a pinned card
            covers them (and intercepts their taps). */}
        <div
          className={
            step >= 3
              ? 'overflow-x-clip'
              : 'max-md:sticky max-md:top-14 max-md:z-30 max-md:bg-ink-bg max-md:pb-2 overflow-x-clip'
          }
        >
        <div className="flex justify-center">
          {/* overflow-x-hidden: scroll containers CONFINe the 3D card's
              projected overflow; overflow-x-clip on an ancestor proved
              insufficient for Chromium's composited 3D scroll area */}
          <div className="w-full max-w-[640px] overflow-x-hidden">
            <PostcardPreview
              image={postcard.image?.preview ?? null}
              imageFile={postcard.image?.file ?? null}
              message={postcard.message}
              address={postcard.address}
              showBack={showBack}
              onFlip={() => setShowBack(b => !b)}
              activeZone={activeZone}
              onImageChange={setImage}
              onMessageChange={setMessage}
              onAddressChange={setAddress}
              countryCode={postcard.countryCode ?? undefined}
              size={postcard.size}
            />
          </div>
        </div>
        </div>

        {/* Step content — one keyed panel; direction-aware slide (D3) */}
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            custom={dir}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={T.standard}
            className="min-h-[320px] md:min-h-[300px]"
          >
            {step === 0 && (
              <div className="max-w-[640px] mx-auto mt-6">
                <div className="bg-paper rounded-sheet border border-paper-border/60 shadow-xl p-5">
                  <CountryStep
                    countryCode={postcard.countryCode ?? undefined}
                    onCountryChange={setCountryCode}
                    onNext={handleNext}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="max-w-[640px] mx-auto mt-6">
                <div className="bg-paper rounded-sheet border border-paper-border/60 shadow-xl p-5">
                  <AddressStep
                    address={postcard.address}
                    returnAddress={postcard.returnAddress}
                    onAddressChange={setAddress}
                    onReturnAddressChange={setReturnAddress}
                    onNext={handleNext}
                    onBack={handleBack}
                    countryCode={postcard.countryCode ?? undefined}
                    recent={recentRecipients}
                    actionRef={addressActionRef}
                  />
                </div>
              </div>
            )}

            {step > 0 && step < 4 && step !== 3 && (
              <div className="hidden md:flex justify-between mt-6 max-w-[640px] mx-auto">
                <button className="press px-4 py-2 text-sm text-warm-text2 hover:text-warm-text hover:bg-white/5 rounded-md" onClick={handleBack}>
                  ← Back
                </button>
                <button
                  className="press active:scale-[0.97] px-5 py-2 text-sm font-medium bg-clay text-ink-bg rounded-full hover:bg-clay-hover disabled:opacity-50"
                  onClick={handleNext}
                  disabled={step === 1 && !postcard.image}
                >
                  {step === 1 ? 'Write Message →' : 'Add Address →'}
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="max-w-[640px] mx-auto mt-6">
                <div className="bg-paper rounded-sheet border border-paper-border/60 shadow-xl p-5">
                  <ReviewStep
                    postcard={postcard}
                    onBack={handleBack}
                    onSend={handleSend}
                    onSaveDraft={handleSaveDraft}
                    keyboardHint="⌘/Ctrl+Enter to send"
                    onSchedule={handleSchedule}
                    sending={submitting}
                    saving={saving}
                    actionRef={reviewActionRef}
                    mode={postgridMode}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Mobile: thumb-reach sticky action bar (M5) — OUTSIDE AnimatePresence:
            a fixed element inside a transformed (animating) parent degrades to
            absolute positioning and would slide with the step content */}
        {step >= 1 && step <= 4 && (
          <WizardActionBar
            step={step}
            mode={postgridMode}
            truth={truthCopy(postgridMode, postcard.address?.firstName, postcard.size)}
            onBack={handleBack}
            primaryLabel={
              step === 4 ? 'Send Postcard'
                : step === 3 ? 'Next: Review'
                  : step === 1 ? 'Write Message →'
                    : 'Add Address →'
            }
            onPrimary={() => {
              if (step === 3) addressActionRef.current?.submit?.()
              else if (step === 4) reviewActionRef.current?.send?.()
              else handleNext()
            }}
            primaryDisabled={
              (step === 1 && !postcard.image) ||
              (step === 4 && (!!reviewActionRef.current?.sendDisabled || submitting))
            }
            sending={step === 4 && submitting}
          />
        )}
      </div>
    </>
  )
}
