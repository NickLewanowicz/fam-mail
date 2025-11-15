import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import '@testing-library/jest-dom/vitest'
import App from './App'
import type { Address } from './types/address'

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

vi.mock('./components/address/AddressForm', () => ({
  AddressForm: ({ onSubmit, isOpen }: { onSubmit: (address: Address) => void; initialAddress?: Partial<Address>; isOpen?: boolean }) => (
    <div data-testid="mock-address-form">
      Address Form (Open: {String(isOpen)})
      <button onClick={() => onSubmit({
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: '123 Main St',
        city: 'Ottawa',
        provinceOrState: 'ON',
        postalOrZip: 'K1A 0B1',
        countryCode: 'CA',
      })}>Submit Address</button>
    </div>
  ),
}))

vi.mock('./components/postcard/PostcardPreviewCombined', () => ({
  PostcardPreviewCombined: ({ 
    isOpen, 
    onSuccess, 
    onError 
  }: { 
    recipientAddress: Address; 
    isOpen?: boolean; 
    onToggle?: () => void;
    onSuccess: (response: any) => void; 
    onError: (error: string) => void 
  }) => (
    <div data-testid="mock-postcard-preview-combined">
      Preview Combined (Open: {String(isOpen)})
      <button onClick={() => onSuccess({
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
        selectedImage: {
          file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
          preview: 'data:image/jpeg;base64,test'
        }
      })}>Submit Postcard</button>
      <button onClick={() => onError('Test error')}>Trigger Error</button>
    </div>
  ),
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
      expect(screen.getByText(/Header \(Test Mode\)/)).toBeInTheDocument()
    })
  })

  it('should render header without test mode when backend reports live mode', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

    render(<App />)

    await waitFor(() => {
      const header = screen.getByTestId('mock-header')
      expect(header.textContent).not.toContain('Test Mode')
    })
  })

  it('should show loading state initially', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

    render(<App />)
    expect(screen.getByText('Loading')).toBeInTheDocument()
  })

  it('should show connected status when backend responds successfully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({
        status: 'ok',
        message: 'Fam Mail backend is running',
        testMode: false,
      }),
    } as Response)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Connected: Fam Mail backend is running')).toBeInTheDocument()
    })
  })

  it('should show error status when backend connection fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Connection failed')
    )

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Error: Connection failed')).toBeInTheDocument()
    })
  })

  it('should render address form initially open', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/Address Form \(Open: true\)/)).toBeInTheDocument()
    })
  })

  it('should not render preview initially', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

    render(<App />)

    await waitFor(() => {
      expect(screen.queryByTestId('mock-postcard-preview-combined')).not.toBeInTheDocument()
    })
  })

  it('should render preview after address is submitted', async () => {
    const user = userEvent.setup()
      ; (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
      } as Response)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/Address Form/)).toBeInTheDocument()
    })

    const submitButton = screen.getByText('Submit Address')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByTestId('mock-postcard-preview-combined')).toBeInTheDocument()
      expect(screen.getByText(/Preview Combined \(Open: true\)/)).toBeInTheDocument()
    })
  })

  it('should close address form after address is submitted', async () => {
    const user = userEvent.setup()
      ; (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
      } as Response)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/Address Form \(Open: true\)/)).toBeInTheDocument()
    })

    const submitButton = screen.getByText('Submit Address')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Address Form \(Open: false\)/)).toBeInTheDocument()
    })
  })

  it('should render send postcard button in preview component after address is provided', async () => {
    const user = userEvent.setup()
      ; (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
      } as Response)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Submit Address')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Submit Address'))

    await waitFor(() => {
      expect(screen.getByTestId('mock-postcard-preview-combined')).toBeInTheDocument()
      expect(screen.getByText('Submit Postcard')).toBeInTheDocument()
    })
  })

  it('should show preview component with submit button after address is submitted', async () => {
    const user = userEvent.setup()
      ; (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
      } as Response)

    render(<App />)

    await waitFor(() => screen.getByText('Submit Address'))

    expect(screen.queryByTestId('mock-postcard-preview-combined')).not.toBeInTheDocument()

    await user.click(screen.getByText('Submit Address'))

    await waitFor(() => {
      expect(screen.getByTestId('mock-postcard-preview-combined')).toBeInTheDocument()
      expect(screen.getByText('Submit Postcard')).toBeInTheDocument()
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
