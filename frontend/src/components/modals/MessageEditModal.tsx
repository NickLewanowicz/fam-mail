import { Modal, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal'
import MDEditor from '@uiw/react-md-editor'
import { useCallback, useEffect, useState } from 'react'
import { debounce } from 'lodash'

interface MessageEditModalProps {
  isOpen: boolean
  onClose: () => void
  initialMessage: string
  onSave: (message: string) => void
}

export const MessageEditModal: React.FC<MessageEditModalProps> = ({
  isOpen,
  onClose,
  initialMessage,
  onSave
}) => {
  const [message, setMessage] = useState(initialMessage)
  const [isDirty, setIsDirty] = useState(false)

  const debouncedSave = useCallback(
    debounce((value: string) => {
      if (value !== initialMessage) {
        onSave(value)
        setIsDirty(false)
      }
    }, 500),
    [onSave, initialMessage]
  )

  useEffect(() => {
    setMessage(initialMessage)
    setIsDirty(false)
  }, [initialMessage, isOpen])

  useEffect(() => {
    return () => {
      debouncedSave.cancel()
    }
  }, [debouncedSave])

  const handleChange = useCallback((value: string | undefined) => {
    const stringValue = value || ''
    setMessage(stringValue)
    setIsDirty(stringValue !== initialMessage)
    debouncedSave(stringValue)
  }, [debouncedSave, initialMessage])

  const handleSave = useCallback(() => {
    onSave(message)
    setIsDirty(false)
    onClose()
  }, [onSave, message, onClose])

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
      <ModalHeader title="Edit Message" onClose={handleCancel} />
      <ModalBody>
        <div data-color-mode="light">
          <MDEditor
            value={message}
            onChange={handleChange}
            height={400}
            preview="edit"
            hideToolbar={false}
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
          disabled={!isDirty}
        >
          Save Changes
        </button>
      </ModalFooter>
    </Modal>
  )
}