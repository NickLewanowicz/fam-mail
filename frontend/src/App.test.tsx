import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import '@testing-library/jest-dom/vitest'
import App from './App'
import type { Address } from './types/address'

global.fetch = vi.fn()

vi.mock('./components/layout/Header', () => ({
  Header: ({ testMode, connected, isLoading }: { testMode?: boolean; connected?: boolean; isLoading?: boolean }) => (
    <div data-testid="mock-header">
      Header
      {isLoading && ' (Loading)'}
      {connected && ' (Connected)'}
      {testMode && ' (Test Mode)'}
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

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render header with test mode when backend reports test mode', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: true }),
    } as Response)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/Header.*Test Mode/)).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

    render(<App />)
    expect(screen.getByText(/Header.*Loading/)).toBeInTheDocument()
  })

  it('should render postcard builder', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('mock-postcard-builder')).toBeInTheDocument()
    })
  })

  it('should not show send button initially', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('mock-postcard-builder')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /send postcard/i })).not.toBeInTheDocument()
  })

  it('should show send button when address and image are provided', async () => {
    const user = userEvent.setup()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

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
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

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
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

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
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

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
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

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

  it('should render footer', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Built with ❤️ for keeping in touch')).toBeInTheDocument()
    })
  })
})
