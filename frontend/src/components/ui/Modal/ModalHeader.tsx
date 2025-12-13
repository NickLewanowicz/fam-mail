import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

interface ModalHeaderProps {
  title: string
  onClose?: () => void
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ title, onClose }) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <Dialog.Title className="text-xl font-semibold text-gray-900">
        {title}
      </Dialog.Title>
      {onClose && (
        <Dialog.Close asChild>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </Dialog.Close>
      )}
    </div>
  )
}