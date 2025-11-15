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

vi.mock('./components/postcard/ImageUpload', () => ({
  ImageUpload: ({ onImageSelect, isOpen }: { onImageSelect: (file: File, preview: string) => void; isOpen?: boolean }) => (
    <div data-testid="mock-image-upload">
      Image Upload (Open: {String(isOpen)})
      <button onClick={() => {
        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
        onImageSelect(mockFile, 'data:image/jpeg;base64,test')
      }}>Select Image</button>
    </div>
  ),
}))

vi.mock('./utils/api', () => ({
  submitPostcard: vi.fn(),
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

  it('should not render image upload initially', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

    render(<App />)

    await waitFor(() => {
      expect(screen.queryByTestId('mock-image-upload')).not.toBeInTheDocument()
    })
  })

  it('should render image upload after address is submitted', async () => {
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
      expect(screen.getByTestId('mock-image-upload')).toBeInTheDocument()
      expect(screen.getByText(/Image Upload \(Open: true\)/)).toBeInTheDocument()
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

  it('should render send postcard button after both address and image are provided', async () => {
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
      expect(screen.getByText('Select Image')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Select Image'))

    await waitFor(() => {
      expect(screen.getByText('Ready to Send!')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send postcard/i })).toBeInTheDocument()
    })
  })

  it('should show send button only when both address and image are selected', async () => {
    const user = userEvent.setup()
      ; (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
      } as Response)

    render(<App />)

    await waitFor(() => screen.getByText('Submit Address'))

    expect(screen.queryByRole('button', { name: /send postcard/i })).not.toBeInTheDocument()

    await user.click(screen.getByText('Submit Address'))
    await waitFor(() => screen.getByText('Select Image'))

    expect(screen.queryByRole('button', { name: /send postcard/i })).not.toBeInTheDocument()

    await user.click(screen.getByText('Select Image'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send postcard/i })).toBeInTheDocument()
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
