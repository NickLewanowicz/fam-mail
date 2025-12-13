import { useState } from 'react'
import { InteractivePostcard } from './InteractivePostcard'
import { submitEnhancedPostcard, savePostcardDraft, validateAddress, type PostcardResponse } from '../../utils/api'
import type { Address } from '../../types/address'

export function AltPostcardBuilder() {
  const [imageData, setImageData] = useState<string | undefined>()
  const [message, setMessage] = useState<string>('')
  const [address, setAddress] = useState<Address | null>(null)
  const [fontSelection] = useState({ family: 'Arial', size: '24px' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [submissionSuccess, setSubmissionSuccess] = useState<PostcardResponse | null>(null)
  const [draftSaved, setDraftSaved] = useState(false)

  const handleImageUpload = (data: string) => {
    setImageData(data)
  }

  const handleMessageChange = (newMessage: string) => {
    setMessage(newMessage)
  }

  const handleAddressChange = (newAddress: Address) => {
    setAddress(newAddress)
  }

  const handleSubmit = async () => {
    if (!address || !imageData) {
      setSubmissionError('Please add an image and recipient address')
      return
    }

    setIsSubmitting(true)
    setSubmissionError(null)
    setDraftSaved(false)

    try {
      // Validate address first
      const addressValidation = await validateAddress(address)
      if (!addressValidation.valid) {
        throw new Error(addressValidation.errors?.join(', ') || 'Invalid address')
      }

      const response = await submitEnhancedPostcard({
        address: addressValidation.normalizedAddress || address,
        imageBase64: imageData,
        message: message.trim() || undefined,
        fontSelection,
        includeBackSide: !!message.trim()
      })

      setSubmissionSuccess(response)
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Failed to send postcard')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveDraft = async () => {
    setIsSavingDraft(true)
    setDraftSaved(false)

    try {
      await savePostcardDraft({
        address: address || undefined,
        imageBase64: imageData,
        message: message.trim() || undefined,
        fontSelection
      })
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 3000)
    } catch (error) {
      console.error('Failed to save draft:', error)
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleReset = () => {
    setImageData(undefined)
    setMessage('')
    setAddress(null)
    setSubmissionError(null)
    setSubmissionSuccess(null)
    setDraftSaved(false)
  }

  const isReadyToSend = address &&
    address.firstName &&
    address.lastName &&
    address.addressLine1 &&
    address.city &&
    address.provinceOrState &&
    address.postalOrZip &&
    imageData

  return (
    <div className="min-h-screen bg-bg-secondary py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Create a Postcard
          </h1>
          <p className="text-text-secondary">
            Add a photo, write a message, and send it to someone special.
          </p>
        </div>

        {/* Interactive Postcard */}
        <div className="flex justify-center">
          <InteractivePostcard
            imageData={imageData}
            message={message}
            address={address}
            onImageUpload={handleImageUpload}
            onMessageChange={handleMessageChange}
            onAddressChange={handleAddressChange}
          />
        </div>

        {/* Action Buttons */}
        <div className="max-w-md mx-auto mt-8 space-y-4">
          {isReadyToSend && (
            <button
              className={`btn btn-lg btn-primary w-full font-semibold ${
                isSubmitting ? 'loading' : ''
              }`}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Postcard'}
            </button>
          )}

          <div className="flex gap-4">
            <button
              className={`btn btn-outline flex-1 ${isSavingDraft ? 'loading' : ''}`}
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
            >
              {isSavingDraft ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              className="btn btn-ghost flex-1"
              onClick={handleReset}
            >
              Clear All
            </button>
          </div>

          {draftSaved && (
            <div className="alert alert-success">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Draft saved successfully!
            </div>
          )}

          {submissionError && (
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{submissionError}</span>
            </div>
          )}
        </div>

        {/* Success Message */}
        {submissionSuccess && (
          <div className="max-w-2xl mx-auto mt-8">
            <div className="card card-elevated bg-success bg-opacity-10 border border-success">
              <div className="card-body text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="card-title text-success text-2xl mb-2">Postcard Sent!</h3>
                <p className="text-text-secondary mb-4">
                  Your postcard has been submitted and will be sent to {address?.firstName} {address?.lastName}.
                </p>
                <div className="card-actions justify-center">
                  <button
                    className="btn btn-primary"
                    onClick={handleReset}
                  >
                    Create Another Postcard
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="max-w-2xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card card-elevated p-4 text-center">
            <div className="w-12 h-12 bg-accent-blue bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-text-primary mb-1">Add Photo</h3>
            <p className="text-sm text-text-secondary">Click the front to upload an image</p>
          </div>

          <div className="card card-elevated p-4 text-center">
            <div className="w-12 h-12 bg-accent-blue bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <h3 className="font-semibold text-text-primary mb-1">Flip Card</h3>
            <p className="text-sm text-text-secondary">Use the flip button to see the back</p>
          </div>

          <div className="card card-elevated p-4 text-center">
            <div className="w-12 h-12 bg-accent-blue bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="font-semibold text-text-primary mb-1">Write Message</h3>
            <p className="text-sm text-text-secondary">Click the message area to type</p>
          </div>
        </div>
      </div>
    </div>
  )
}