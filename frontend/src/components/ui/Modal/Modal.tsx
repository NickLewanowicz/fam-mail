import * as Dialog from '@radix-ui/react-dialog'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  size = 'md',
  children
}) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4'
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1040] bg-black/50 animate-fade-in" />
        <Dialog.Content
          className={`
            fixed left-1/2 top-1/2 z-[1050] -translate-x-1/2 -translate-y-1/2
            w-full ${sizeClasses[size]}
            rounded-lg
            bg-white p-6
            shadow-2xl
            animate-slide-up
            focus:outline-none
            max-h-[90vh] overflow-y-auto
          `}
        >
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}