import { useState, useEffect } from 'react'
import { Header } from './components/layout/Header'
import { StatusCard } from './components/status/StatusCard'
import { AddressForm } from './components/address/AddressForm'
import { ImageUpload } from './components/postcard/ImageUpload'
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

          {recipientAddress && (
            <div className="alert alert-success">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Recipient address saved: {recipientAddress.firstName} {recipientAddress.lastName}, {recipientAddress.city}, {recipientAddress.provinceOrState}</span>
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
