import { useState, useEffect } from 'react'
import { Header } from './components/layout/Header'
import { StatusCard } from './components/status/StatusCard'
import { AddressForm } from './components/address/AddressForm'
import { ImageUpload } from './components/postcard/ImageUpload'
import { submitPostcard, type PostcardResponse } from './utils/api'
import type { Address } from './types/address'

interface BackendStatus {
  message?: string
  connected?: boolean
  testMode?: boolean
  error?: string
}

function App() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({})
  const [isLoading, setIsLoading] = useState(true)
  const [recipientAddress, setRecipientAddress] = useState<Address | null>(null)
  const [addressFormOpen, setAddressFormOpen] = useState(true)
  const [imageUploadOpen, setImageUploadOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<{ file: File; preview: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [submissionSuccess, setSubmissionSuccess] = useState<PostcardResponse | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setBackendStatus({ ...data, connected: true })
        setIsLoading(false)
      })
      .catch(err => {
        setBackendStatus({ error: err.message })
        setIsLoading(false)
      })
  }, [])

  const handleAddressSubmit = (address: Address) => {
    setRecipientAddress(address)
    setAddressFormOpen(false)
    setImageUploadOpen(true)
  }

  const handleImageSelect = (file: File, preview: string) => {
    if (file.name) {
      setSelectedImage({ file, preview })
    } else {
      setSelectedImage(null)
    }
  }

  const handleSubmit = async () => {
    if (!recipientAddress || !selectedImage) return

    setIsSubmitting(true)
    setSubmissionError(null)
    setSubmissionSuccess(null)

    try {
      const response = await submitPostcard(recipientAddress, selectedImage.file)
      setSubmissionSuccess(response)
      setAddressFormOpen(false)
      setImageUploadOpen(false)
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Failed to submit postcard')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-base-200" data-theme="fammail">
      <Header testMode={backendStatus.testMode} />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <StatusCard
            isLoading={isLoading}
            connected={backendStatus.connected}
            message={backendStatus.message}
            error={backendStatus.error}
          />

          <div className="space-y-4">
            <AddressForm
              onSubmit={handleAddressSubmit}
              initialAddress={recipientAddress || undefined}
              isOpen={addressFormOpen}
              onToggle={() => setAddressFormOpen(!addressFormOpen)}
            />

            {recipientAddress && (
              <ImageUpload
                onImageSelect={handleImageSelect}
                selectedImage={selectedImage}
                isOpen={imageUploadOpen}
                onToggle={() => setImageUploadOpen(!imageUploadOpen)}
              />
            )}
          </div>

          {submissionError && (
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{submissionError}</span>
            </div>
          )}

          {submissionSuccess && (
            <div className="card bg-success text-success-content shadow-xl">
              <div className="card-body">
                <h2 className="card-title">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Postcard Sent Successfully!
                </h2>
                <p>Your postcard has been submitted to PostGrid.</p>
                {submissionSuccess.postcard && (
                  <div className="space-y-2 mt-4">
                    <p><strong>ID:</strong> {submissionSuccess.postcard.id}</p>
                    <p><strong>Status:</strong> {submissionSuccess.postcard.status}</p>
                    {submissionSuccess.postcard.expectedDeliveryDate && (
                      <p><strong>Expected Delivery:</strong> {new Date(submissionSuccess.postcard.expectedDeliveryDate).toLocaleDateString()}</p>
                    )}
                    {submissionSuccess.testMode && (
                      <div className="badge badge-warning mt-2">Test Mode - No actual postcard will be sent</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {recipientAddress && selectedImage && !submissionSuccess && (
            <div className="card bg-primary text-primary-content shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Ready to Send!</h2>
                <p>Your postcard is ready to be sent to {recipientAddress.firstName} {recipientAddress.lastName} in {recipientAddress.city}, {recipientAddress.provinceOrState}.</p>
                <div className="card-actions justify-end mt-4">
                  <button 
                    className="btn btn-accent" 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Send Postcard
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="footer footer-center p-10 bg-base-300 text-base-content">
        <aside>
          <p className="font-semibold text-lg">Built with ❤️ for keeping in touch</p>
        </aside>
      </footer>
    </div>
  )
}

export default App
