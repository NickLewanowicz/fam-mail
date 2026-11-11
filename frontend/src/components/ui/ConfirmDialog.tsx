import { useEffect, useRef } from 'react'
import { AlertDialog } from 'radix-ui'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
}

/**
 * Accessible confirmation dialog on the Radix AlertDialog primitive,
 * styled with the app's zinc tokens. Replaces window.confirm — focus is
 * trapped, Escape/backdrop cancel, and the flow is testable with
 * Testing Library.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  // ISSUE-0115: prop-controlled dialog, no radix Trigger — radix restores
  // focus to nothing on close. Capture the opener on open and hand focus
  // back when the dialog closes.
  const openerRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (open) {
      openerRef.current = (document.activeElement as HTMLElement | null) ?? null
    } else if (openerRef.current) {
      openerRef.current.focus()
      openerRef.current = null
    }
  }, [open])

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out" />
        <AlertDialog.Content
          className={
            // M6: centered scale-fade dialog on md+, bottom sheet on phones.
            // Radix keeps the element mounted while the closed animation
            // plays, so data-[state=closed]:animate-* unmounts cleanly.
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-ink-surface border border-ink-line p-5 shadow-xl outline-none ' +
            'md:w-[calc(100vw-2rem)] md:max-w-sm md:data-[state=open]:animate-dialog-in md:data-[state=closed]:animate-dialog-out ' +
            'max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:translate-x-0 max-md:translate-y-0 max-md:w-full max-md:rounded-b-none max-md:rounded-t-[20px] ' +
            'max-md:data-[state=open]:animate-sheet-in max-md:data-[state=closed]:animate-sheet-out'
          }
        >
          <AlertDialog.Title className="text-base font-semibold text-warm-text">{title}</AlertDialog.Title>
          {description && (
            <AlertDialog.Description className="mt-1.5 text-sm text-warm-text2">{description}</AlertDialog.Description>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                className="press h-9 rounded-md px-3 text-sm font-medium text-warm-text2 hover:bg-white/5 hover:text-warm-text"
              >
                {cancelLabel}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                onClick={onConfirm}
                className={`press h-9 rounded-md px-3 text-sm font-medium ${
                  destructive ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-clay text-ink-bg hover:bg-clay-hover'
                }`}
              >
                {confirmLabel}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
