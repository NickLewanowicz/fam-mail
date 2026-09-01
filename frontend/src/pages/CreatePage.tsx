import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { AppShell } from '../components/layout/AppShell'
import { usePostcard } from '../hooks/usePostcard'
import type { Address } from '../types/address'
import { PostcardPreview, type ActiveZone } from '../components/postcard/PostcardPreview'
import { ReviewStep } from '../components/wizard/ReviewStep'
import { CountryStep } from '../components/wizard/CountryStep'
import { AddressStep } from '../components/wizard/AddressStep'
import { getDraft, createDraft, updateDraft, scheduleDraft } from '../utils/draftApi'
import { submitPostcard, type PostcardResponse } from '../utils/api'

const STEPS = [
  { key: 'destination', label: 'Destination' },
  { key: 'photo', label: 'Photo' },
  { key: 'message', label: 'Message' },
  { key: 'address', label: 'Address' },
  { key: 'review', label: 'Review' },
] as const

const STEP_ZONES: ActiveZone[] = [null, 'photo', 'message', 'address', null]

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: 'easeOut' as const },
}

export default function CreatePage() {
  const { id: draftId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const postcard = usePostcard()
  const { setAddress, setReturnAddress, setMessage, setImage, setCountryCode, setSize } = postcard
  const [step, setStep] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [loadingDraft, setLoadingDraft] = useState(!!draftId)
  const [saving, setSaving] = useState(false)
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<PostcardResponse | null>(null)
  const [activeDraftId, setActiveDraftId] = useState<string | null>(draftId ?? null)

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
          try {
            const res = await fetch(draft.imageData)
            const blob = await res.blob()
            const file = new File([blob], 'draft-image.jpg', { type: blob.type || 'image/jpeg' })
            setImage({ file, preview: draft.imageData })
          } catch { /* ignore */ }
        }
        if (draft.size) {
          setSize(draft.size as '6x4' | '9x6' | '11x6')
        }
        setActiveDraftId(draft.id)
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load draft')
      } finally {
        if (!cancelled) setLoadingDraft(false)
      }
    })()
    return () => { cancelled = true }
  }, [draftId, setAddress, setReturnAddress, setMessage, setImage, setSize])

  useEffect(() => {
    if (step === 1) setShowBack(false)
    else if (step === 2 || step === 3) setShowBack(true)
  }, [step])

  const handleNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const handleBack = () => setStep(s => Math.max(s - 1, 0))

  const handleSaveDraft = useCallback(async () => {
    if (!postcard.address) return
    setSaving(true)
    try {
      const payload = {
        recipientAddress: postcard.address,
        message: postcard.message || undefined,
        imageData: postcard.image?.preview,
        size: postcard.size,
      }
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
  }, [postcard.address, postcard.message, postcard.image, postcard.size, activeDraftId])

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
      const payload = {
        recipientAddress: postcard.address,
        senderAddress: postcard.returnAddress ?? postcard.address,
        message: postcard.message || undefined,
        imageData: postcard.image?.preview.split(',')[1],
        size: postcard.size,
      }
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
  }, [postcard.address, postcard.message, postcard.image, postcard.returnAddress, postcard.size, activeDraftId])

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
      <AppShell>
        <div className="flex justify-center items-center py-32">
          <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  if (result?.success) {
    return (
      <AppShell>
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
                onClick={() => { postcard.reset(); setResult(null); setStep(0); setActiveDraftId(null) }}
                className="w-full h-10 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors"
              >
                Create Another
              </button>
              <button onClick={() => navigate('/')} className="text-sm text-zinc-500 hover:text-zinc-700 py-2">
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        </div>
      </AppShell>
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
    <AppShell>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Step indicator — numbered circles with connecting lines */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((s, i) => {
            const isDone = stepComplete[i] && i < step
            const isActive = i === step
            return (
              <div key={s.key} className="flex items-center">
                <button
                  onClick={() => {
                    // Can't jump past steps whose prerequisites are missing
                    if (i <= step || stepComplete[i] || stepComplete[i - 1]) setStep(i)
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-900 text-white'
                      : isDone
                        ? 'bg-zinc-900 text-white'
                        : 'border-2 border-zinc-300 text-zinc-400'
                  }`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span className={`text-[11px] hidden sm:block ${
                    isActive ? 'text-zinc-900 font-medium' : 'text-zinc-400'
                  }`}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 md:w-12 h-px mx-1 ${i < step ? 'bg-zinc-900' : 'bg-zinc-200'}`} />
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

        {/* Postcard preview */}
        <div className="flex justify-center">
          <div className="w-full max-w-[640px]">
            <PostcardPreview
              image={postcard.image?.preview ?? null}
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

        {/* Step content */}
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="dest" {...pageTransition} className="max-w-[640px] mx-auto mt-6">
              <div className="bg-white rounded-lg border border-zinc-200 p-5">
                <CountryStep
                  countryCode={postcard.countryCode ?? undefined}
                  onCountryChange={setCountryCode}
                  onNext={handleNext}
                />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="addr" {...pageTransition} className="max-w-[640px] mx-auto mt-6">
              <div className="bg-white rounded-lg border border-zinc-200 p-5">
                <AddressStep
                  address={postcard.address}
                  returnAddress={postcard.returnAddress}
                  onAddressChange={setAddress}
                  onReturnAddressChange={setReturnAddress}
                  onNext={handleNext}
                  onBack={handleBack}
                  countryCode={postcard.countryCode ?? undefined}
                />
              </div>
            </motion.div>
          )}

          {step > 0 && step < 4 && step !== 3 && (
            <motion.div key={`nav-${step}`} {...pageTransition} className="flex justify-between mt-6 max-w-[640px] mx-auto">
              <button className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors" onClick={handleBack}>
                ← Back
              </button>
              <button
                className="px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
                onClick={handleNext}
                disabled={step === 1 && !postcard.image}
              >
                {step === 1 ? 'Write Message →' : 'Add Address →'}
              </button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="review" {...pageTransition} className="max-w-[640px] mx-auto mt-6">
              <div className="bg-white rounded-lg border border-zinc-200 p-5">
                <ReviewStep
                  postcard={postcard}
                  onBack={handleBack}
                  onSend={handleSend}
                  onSaveDraft={handleSaveDraft}
                  onSchedule={handleSchedule}
                  sending={submitting}
                  saving={saving}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  )
}
