import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'

/**
 * ISSUE-0115: this is a prop-controlled dialog — there is no radix Trigger
 * wrapper, so on close radix restores focus to nothing. The dialog must
 * return focus to the element that opened it.
 */
function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Delete draft</button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this draft?"
        confirmLabel="Delete"
        destructive
        onConfirm={() => setOpen(false)}
      />
    </>
  )
}

describe('ConfirmDialog (#115 — focus restoration)', () => {
  it('returns focus to the opener after the dialog closes via Cancel', () => {
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Delete draft' })

    opener.focus()
    expect(document.activeElement).toBe(opener)

    fireEvent.click(opener)
    expect(screen.getByText('Delete this draft?')).toBeVisible()
    expect(document.activeElement).not.toBe(opener)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('Delete this draft?')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(opener)
  })

  it('returns focus to the opener after confirming', () => {
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Delete draft' })
    opener.focus()
    fireEvent.click(opener)

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.queryByText('Delete this draft?')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(opener)
  })
})
