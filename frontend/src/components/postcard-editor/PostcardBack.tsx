import { useState, useCallback } from 'react'
import type { Address } from '../../types/address'
import { MessageEditor } from './MessageEditor'
import { AddressEditor } from './AddressEditor'
import { getPostalStyles } from '../../utils/postal'

interface PostcardBackProps {
  message: string
  recipientAddress: Address | null
  senderAddress: Address | null
  onMessageChange: (message: string) => void
  onRecipientAddressChange: (address: Address | null) => void
  onSenderAddressChange: (address: Address) => void
  onMessageEdit?: () => void
  onAddressEdit?: () => void
  onError?: (field: string, error: string) => void
  showSafeZones?: boolean
  includeReturnAddress?: boolean
  autoSave?: boolean
}

export function PostcardBack({
  message,
  recipientAddress,
  senderAddress,
  onMessageChange,
  onRecipientAddressChange,
  onSenderAddressChange,
  onMessageEdit,
  onAddressEdit,
  onError,
  showSafeZones = false,
  includeReturnAddress = true,
  autoSave = true,
}: PostcardBackProps) {
  const [editingZone, setEditingZone] = useState<'message' | 'address' | null>(null)

  const postalStyles = getPostalStyles()

  const handleMessageEditingChange = useCallback((isEditing: boolean) => {
    setEditingZone(isEditing ? 'message' : null)
    if (!isEditing && message.trim().length === 0) {
      onError?.('message', 'Message cannot be empty')
    } else {
      onError?.('message', '')
    }
  }, [message, onError])

  const handleAddressEditingChange = useCallback((isEditing: boolean) => {
    setEditingZone(isEditing ? 'address' : null)
    if (!isEditing && recipientAddress) {
      const errors = []
      if (!recipientAddress.firstName || !recipientAddress.lastName) {
        errors.push('Full name is required')
      }
      if (!recipientAddress.addressLine1) {
        errors.push('Street address is required')
      }
      if (!recipientAddress.city) {
        errors.push('City is required')
      }
      if (!recipientAddress.postalOrZip) {
        errors.push('Postal code is required')
      }
      if (errors.length > 0) {
        onError?.('recipientAddress', errors.join(', '))
      } else {
        onError?.('recipientAddress', '')
      }
    }
  }, [recipientAddress, onError])

  return (
    <div className="postcard-back relative w-full h-full bg-white rounded-lg shadow-lg flex overflow-hidden">
      {/* Left side - Message area (60%) */}
      <div
        className={`
          message-area relative transition-all duration-200
          ${editingZone === 'message' ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
          ${onMessageEdit ? 'cursor-pointer hover:bg-blue-50 hover:bg-opacity-20' : ''}
        `}
        style={postalStyles.messageArea}
        onClick={onMessageEdit && !editingZone ? onMessageEdit : undefined}
      >
        <MessageEditor
          message={message}
          onChange={onMessageChange}
          isEditing={editingZone === 'message'}
          onEditingChange={handleMessageEditingChange}
          placeholder={onMessageEdit ? "Click to edit message..." : "Click to add your message..."}
          autoSave={autoSave}
        />
      </div>

      {/* Vertical divider */}
      <div
        className="w-px bg-gray-200 flex-shrink-0"
        style={{
          margin: '16px 0',
        }}
      />

      {/* Right side - Address area (40%) */}
      <div
        className={`
          address-area relative transition-all duration-200
          ${editingZone === 'address' ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
          ${onAddressEdit ? 'cursor-pointer hover:bg-blue-50 hover:bg-opacity-20' : ''}
        `}
        style={postalStyles.addressArea}
        onClick={onAddressEdit && !editingZone ? onAddressEdit : undefined}
      >
        <AddressEditor
          address={recipientAddress}
          onChange={onRecipientAddressChange}
          isEditing={editingZone === 'address'}
          onEditingChange={handleAddressEditingChange}
          includeReturnAddress={includeReturnAddress}
          returnAddress={senderAddress}
          onReturnAddressChange={onSenderAddressChange}
          showSafeZones={showSafeZones}
        />
      </div>

      {/* Edit mode indicator */}
      {editingZone && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full shadow-lg">
            Editing {editingZone === 'message' ? 'message' : 'address'} • Press ESC to finish
          </div>
        </div>
      )}

      {/* Postal compliance indicator */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-400">
        <span className="hidden sm:inline">USPS/Canada Post Compliant</span>
        <span className="sm:hidden">Postal Compliant</span>
      </div>
    </div>
  )
}