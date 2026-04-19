import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { usePostcard } from '../hooks/usePostcard'
import { PostcardPreview } from '../components/postcard/PostcardPreview'
import { PhotoStep } from '../components/wizard/PhotoStep'
import { MessageStep } from '../components/wizard/MessageStep'
import { AddressStep } from '../components/wizard/AddressStep'
import { ReviewStep } from '../components/wizard/ReviewStep'
import { getDraft, createDraft, updateDraft } from '../utils/draftApi'
import { submitPostcard, type PostcardResponse } from '../utils/api'

const STEPS = ['Photo', 'Message', 'Address', 'Review'] as const

export default function CreatePage() {
  const { id: draftId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const postcard = usePostcard()
  const { setAddress, setMessage, setImage } = postcard
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
  }, [draftId, setAddress, setMessage, setImage])

  // Auto-show back side on message/address steps
  useEffect(() => {
    setShowBack(step >= 1 && step <= 2)
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
      const response = await submitPostcard(postcard.address, postcard.image.file, postcard.message)
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send postcard')
    } finally {
      setSubmitting(false)
    }
  }, [postcard.address, postcard.image, postcard.message])

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
                <button onClick={() => { postcard.reset(); setResult(null); setStep(0); setActiveDraftId(null) }} className="btn btn-primary">Create Another</button>
                <button onClick={() => navigate('/')} className="btn btn-ghost">Back to Dashboard</button>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Step indicator */}
        <ul className="steps steps-horizontal w-full mb-8">
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

        {/* Main layout: preview + controls */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Postcard Preview */}
          <div className="lg:w-1/2 flex-shrink-0">
            <div className="sticky top-4">
              <PostcardPreview
                image={postcard.image?.preview ?? null}
                message={postcard.message}
                address={postcard.address}
                showBack={showBack}
                onFlip={() => setShowBack(b => !b)}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="lg:w-1/2 min-w-0">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                {step === 0 && (
                  <PhotoStep
                    image={postcard.image}
                    onImageChange={postcard.setImage}
                    onNext={handleNext}
                  />
                )}
                {step === 1 && (
                  <MessageStep
                    message={postcard.message}
                    onMessageChange={postcard.setMessage}
                    onNext={handleNext}
                    onBack={handleBack}
                  />
                )}
                {step === 2 && (
                  <AddressStep
                    address={postcard.address}
                    onAddressChange={postcard.setAddress}
                    onNext={handleNext}
                    onBack={handleBack}
                  />
                )}
                {step === 3 && (
                  <ReviewStep
                    postcard={postcard}
                    onBack={handleBack}
                    onSend={handleSend}
                    onSaveDraft={handleSaveDraft}
                    sending={submitting}
                    saving={saving}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
