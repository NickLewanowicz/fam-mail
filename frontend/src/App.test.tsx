import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App'

global.fetch = vi.fn()

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
      expect(screen.getByText('Fam Mail backend is running')).toBeInTheDocument()
      expect(screen.getByText('Frontend and backend are communicating successfully!')).toBeInTheDocument()
    })
  })

  it('should show error state when backend connection fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Connection failed')
    )

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Failed to connect to backend')).toBeInTheDocument()
      expect(screen.getByText('Connection failed')).toBeInTheDocument()
    })
  })

  it('should render the info card', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

    render(<App />)
    expect(screen.getByText('Getting Started')).toBeInTheDocument()
    expect(screen.getByText(/This is a starter template for Fam Mail/i)).toBeInTheDocument()
  })

  it('should render the next steps section', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
    } as Response)

    render(<App />)
    expect(screen.getByText('Next Steps')).toBeInTheDocument()
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
      expect(screen.getByText('🧪 Test Mode Active')).toBeInTheDocument()
      expect(screen.getByText('⚠️ Running in test mode - no real postcards will be sent')).toBeInTheDocument()
    })
  })
})
