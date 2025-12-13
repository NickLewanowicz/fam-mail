import { Modal, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal'
import { AddressEditor } from '../postcard-editor/AddressEditor'
import { useCallback, useEffect, useState } from 'react'
import type { Address } from '../../types/address'

interface AddressEditModalProps {
  isOpen: boolean
  onClose: () => void
  initialAddress: Address | null
  onSave: (address: Address) => void
  includeReturnAddress?: boolean
  initialReturnAddress?: Address | null
  onReturnAddressSave?: (returnAddress: Address) => void
}

export const AddressEditModal: React.FC<AddressEditModalProps> = ({
  isOpen,
  onClose,
  initialAddress,
  onSave,
  includeReturnAddress = false,
  initialReturnAddress = null,
  onReturnAddressSave
}) => {
  const [address, setAddress] = useState<Address | null>(initialAddress)
  const [returnAddress, setReturnAddress] = useState<Address | null>(initialReturnAddress)
  const [isDirty, setIsDirty] = useState(false)

  // Reset form when modal opens with new initial data
  useEffect(() => {
    if (isOpen) {
      setAddress(initialAddress)
      setReturnAddress(initialReturnAddress)
      setIsDirty(false)
    }
  }, [initialAddress, initialReturnAddress, isOpen])

  const handleAddressChange = useCallback((newAddress: Address) => {
    setAddress(newAddress)
    setIsDirty(true)
  }, [])

  const handleReturnAddressChange = useCallback((newReturnAddress: Address) => {
    setReturnAddress(newReturnAddress)
    setIsDirty(true)
  }, [])

  const handleSave = useCallback(() => {
    if (address) {
      onSave(address)
    }
    if (includeReturnAddress && returnAddress && onReturnAddressSave) {
      onReturnAddressSave(returnAddress)
    }
    setIsDirty(false)
    onClose()
  }, [address, returnAddress, onSave, onReturnAddressSave, includeReturnAddress, onClose])

  const handleCancel = useCallback(() => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }, [isDirty, onClose])

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} size="lg">
      <ModalHeader title="Edit Address" onClose={handleCancel} />
      <ModalBody>
        <div className="max-h-[60vh] overflow-y-auto">
          <AddressEditor
            address={address}
            onChange={handleAddressChange}
            isEditing={true}
            includeReturnAddress={includeReturnAddress}
            returnAddress={returnAddress}
            onReturnAddressChange={handleReturnAddressChange}
            showSafeZones={false}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!isDirty || !address}
        >
          Save Changes
        </button>
      </ModalFooter>
    </Modal>
  )
}