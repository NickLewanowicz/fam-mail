import { useState } from 'react'
import type { Draft } from '../../types/postcard'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal'

interface DraftCardProps {
  draft: Draft
  onLoad: (draft: Draft) => void
  onDelete: (id: string) => void
  onPublish: (id: string) => void
  isPublishing?: boolean
  isDeleting?: boolean
}

export function DraftCard({
  draft,
  onLoad,
  onDelete,
  onPublish,
  isPublishing = false,
  isDeleting = false,
}: DraftCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const recipient = draft.recipientAddress
  const createdDate = new Date(draft.createdAt).toLocaleDateString()
  const updatedDate = new Date(draft.updatedAt).toLocaleDateString()
  const isReady = draft.state === 'ready'

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false)
    onDelete(draft.id)
  }

  return (
    <div className="card bg-base-100 shadow-md border border-base-300 hover:shadow-lg transition-shadow">
      <div className="card-body p-4">
        {/* Header: recipient + state badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base truncate">
              {recipient.firstName} {recipient.lastName}
            </h3>
            <p className="text-sm opacity-70 truncate">
              {recipient.city}, {recipient.provinceOrState}
            </p>
          </div>
          <div className={`badge badge-sm ${isReady ? 'badge-success' : 'badge-ghost'}`}>
            {isReady ? 'Ready' : 'Draft'}
          </div>
        </div>

        {/* Message preview */}
        {draft.message && (
          <p className="text-sm opacity-60 line-clamp-2 mt-1">
            {draft.message}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs opacity-50 mt-1">
          <span>Created: {createdDate}</span>
          {createdDate !== updatedDate && (
            <span>Updated: {updatedDate}</span>
          )}
          <span className="uppercase font-mono">{draft.size}</span>
        </div>

        {/* Actions */}
        <div className="card-actions justify-end mt-2 gap-2">
          <button
            className="btn btn-sm btn-outline"
            onClick={() => onLoad(draft)}
            disabled={isPublishing || isDeleting}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>

          {!isReady && (
            <button
              className="btn btn-sm btn-primary"
              onClick={() => onPublish(draft.id)}
              disabled={isPublishing || isDeleting}
            >
              {isPublishing ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              )}
              Publish
            </button>
          )}

          <button
            className="btn btn-sm btn-ghost text-error"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isPublishing || isDeleting}
          >
            {isDeleting ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
            Delete
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} size="sm">
        <ModalHeader title="Delete Draft?" onClose={() => setShowDeleteConfirm(false)} />
        <ModalBody>
          <p className="text-sm">
            Are you sure you want to delete the draft for{' '}
            <span className="font-semibold">{recipient.firstName} {recipient.lastName}</span>?
            This action cannot be undone.
          </p>
        </ModalBody>
        <ModalFooter>
          <button
            className="btn btn-ghost"
            onClick={() => setShowDeleteConfirm(false)}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="btn btn-error"
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
