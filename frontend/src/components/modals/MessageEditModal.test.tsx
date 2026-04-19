import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MessageEditModal } from './MessageEditModal'

// Mock the MDEditor since it has complex canvas/DOM interactions
vi.mock('@uiw/react-md-editor', () => ({
  __esModule: true,
  default: function MockMDEditor({
    value,
    onChange,
  }: {
    value: string
    onChange?: (value?: string) => void
  }) {
    return (
      <div data-testid="md-editor">
        <textarea
          data-testid="md-textarea"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </div>
    )
  },
}))

describe('MessageEditModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    initialMessage: 'Hello World',
    onSave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders when open', () => {
    render(<MessageEditModal {...defaultProps} />)

    expect(screen.getByText('Edit Message')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<MessageEditModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByText('Edit Message')).not.toBeInTheDocument()
  })

  it('displays initial message in editor', () => {
    render(<MessageEditModal {...defaultProps} />)

    const textarea = screen.getByTestId('md-textarea')
    expect(textarea).toHaveValue('Hello World')
  })

  it('has Cancel button', () => {
    render(<MessageEditModal {...defaultProps} />)

    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('has Save Changes button', () => {
    render(<MessageEditModal {...defaultProps} />)

    expect(screen.getByText('Save Changes')).toBeInTheDocument()
  })

  it('Save button is disabled when not dirty', () => {
    render(<MessageEditModal {...defaultProps} />)

    const saveButton = screen.getByText('Save Changes')
    expect(saveButton).toBeDisabled()
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(<MessageEditModal {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByText('Cancel'))

    expect(onClose).toHaveBeenCalled()
  })

  it('calls onSave and onClose when Save is clicked after editing', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(
      <MessageEditModal
        {...defaultProps}
        onSave={onSave}
        onClose={onClose}
      />
    )

    // Edit the message
    const textarea = screen.getByTestId('md-textarea')
    fireEvent.change(textarea, { target: { value: 'Updated message' } })

    // Save button should be enabled now
    const saveButton = screen.getByText('Save Changes')
    expect(saveButton).not.toBeDisabled()

    fireEvent.click(saveButton)

    expect(onSave).toHaveBeenCalledWith('Updated message')
    expect(onClose).toHaveBeenCalled()
  })

  it('shows confirm dialog when canceling with unsaved changes', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onClose = vi.fn()

    render(<MessageEditModal {...defaultProps} onClose={onClose} />)

    // Make a change
    const textarea = screen.getByTestId('md-textarea')
    fireEvent.change(textarea, { target: { value: 'Changed text' } })

    // Click cancel
    fireEvent.click(screen.getByText('Cancel'))

    expect(confirmSpy).toHaveBeenCalledWith(
      'You have unsaved changes. Are you sure you want to close?'
    )
    expect(onClose).toHaveBeenCalled()
  })

  it('does not close when user cancels confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onClose = vi.fn()

    render(<MessageEditModal {...defaultProps} onClose={onClose} />)

    // Make a change
    const textarea = screen.getByTestId('md-textarea')
    fireEvent.change(textarea, { target: { value: 'Changed text' } })

    // Click cancel - user declines confirmation
    fireEvent.click(screen.getByText('Cancel'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not show confirm dialog when no changes', () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    const onClose = vi.fn()

    render(<MessageEditModal {...defaultProps} onClose={onClose} />)

    // Click cancel without making changes
    fireEvent.click(screen.getByText('Cancel'))

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('renders markdown editor', () => {
    render(<MessageEditModal {...defaultProps} />)

    expect(screen.getByTestId('md-editor')).toBeInTheDocument()
  })
})
