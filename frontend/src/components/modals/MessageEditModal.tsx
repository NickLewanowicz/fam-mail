import { Modal, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal'
import MDEditor from '@uiw/react-md-editor'
import { useCallback, useEffect, useRef, useState } from 'react'

/** Lightweight debounce with cancel support — replaces lodash dependency */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => void>(
  fn: T,
  ms: number
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  const debounced = ((...args: unknown[]) => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, ms)
  }) as T & { cancel: () => void }
  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }
  return debounced
}

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

  // Stable ref to latest callbacks so the debounced fn always sees current values
  const onSaveRef = useRef(onSave)
  const initialMessageRef = useRef(initialMessage)
  onSaveRef.current = onSave
  initialMessageRef.current = initialMessage

  // Create a single stable debounced function
  const debouncedSaveRef = useRef(
    debounce((value: string) => {
      if (value !== initialMessageRef.current) {
        onSaveRef.current(value)
        setIsDirty(false)
      }
    }, 500)
  )

  // Cancel pending debounce on unmount
  useEffect(() => {
    const ref = debouncedSaveRef
    return () => {
      ref.current.cancel()
    }
  }, [])

  useEffect(() => {
    setMessage(initialMessage)
    setIsDirty(false)
  }, [initialMessage, isOpen])

  const handleChange = useCallback((value: string | undefined) => {
    const stringValue = value || ''
    setMessage(stringValue)
    setIsDirty(stringValue !== initialMessage)
    debouncedSaveRef.current(stringValue)
  }, [initialMessage])

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