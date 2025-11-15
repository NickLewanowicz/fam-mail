import { useState, useEffect } from 'react'
import { Header } from './components/layout/Header'
import { StatusCard } from './components/status/StatusCard'
import { AddressForm } from './components/address/AddressForm'
import { PostcardPreviewCombined } from './components/postcard/PostcardPreviewCombined'
import type { PostcardResponse } from './utils/api'
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
  const [previewOpen, setPreviewOpen] = useState(false)
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
    setPreviewOpen(true)
  }

  const handleSubmitSuccess = (response: PostcardResponse) => {
    setSubmissionSuccess(response)
    setSubmissionError(null)
  }

  const handleSubmitError = (error: string) => {
    setSubmissionError(error)
    setSubmissionSuccess(null)
  }

  const handleCreateAnother = () => {
    setRecipientAddress(null)
    setSubmissionSuccess(null)
    setSubmissionError(null)
    setAddressFormOpen(true)
    setPreviewOpen(false)
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

          {!submissionSuccess && (
            <div className="space-y-4">
              <AddressForm
                onSubmit={handleAddressSubmit}
                initialAddress={recipientAddress || undefined}
                isOpen={addressFormOpen}
                onToggle={() => setAddressFormOpen(!addressFormOpen)}
              />

              {recipientAddress && (
                <PostcardPreviewCombined
                  recipientAddress={recipientAddress}
                  isOpen={previewOpen}
                  onToggle={() => setPreviewOpen(!previewOpen)}
                  onSuccess={handleSubmitSuccess}
                  onError={handleSubmitError}
                />
              )}
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

          {submissionSuccess && submissionSuccess.postcard && (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-4">
                  <div className="badge badge-success gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Postcard Sent Successfully
                  </div>
                  {submissionSuccess.testMode && (
                    <div className="badge badge-warning">
                      🧪 Test Mode
                    </div>
                  )}
                </div>

                <div className="divider">PostGrid Response</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm opacity-70">Postcard Details</h3>
                    <div className="bg-base-200 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm opacity-70">ID:</span>
                        <span className="text-sm font-mono">{submissionSuccess.postcard.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm opacity-70">Status:</span>
                        <span className="badge badge-sm badge-info">{submissionSuccess.postcard.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm opacity-70">Size:</span>
                        <span className="text-sm">{submissionSuccess.postcard.size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm opacity-70">Live Mode:</span>
                        <span className="text-sm">{submissionSuccess.postcard.live ? 'Yes' : 'No (Test)'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm opacity-70">Delivery Information</h3>
                    <div className="bg-base-200 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm opacity-70">Created:</span>
                        <span className="text-sm">{new Date(submissionSuccess.postcard.createdAt).toLocaleString()}</span>
                      </div>
                      {submissionSuccess.postcard.expectedDeliveryDate && (
                        <div className="flex justify-between">
                          <span className="text-sm opacity-70">Expected Delivery:</span>
                          <span className="text-sm font-semibold">{new Date(submissionSuccess.postcard.expectedDeliveryDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {submissionSuccess.postcard.carrier && (
                        <div className="flex justify-between">
                          <span className="text-sm opacity-70">Carrier:</span>
                          <span className="text-sm">{submissionSuccess.postcard.carrier}</span>
                        </div>
                      )}
                      {submissionSuccess.postcard.trackingNumber && (
                        <div className="flex justify-between">
                          <span className="text-sm opacity-70">Tracking:</span>
                          <span className="text-sm font-mono">{submissionSuccess.postcard.trackingNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {submissionSuccess.selectedImage && (
                  <div className="mt-4 space-y-2">
                    <h3 className="font-semibold text-sm opacity-70">Postcard Image</h3>
                    <div className="bg-base-200 rounded-lg p-3 flex justify-center">
                      <img
                        src={submissionSuccess.selectedImage.preview}
                        alt="Sent postcard"
                        className="max-h-64 w-auto rounded-lg"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  <h3 className="font-semibold text-sm opacity-70">Recipient</h3>
                  <div className="bg-base-200 rounded-lg p-3">
                    <p className="text-sm">
                      {submissionSuccess.postcard.to.firstName} {submissionSuccess.postcard.to.lastName}<br />
                      {submissionSuccess.postcard.to.addressLine1}<br />
                      {submissionSuccess.postcard.to.addressLine2 && <>{submissionSuccess.postcard.to.addressLine2}<br /></>}
                      {submissionSuccess.postcard.to.city}, {submissionSuccess.postcard.to.provinceOrState} {submissionSuccess.postcard.to.postalOrZip}<br />
                      {submissionSuccess.postcard.to.countryCode}
                    </p>
                  </div>
                </div>

                <div className="card-actions justify-between mt-6">
                  <button
                    onClick={handleCreateAnother}
                    className="btn btn-ghost"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Create Another Postcard
                  </button>

                  {submissionSuccess.postcard.url && (
                    <a
                      href={submissionSuccess.postcard.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View on PostGrid
                    </a>
                  )}
                </div>

                {submissionSuccess.testMode && (
                  <div className="alert alert-warning mt-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>This is a test postcard. No physical mail will be sent.</span>
                  </div>
                )}
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
