import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { usePostcard } from '../hooks/usePostcard'
import { PostcardPreview, type ActiveZone } from '../components/postcard/PostcardPreview'
import { ReviewStep } from '../components/wizard/ReviewStep'
import { CountryStep } from '../components/wizard/CountryStep'
import { AddressStep } from '../components/wizard/AddressStep'
import { getDraft, createDraft, updateDraft } from '../utils/draftApi'
import { submitPostcard, type PostcardResponse } from '../utils/api'

const STEPS = ['Destination', 'Photo', 'Message', 'Address', 'Review'] as const

const STEP_ZONES: ActiveZone[] = [null, 'photo', 'message', 'address', null]

export default function CreatePage() {
  const { id: draftId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const postcard = usePostcard()
  const { setAddress, setReturnAddress, setMessage, setImage, setCountryCode } = postcard
  const [step, setStep] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [loadingDraft, setLoadingDraft] = useState(!!draftId)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<PostcardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeDraftId, setActiveDraftId] = useState<string | null>(draftId ?? null)

  // Load draft if editing
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
          } catch { /* ignore image load failure */ }
        }
        setActiveDraftId(draft.id)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load draft')
      } finally {
        if (!cancelled) setLoadingDraft(false)
      }
    })()
    return () => { cancelled = true }
  }, [draftId, setAddress, setReturnAddress, setMessage, setImage])

  // Auto-show correct side based on step
  useEffect(() => {
    if (step === 1) {
      setShowBack(false) // Front for photo
    } else if (step === 2 || step === 3) {
      setShowBack(true) // Back for message/address
    }
    // Step 0 (destination) and step 4 (review) keep current side
  }, [step])

  const handleNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const handleBack = () => setStep(s => Math.max(s - 1, 0))

  const handleSaveDraft = useCallback(async () => {
    if (!postcard.address) return
    setSaving(true)
    setError(null)
    try {
      let imageData: string | undefined
      if (postcard.image) {
        imageData = postcard.image.preview
      }
      const payload = {
        recipientAddress: postcard.address,
        message: postcard.message || undefined,
        imageData,
        size: '6x4' as const,
      }
      if (activeDraftId) {
        await updateDraft(activeDraftId, payload)
      } else {
        const draft = await createDraft(payload)
        setActiveDraftId(draft.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft')
    } finally {
      setSaving(false)
    }
  }, [postcard.address, postcard.message, postcard.image, activeDraftId])

  const handleSend = useCallback(async () => {
    if (!postcard.address || !postcard.image) return
    setSubmitting(true)
    setError(null)
    try {
      const response = await submitPostcard(postcard.address, postcard.returnAddress ?? postcard.address, postcard.image.file, postcard.message)
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send postcard')
    } finally {
      setSubmitting(false)
    }
  }, [postcard.address, postcard.returnAddress, postcard.image, postcard.message])

  if (loadingDraft) {
    return (
      <AppShell>
        <div className="flex justify-center items-center py-24">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </AppShell>
    )
  }

  // Success state
  if (result?.success) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <div className="text-6xl mb-4">&#x2709;&#xFE0F;</div>
              <h2 className="card-title justify-center text-2xl">Postcard Sent!</h2>
              {result.testMode && <div className="badge badge-warning mx-auto">Test Mode - No physical mail sent</div>}
              {result.postcard && (
                <div className="bg-base-200 rounded-lg p-4 mt-4 text-left space-y-2">
                  <div className="flex justify-between text-sm"><span className="opacity-60">ID</span><span className="font-mono">{result.postcard.id}</span></div>
                  <div className="flex justify-between text-sm"><span className="opacity-60">Status</span><span className="badge badge-sm badge-info">{result.postcard.status}</span></div>
                  <div className="flex justify-between text-sm"><span className="opacity-60">To</span><span>{result.postcard.to.firstName} {result.postcard.to.lastName}</span></div>
                </div>
              )}
              <div className="card-actions justify-center mt-6 gap-3">
                <button onClick={() => { postcard.reset(); setResult(null); setStep(0); setActiveDraftId(null); }} className="btn btn-primary">Create Another</button>
                <button onClick={() => navigate('/')} className="btn btn-ghost">Back to Dashboard</button>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  const activeZone = STEP_ZONES[step]

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Step indicator */}
        <ul className="steps steps-horizontal w-full mb-6">
          {STEPS.map((label, i) => (
            <li key={label} className={`step ${i <= step ? 'step-primary' : ''} cursor-pointer`} onClick={() => setStep(i)}>
              <span className="hidden sm:inline">{label}</span>
            </li>
          ))}
        </ul>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="btn btn-ghost btn-xs">Dismiss</button>
          </div>
        )}

        {/* Integrated preview as editing surface */}
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
              countryCode={postcard.countryCode}
            />
          </div>
        </div>

        {/* Destination step content */}
        {step === 0 && (
          <div className="max-w-[640px] mx-auto mt-6">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <CountryStep
                  countryCode={postcard.countryCode}
                  onCountryChange={setCountryCode}
                  onNext={handleNext}
                />
              </div>
            </div>
          </div>
        )}

        {/* Address step content — collect return address */}
        {step === 3 && (
          <div className="max-w-[640px] mx-auto mt-6">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <AddressStep
                  address={postcard.address}
                  returnAddress={postcard.returnAddress}
                  onAddressChange={setAddress}
                  onReturnAddressChange={setReturnAddress}
                  onNext={handleNext}
                  onBack={handleBack}
                  countryCode={postcard.countryCode}
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons for non-review, non-destination, non-address steps */}
        {step > 0 && step < 4 && step !== 3 && (
          <div className="flex justify-between mt-6 max-w-[640px] mx-auto">
            <button
              className="btn btn-ghost"
              onClick={handleBack}
            >
              Back
            </button>
            <button
              className="btn btn-primary"
              onClick={handleNext}
              disabled={
                (step === 1 && !postcard.image)
              }
            >
              {step === 1 ? 'Next: Write Message' : step === 2 ? 'Next: Add Address' : 'Next: Review'}
            </button>
          </div>
        )}

        {/* Review step content below preview */}
        {step === 4 && (
          <div className="max-w-[640px] mx-auto mt-6">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <ReviewStep
                  postcard={postcard}
                  onBack={handleBack}
                  onSend={handleSend}
                  onSaveDraft={handleSaveDraft}
                  sending={submitting}
                  saving={saving}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
