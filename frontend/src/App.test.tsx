import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import '@testing-library/jest-dom/vitest'
import App from './App'
import type { Address } from './types/address'
import type { Draft } from './types/postcard'

global.fetch = vi.fn()

vi.mock('./components/layout/Header', () => ({
  Header: ({ testMode }: { testMode?: boolean }) => (
    <div data-testid="mock-header">Header {testMode && '(Test Mode)'}</div>
  ),
}))

vi.mock('./components/status/StatusCard', () => ({
  StatusCard: ({ isLoading, connected, message, error }: { isLoading: boolean; connected?: boolean; message?: string; error?: string }) => (
    <div data-testid="mock-status-card">
      {isLoading ? 'Loading' : connected ? `Connected: ${message}` : `Error: ${error}`}
    </div>
  ),
}))

vi.mock('./components/postcard/PostcardBuilder', () => ({
  PostcardBuilder: ({ 
    onAddressChange, 
    onImageChange,
    onMessageChange
  }: { 
    recipientAddress: Address | null;
    onAddressChange: (address: Address | null) => void;
    selectedImage: { file: File; preview: string } | null;
    onImageChange: (image: { file: File; preview: string } | null) => void;
    message: string;
    onMessageChange: (message: string) => void;
  }) => (
    <div data-testid="mock-postcard-builder">
      Postcard Builder
      <button onClick={() => onAddressChange({
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: '123 Main St',
        city: 'Ottawa',
        provinceOrState: 'ON',
        postalOrZip: 'K1A 0B1',
        countryCode: 'CA',
      })}>Fill Address</button>
      <button onClick={() => {
        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
        onImageChange({ file: mockFile, preview: 'data:image/jpeg;base64,test' })
      }}>Select Image</button>
      <button onClick={() => onMessageChange('Test message')}>Write Message</button>
    </div>
  ),
}))

vi.mock('./utils/api', () => ({
  submitPostcard: vi.fn((_address, _image, _message) => Promise.resolve({
    success: true,
    postcard: {
      id: 'pc_123',
      object: 'postcard',
      live: false,
      to: {
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: '123 Main St',
        city: 'Ottawa',
        provinceOrState: 'ON',
        postalOrZip: 'K1A 0B1',
        countryCode: 'CA',
      },
      from: {
        firstName: 'Sender',
        lastName: 'Name',
        addressLine1: '456 Test St',
        city: 'Toronto',
        provinceOrState: 'ON',
        postalOrZip: 'M5H 2N2',
        countryCode: 'CA',
      },
      size: '4x6',
      status: 'ready',
      createdAt: '2025-11-15T00:00:00Z',
      updatedAt: '2025-11-15T00:00:00Z',
    },
    testMode: true,
  })),
}))

vi.mock('./components/drafts', () => ({
  DraftList: ({ onLoadDraft, onDraftsChanged, refreshTrigger }: { 
    onLoadDraft: (draft: Draft) => void
    onDraftsChanged?: () => void
    refreshTrigger?: number 
  }) => (
    <div data-testid="mock-draft-list">
      Draft List (trigger: {refreshTrigger})
      <button onClick={() => onLoadDraft({
        id: 'draft-loaded',
        userId: 'user-1',
        recipientAddress: {
          firstName: 'Loaded',
          lastName: 'Draft',
          addressLine1: '789 Elm St',
          city: 'Vancouver',
          provinceOrState: 'BC',
          postalOrZip: 'V6B 1A1',
          countryCode: 'CA',
        },
        message: 'Loaded message',
        state: 'draft',
        size: '4x6',
        createdAt: '2025-06-01T10:00:00Z',
        updatedAt: '2025-06-01T10:00:00Z',
      })}>Load Draft</button>
      {onDraftsChanged && <button onClick={onDraftsChanged}>Changed</button>}
    </div>
  ),
  SaveDraftModal: ({ isOpen, onClose, onSaved }: { 
    isOpen: boolean
    onClose: () => void
    onSaved: (draft: Draft) => void
    recipientAddress: Address | null
    message: string
    selectedImage: { file: File; preview: string } | null
    existingDraftId?: string | null
  }) => isOpen ? (
    <div data-testid="mock-save-draft-modal">
      Save Draft Modal
      <button onClick={() => {
        onSaved({
          id: 'draft-new',
          userId: 'user-1',
          recipientAddress: {
            firstName: 'Jane',
            lastName: 'Doe',
            addressLine1: '100 Main',
            city: 'Toronto',
            provinceOrState: 'ON',
            postalOrZip: 'M5H 2N2',
            countryCode: 'CA',
          },
          message: 'Saved!',
          state: 'draft',
          size: '4x6',
          createdAt: '2025-06-01T10:00:00Z',
          updatedAt: '2025-06-01T10:00:00Z',
        })
      }}>Confirm Save</button>
      <button onClick={onClose}>Close Modal</button>
    </div>
  ) : null,
}))

vi.mock('./ModalTestPage', () => ({
  ModalTestPage: () => <div data-testid="mock-modal-test-page">Modal Test Page</div>,
}))

const mockHealthResponse = {
  json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
} as Response

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render header with test mode when backend reports test mode', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        json: async () => ({ status: 'ok', message: 'Test', testMode: true }),
      } as Response)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText(/Header \(Test Mode\)/)).toBeInTheDocument()
      })
    })

    it('should show loading state initially', () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)
      expect(screen.getByText('Loading')).toBeInTheDocument()
    })

    it('should render footer', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('Built with ❤️ for keeping in touch')).toBeInTheDocument()
      })
    })
  })

  describe('Editor View', () => {
    it('should render postcard builder in editor view', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('mock-postcard-builder')).toBeInTheDocument()
      })
    })

    it('should not show send button initially', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('mock-postcard-builder')).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: /send postcard/i })).not.toBeInTheDocument()
    })

    it('should show send button when address and image are provided', async () => {
      const user = userEvent.setup()
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('mock-postcard-builder')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Fill Address'))
      await user.click(screen.getByText('Select Image'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /send postcard/i })).toBeInTheDocument()
      })
    })

    it('should submit postcard when send button is clicked', async () => {
      const user = userEvent.setup()
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => screen.getByTestId('mock-postcard-builder'))
      await user.click(screen.getByText('Fill Address'))
      await user.click(screen.getByText('Select Image'))
      await waitFor(() => screen.getByRole('button', { name: /send postcard/i }))
      await user.click(screen.getByRole('button', { name: /send postcard/i }))

      await waitFor(() => {
        expect(screen.getByText(/Postcard Sent Successfully/i)).toBeInTheDocument()
      })
    })

    it('should hide postcard builder after successful submission', async () => {
      const user = userEvent.setup()
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => screen.getByTestId('mock-postcard-builder'))
      await user.click(screen.getByText('Fill Address'))
      await user.click(screen.getByText('Select Image'))
      await waitFor(() => screen.getByRole('button', { name: /send postcard/i }))
      await user.click(screen.getByRole('button', { name: /send postcard/i }))

      await waitFor(() => {
        expect(screen.queryByTestId('mock-postcard-builder')).not.toBeInTheDocument()
      })
    })

    it('should show create another button after submission', async () => {
      const user = userEvent.setup()
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => screen.getByTestId('mock-postcard-builder'))
      await user.click(screen.getByText('Fill Address'))
      await user.click(screen.getByText('Select Image'))
      await waitFor(() => screen.getByRole('button', { name: /send postcard/i }))
      await user.click(screen.getByRole('button', { name: /send postcard/i }))

      await waitFor(() => {
        expect(screen.getByText('Create Another Postcard')).toBeInTheDocument()
      })
    })

    it('should reset to initial state when create another is clicked', async () => {
      const user = userEvent.setup()
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => screen.getByTestId('mock-postcard-builder'))
      await user.click(screen.getByText('Fill Address'))
      await user.click(screen.getByText('Select Image'))
      await waitFor(() => screen.getByRole('button', { name: /send postcard/i }))
      await user.click(screen.getByRole('button', { name: /send postcard/i }))
      await waitFor(() => screen.getByText('Create Another Postcard'))
      await user.click(screen.getByText('Create Another Postcard'))

      await waitFor(() => {
        expect(screen.getByTestId('mock-postcard-builder')).toBeInTheDocument()
        expect(screen.queryByText(/Postcard Sent Successfully/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('View Tabs', () => {
    it('should render Editor and My Drafts tabs', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('✏️ Editor')).toBeInTheDocument()
        expect(screen.getByText('📋 My Drafts')).toBeInTheDocument()
      })
    })

    it('should show editor view by default', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('mock-postcard-builder')).toBeInTheDocument()
        expect(screen.queryByTestId('mock-draft-list')).not.toBeInTheDocument()
      })
    })

    it('should switch to drafts view when My Drafts tab is clicked', async () => {
      const user = userEvent.setup()
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('mock-postcard-builder')).toBeInTheDocument()
      })

      await user.click(screen.getByText('📋 My Drafts'))

      await waitFor(() => {
        expect(screen.getByTestId('mock-draft-list')).toBeInTheDocument()
        expect(screen.queryByTestId('mock-postcard-builder')).not.toBeInTheDocument()
      })
    })

    it('should switch back to editor view when Editor tab is clicked', async () => {
      const user = userEvent.setup()
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('mock-postcard-builder')).toBeInTheDocument()
      })

      // Switch to drafts
      await user.click(screen.getByText('📋 My Drafts'))
      await waitFor(() => {
        expect(screen.getByTestId('mock-draft-list')).toBeInTheDocument()
      })

      // Switch back to editor
      await user.click(screen.getByText('✏️ Editor'))
      await waitFor(() => {
        expect(screen.getByTestId('mock-postcard-builder')).toBeInTheDocument()
        expect(screen.queryByTestId('mock-draft-list')).not.toBeInTheDocument()
      })
    })
  })

  describe('Save Draft Button', () => {
    it('should render save draft button', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('save-draft-btn')).toBeInTheDocument()
      })
    })

    it('should disable save draft button when no editor content', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => {
        const btn = screen.getByTestId('save-draft-btn')
        expect(btn).toBeDisabled()
      })
    })

    it('should enable save draft button when editor has content', async () => {
      const user = userEvent.setup()
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('mock-postcard-builder')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Fill Address'))

      await waitFor(() => {
        const btn = screen.getByTestId('save-draft-btn')
        expect(btn).not.toBeDisabled()
      })
    })

    it('should open SaveDraftModal when save draft button is clicked', async () => {
      const user = userEvent.setup()
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('mock-postcard-builder')).toBeInTheDocument()
      })

      // Add content to enable button
      await user.click(screen.getByText('Fill Address'))
      await waitFor(() => {
        expect(screen.getByTestId('save-draft-btn')).not.toBeDisabled()
      })

      await user.click(screen.getByTestId('save-draft-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('mock-save-draft-modal')).toBeInTheDocument()
      })
    })

    it('should show "Update Draft" text when activeDraftId is set', async () => {
      const user = userEvent.setup()
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('mock-postcard-builder')).toBeInTheDocument()
      })

      // Load a draft via the drafts view
      await user.click(screen.getByText('📋 My Drafts'))
      await waitFor(() => {
        expect(screen.getByTestId('mock-draft-list')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Load Draft'))

      await waitFor(() => {
        expect(screen.getByText('Update Draft')).toBeInTheDocument()
      })
    })
  })

  describe('Draft Loading', () => {
    it('should populate editor when a draft is loaded', async () => {
      const user = userEvent.setup()
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('mock-postcard-builder')).toBeInTheDocument()
      })

      // Switch to drafts and load one
      await user.click(screen.getByText('📋 My Drafts'))
      await waitFor(() => {
        expect(screen.getByTestId('mock-draft-list')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Load Draft'))

      // Should switch back to editor view
      await waitFor(() => {
        expect(screen.getByTestId('mock-postcard-builder')).toBeInTheDocument()
        expect(screen.queryByTestId('mock-draft-list')).not.toBeInTheDocument()
      })
    })
  })

  describe('Draft Saved', () => {
    it('should close modal and update refresh trigger after saving draft', async () => {
      const user = userEvent.setup()
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('mock-postcard-builder')).toBeInTheDocument()
      })

      // Enable save button
      await user.click(screen.getByText('Fill Address'))
      await waitFor(() => {
        expect(screen.getByTestId('save-draft-btn')).not.toBeDisabled()
      })

      // Open save modal
      await user.click(screen.getByTestId('save-draft-btn'))
      await waitFor(() => {
        expect(screen.getByTestId('mock-save-draft-modal')).toBeInTheDocument()
      })

      // Confirm save
      await user.click(screen.getByText('Confirm Save'))

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByTestId('mock-save-draft-modal')).not.toBeInTheDocument()
      })

      // Switch to drafts view to verify refresh trigger incremented
      await user.click(screen.getByText('📋 My Drafts'))
      await waitFor(() => {
        expect(screen.getByText(/Draft List \(trigger: 1\)/)).toBeInTheDocument()
      })
    })
  })

  describe('Modal Test Page Toggle', () => {
    it('should toggle modal test page', async () => {
      const user = userEvent.setup()
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByTestId('mock-postcard-builder')).toBeInTheDocument()
      })

      // Show modal test — button text split across text nodes, use regex
      await user.click(screen.getByText(/Show Modal Test Page/))

      await waitFor(() => {
        expect(screen.getByTestId('mock-modal-test-page')).toBeInTheDocument()
        expect(screen.queryByTestId('mock-postcard-builder')).not.toBeInTheDocument()
      })

      // Hide modal test — button text split across text nodes, use regex
      await user.click(screen.getByText(/Hide Modal Test Page/))

      await waitFor(() => {
        expect(screen.queryByTestId('mock-modal-test-page')).not.toBeInTheDocument()
        expect(screen.getByTestId('mock-postcard-builder')).toBeInTheDocument()
      })
    })
  })
})
