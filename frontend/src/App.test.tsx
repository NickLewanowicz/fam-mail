import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App'

global.fetch = vi.fn()

vi.mock('./utils/api', () => ({
  submitPostcard: vi.fn(),
}))

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the header', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

    render(<App />)
    expect(screen.getByText('📮 Fam Mail')).toBeInTheDocument()
    expect(screen.getByText('Send postcards to the people you love')).toBeInTheDocument()
  })

  it('should show loading state initially', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

    render(<App />)
    expect(screen.getByText('Connecting to backend...')).toBeInTheDocument()
  })

  it('should show success state when backend is connected', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({
        status: 'ok',
        message: 'Fam Mail backend is running',
        testMode: false,
      }),
    } as Response)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/Connected •/)).toBeInTheDocument()
      expect(screen.getByText(/Fam Mail backend is running/)).toBeInTheDocument()
    })
  })

  it('should show error state when backend connection fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Connection failed')
    )

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/Backend connection failed:/)).toBeInTheDocument()
      expect(screen.getByText(/Connection failed/)).toBeInTheDocument()
    })
  })

  it('should render the address form', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

    render(<App />)
    expect(screen.getByText('Recipient Address')).toBeInTheDocument()
  })

  it('should render the footer', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

    render(<App />)
    expect(screen.getByText('Built with ❤️ for keeping in touch')).toBeInTheDocument()
  })

  it('should show test mode badge when in test mode', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: true }),
    } as Response)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('🧪 Test Mode')).toBeInTheDocument()
    })
  })

  it('should show send postcard button when address and image are selected', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Recipient Address')).toBeInTheDocument()
    })

    expect(screen.queryByText('Send Postcard')).not.toBeInTheDocument()
  })

  it('should show error message on submission failure', async () => {
    const { submitPostcard } = await import('./utils/api')
    vi.mocked(submitPostcard).mockRejectedValueOnce(new Error('API Error'))

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Recipient Address')).toBeInTheDocument()
    })
  })

  it('should show success message after successful submission', async () => {
    const { submitPostcard } = await import('./utils/api')
    vi.mocked(submitPostcard).mockResolvedValueOnce({
      success: true,
      postcard: {
        id: 'pc_123',
        status: 'ready',
        to: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'Ottawa',
          provinceOrState: 'ON',
          postalOrZip: 'K1A 0B1',
          countryCode: 'CA',
        },
      },
      testMode: true,
    })

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Recipient Address')).toBeInTheDocument()
    })
  })
})
