import { useState, useCallback } from 'react'
import { PostcardFront } from './PostcardFront'
import { PostcardBack } from './PostcardBack'
import { MessageEditModal } from '../modals/MessageEditModal'
import { AddressEditModal } from '../modals/AddressEditModal'
import type { Address } from '../../types/address'
import type { PostcardImage } from '../../hooks/usePostcardState'
import './InteractivePostcard.css'

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
      <MessageEditModal
        isOpen={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        initialMessage={message}
        onSave={handleMessageSave}
      />

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