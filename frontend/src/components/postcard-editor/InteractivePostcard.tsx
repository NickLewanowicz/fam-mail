import { useState, useCallback, lazy, Suspense } from 'react'
import { PostcardFront } from './PostcardFront'
import { AddressEditModal } from '../modals/AddressEditModal'
import type { Address } from '../../types/address'
import type { PostcardImage } from '../../hooks/usePostcardState'
import './InteractivePostcard.css'

// Lazy-load PostcardBack — it pulls in MessageEditor which uses the heavy
// markdown editor vendor chunk (~1.1MB). Only load when back side renders.
const PostcardBack = lazy(() =>
  import('./PostcardBack').then(m => ({ default: m.PostcardBack }))
)

// Lazy-load MessageEditModal — conditionally rendered modal that imports
// the heavy markdown editor. Only load when the user opens the modal.
const MessageEditModal = lazy(() =>
  import('../modals/MessageEditModal').then(m => ({ default: m.MessageEditModal }))
)

interface InteractivePostcardProps {
  imageData?: string
  message: string
  address: Address | null
  onImageUpload: (imageData: string) => void
  onMessageChange: (message: string) => void
  onAddressChange: (address: Address) => void
}

export function InteractivePostcard({
  imageData,
  message,
  address,
  onImageUpload,
  onMessageChange,
  onAddressChange
}: InteractivePostcardProps) {
  const [messageModalOpen, setMessageModalOpen] = useState(false)
  const [addressModalOpen, setAddressModalOpen] = useState(false)

  const handleImageUpload = (image: PostcardImage | null) => {
    if (image) {
      onImageUpload(image.preview)
    }
  }

  const handleAddressChange = (newAddress: Address | null) => {
    if (newAddress) {
      onAddressChange(newAddress)
    }
  }

  const handleMessageEdit = useCallback(() => {
    setMessageModalOpen(true)
  }, [])

  const handleMessageSave = useCallback((newMessage: string) => {
    onMessageChange(newMessage)
  }, [onMessageChange])

  const handleAddressEdit = useCallback(() => {
    setAddressModalOpen(true)
  }, [])

  const handleAddressSave = useCallback((newAddress: Address) => {
    onAddressChange(newAddress)
  }, [onAddressChange])


  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Side by Side Postcard Container */}
      <div className="postcard-container">
        {/* Front Side */}
        <div className="postcard-side">
          <div className="postcard-side-container">
            <PostcardFront
              imageData={imageData}
              onImageUpload={handleImageUpload}
            />
          </div>
        </div>

        {/* Back Side */}
        <div className="postcard-side">
          <div className="postcard-side-container">
            <Suspense fallback={<div className="h-[300px] flex items-center justify-center"><span className="loading loading-spinner loading-md text-primary"></span></div>}>
              <PostcardBack
                message={message}
                recipientAddress={address}
                senderAddress={null}
                onMessageChange={onMessageChange}
                onRecipientAddressChange={handleAddressChange}
                onSenderAddressChange={() => {}}
                onMessageEdit={handleMessageEdit}
                onAddressEdit={handleAddressEdit}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Side Labels */}
      <div className="flex items-center space-x-6 text-sm text-gray-600">
        <span className="text-accent-blue font-medium">
          Front Side
        </span>
        <span className="text-accent-blue font-medium">
          Back Side
        </span>
      </div>

      {/* Message Edit Modal */}
      <Suspense fallback={null}>
        <MessageEditModal
          isOpen={messageModalOpen}
          onClose={() => setMessageModalOpen(false)}
          initialMessage={message}
          onSave={handleMessageSave}
        />
      </Suspense>

      {/* Address Edit Modal */}
      <AddressEditModal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        initialAddress={address}
        onSave={handleAddressSave}
      />

    </div>
  )
}