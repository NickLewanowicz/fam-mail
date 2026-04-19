import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SaveDraftModal } from './SaveDraftModal'
import type { Address } from '../../types/address'
import type { Draft } from '../../types/postcard'

// Mock the draft API
vi.mock('../../utils/draftApi', () => ({
  createDraft: vi.fn(),
  updateDraft: vi.fn(),
}))

// Mock postcardTemplate
vi.mock('../../utils/postcardTemplate', () => ({
  generateFrontHTML: vi.fn(() => '<html>front</html>'),
}))

import { createDraft, updateDraft } from '../../utils/draftApi'

const mockAddress: Address = {
  firstName: 'Jane',
  lastName: 'Doe',
  addressLine1: '123 Main St',
  city: 'Toronto',
  provinceOrState: 'ON',
  postalOrZip: 'M5H 2N2',
  countryCode: 'CA',
}

const mockFile = new File(['test-image'], 'photo.jpg', { type: 'image/jpeg' })
const mockSelectedImage = { file: mockFile, preview: 'data:image/jpeg;base64,test' }

const mockDraft: Draft = {
  id: 'draft-1',
  userId: 'user-1',
  recipientAddress: mockAddress,
  message: 'Hello!',
  state: 'draft',
  size: '4x6',
  createdAt: '2025-06-01T10:00:00Z',
  updatedAt: '2025-06-01T10:00:00Z',
}

describe('SaveDraftModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSaved = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      render(
        <SaveDraftModal
          isOpen={false}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          recipientAddress={mockAddress}
          message="Test"
          selectedImage={mockSelectedImage}
        />
      )
      expect(screen.queryByText('Save as Draft')).not.toBeInTheDocument()
    })

    it('renders modal with "Save as Draft" title for new draft', () => {
      render(
        <SaveDraftModal
          isOpen={true}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          recipientAddress={mockAddress}
          message="Test"
          selectedImage={null}
        />
      )
      expect(screen.getByText('Save as Draft')).toBeInTheDocument()
    })

    it('renders modal with "Update Draft" title when existingDraftId is provided', () => {
      render(
        <SaveDraftModal
          isOpen={true}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          recipientAddress={mockAddress}
          message="Test"
          selectedImage={null}
          existingDraftId="draft-123"
        />
      )
      expect(screen.getByRole('heading', { name: 'Update Draft' })).toBeInTheDocument()
    })

    it('renders recipient info when address is provided', () => {
      render(
        <SaveDraftModal
          isOpen={true}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          recipientAddress={mockAddress}
          message=""
          selectedImage={null}
        />
      )
      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
      expect(screen.getByText(/Toronto, ON/)).toBeInTheDocument()
    })

    it('renders warning when no recipient address', () => {
      render(
        <SaveDraftModal
          isOpen={true}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          recipientAddress={null}
          message=""
          selectedImage={null}
        />
      )
      expect(screen.getByText(/recipient address is required/i)).toBeInTheDocument()
    })

    it('renders message preview when message is provided', () => {
      render(
        <SaveDraftModal
          isOpen={true}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          recipientAddress={mockAddress}
          message="Hello world"
          selectedImage={null}
        />
      )
      expect(screen.getByText('Hello world')).toBeInTheDocument()
    })

    it('does not render message section when message is empty', () => {
      render(
        <SaveDraftModal
          isOpen={true}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          recipientAddress={mockAddress}
          message=""
          selectedImage={null}
        />
      )
      expect(screen.queryByText('Message')).not.toBeInTheDocument()
    })

    it('renders image preview when selectedImage is provided', () => {
      render(
        <SaveDraftModal
          isOpen={true}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          recipientAddress={mockAddress}
          message=""
          selectedImage={mockSelectedImage}
        />
      )
      expect(screen.getByText('photo.jpg')).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'Postcard image' })).toBeInTheDocument()
    })

    it('does not render image section when no image', () => {
      render(
        <SaveDraftModal
          isOpen={true}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          recipientAddress={mockAddress}
          message=""
          selectedImage={null}
        />
      )
      expect(screen.queryByText('Image')).not.toBeInTheDocument()
    })
  })

  describe('Button States', () => {
    it('disables save button when no recipient address', () => {
      render(
        <SaveDraftModal
          isOpen={true}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          recipientAddress={null}
          message=""
          selectedImage={null}
        />
      )
      expect(screen.getByText('Save Draft').closest('button')).toBeDisabled()
    })

    it('enables save button when recipient address is present', () => {
      render(
        <SaveDraftModal
          isOpen={true}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          recipientAddress={mockAddress}
          message=""
          selectedImage={null}
        />
      )
      expect(screen.getByText('Save Draft').closest('button')).not.toBeDisabled()
    })

    it('shows Cancel button', () => {
      render(
        <SaveDraftModal
          isOpen={true}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          recipientAddress={mockAddress}
          message=""
          selectedImage={null}
        />
      )
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })
  })

  describe('Create Draft', () => {
    it('calls createDraft and onSaved when saving new draft', async () => {
      const user = userEvent.setup()
      ;(createDraft as ReturnType<typeof vi.fn>).mockResolvedValue(mockDraft)

      render(
        <SaveDraftModal
          isOpen={true}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          recipientAddress={mockAddress}
          message="Hello!"
          selectedImage={mockSelectedImage}
        />
      )

      await user.click(screen.getByText('Save Draft'))

      await waitFor(() => {
        expect(createDraft).toHaveBeenCalledWith(
          expect.objectContaining({
            recipientAddress: mockAddress,
            message: 'Hello!',
            size: '4x6',
          })
        )
      })

      await waitFor(() => {
        expect(mockOnSaved).toHaveBeenCalledWith(mockDraft)
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('shows loading state while saving', async () => {
      const user = userEvent.setup()
      // Create a promise that won't resolve immediately
      let resolveCreate: (value: unknown) => void
      const createPromise = new Promise(resolve => { resolveCreate = resolve })
      ;(createDraft as ReturnType<typeof vi.fn>).mockReturnValue(createPromise)

      render(
        <SaveDraftModal
          isOpen={true}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          recipientAddress={mockAddress}
          message=""
          selectedImage={null}
        />
      )

      await user.click(screen.getByText('Save Draft'))

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument()
        expect(screen.getByText('Cancel').closest('button')).toBeDisabled()
      })

      // Resolve to clean up
      resolveCreate!(mockDraft)
    })
  })

  describe('Update Draft', () => {
    it('calls updateDraft when existingDraftId is provided', async () => {
      const user = userEvent.setup()
      const updatedDraft = { ...mockDraft, message: 'Updated' }
      ;(updateDraft as ReturnType<typeof vi.fn>).mockResolvedValue(updatedDraft)

      render(
        <SaveDraftModal
          isOpen={true}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          recipientAddress={mockAddress}
          message="Updated"
          selectedImage={null}
          existingDraftId="draft-1"
        />
      )

      await user.click(screen.getByRole('button', { name: 'Update Draft' }))

      await waitFor(() => {
        expect(updateDraft).toHaveBeenCalledWith(
          'draft-1',
          expect.objectContaining({
            recipientAddress: mockAddress,
            message: 'Updated',
          })
        )
      })

      await waitFor(() => {
        expect(mockOnSaved).toHaveBeenCalledWith(updatedDraft)
        expect(mockOnClose).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    it('shows error when createDraft fails', async () => {
      const user = userEvent.setup()
      ;(createDraft as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      render(
        <SaveDraftModal
          isOpen={true}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          recipientAddress={mockAddress}
          message=""
          selectedImage={null}
        />
      )

      await user.click(screen.getByText('Save Draft'))

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      // Modal stays open on error
      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('shows generic error message for non-Error throws', async () => {
      const user = userEvent.setup()
      ;(createDraft as ReturnType<typeof vi.fn>).mockRejectedValue('unknown error')

      render(
        <SaveDraftModal
          isOpen={true}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          recipientAddress={mockAddress}
          message=""
          selectedImage={null}
        />
      )

      await user.click(screen.getByText('Save Draft'))

      await waitFor(() => {
        expect(screen.getByText('Failed to save draft')).toBeInTheDocument()
      })
    })

    it('shows error when updateDraft fails', async () => {
      const user = userEvent.setup()
      ;(updateDraft as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Update failed'))

      render(
        <SaveDraftModal
          isOpen={true}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          recipientAddress={mockAddress}
          message=""
          selectedImage={null}
          existingDraftId="draft-1"
        />
      )

      await user.click(screen.getByRole('button', { name: 'Update Draft' }))

      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument()
      })
    })
  })

  describe('Cancel', () => {
    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup()

      render(
        <SaveDraftModal
          isOpen={true}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
          recipientAddress={mockAddress}
          message=""
          selectedImage={null}
        />
      )

      await user.click(screen.getByText('Cancel'))

      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})
