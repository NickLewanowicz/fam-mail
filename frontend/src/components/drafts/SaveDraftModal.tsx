import { useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal'
import type { Address } from '../../types/address'
import type { Draft } from '../../types/postcard'
import { createDraft, updateDraft } from '../../utils/draftApi'
import { generateFrontHTML } from '../../utils/postcardTemplate'

interface SaveDraftModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: (draft: Draft) => void
  /** Current editor state */
  recipientAddress: Address | null
  senderAddress?: Address
  message: string
  selectedImage: { file: File; preview: string } | null
  /** If provided, we update this draft instead of creating a new one */
  existingDraftId?: string | null
}

export function SaveDraftModal({
  isOpen,
  onClose,
  onSaved,
  recipientAddress,
  senderAddress,
  message,
  selectedImage,
  existingDraftId,
}: SaveDraftModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = recipientAddress !== null

  const handleSave = async () => {
    if (!recipientAddress) return

    try {
      setIsSaving(true)
      setError(null)

      // Build frontHTML from image
      const frontHTML = selectedImage
        ? generateFrontHTML(selectedImage.preview)
        : undefined

      if (existingDraftId) {
        // Update existing draft
        const draft = await updateDraft(existingDraftId, {
          recipientAddress,
          senderAddress,
          message: message || undefined,
          frontHTML,
          imageData: selectedImage?.preview || undefined,
        })
        onSaved(draft)
      } else {
        // Create new draft
        const draft = await createDraft({
          recipientAddress,
          senderAddress,
          message: message || undefined,
          frontHTML,
          imageData: selectedImage?.preview || undefined,
          size: '4x6',
        })
        onSaved(draft)
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader
        title={existingDraftId ? 'Update Draft' : 'Save as Draft'}
        onClose={onClose}
      />
      <ModalBody>
        {/* Summary of what will be saved */}
        <div className="space-y-3">
          {recipientAddress ? (
            <div className="bg-base-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold opacity-70 mb-1">Recipient</h4>
              <p className="text-sm">
                {recipientAddress.firstName} {recipientAddress.lastName}
              </p>
              <p className="text-xs opacity-60">
                {recipientAddress.city}, {recipientAddress.provinceOrState}
              </p>
            </div>
          ) : (
            <div className="bg-warning/10 rounded-lg p-3">
              <p className="text-sm text-warning">
                A recipient address is required to save a draft.
              </p>
            </div>
          )}

          {message && (
            <div className="bg-base-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold opacity-70 mb-1">Message</h4>
              <p className="text-sm line-clamp-3">{message}</p>
            </div>
          )}

          {selectedImage && (
            <div className="bg-base-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold opacity-70 mb-1">Image</h4>
              <div className="flex items-center gap-2">
                <img
                  src={selectedImage.preview}
                  alt="Postcard image"
                  className="h-12 w-12 object-cover rounded"
                />
                <span className="text-sm">{selectedImage.file.name}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          className="btn btn-ghost"
          onClick={onClose}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!canSave || isSaving}
        >
          {isSaving ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Saving...
            </>
          ) : (
            existingDraftId ? 'Update Draft' : 'Save Draft'
          )}
        </button>
      </ModalFooter>
    </Modal>
  )
}
