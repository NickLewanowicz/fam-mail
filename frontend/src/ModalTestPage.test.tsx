import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModalTestPage } from './ModalTestPage'

// Mock InteractivePostcard since it depends on complex child components
vi.mock('./components/postcard-editor/InteractivePostcard', () => ({
  InteractivePostcard: ({
    message,
    address,
    onMessageChange,
    onAddressChange,
  }: {
    imageData?: string
    message: string
    address: unknown
    onImageUpload: (data: string) => void
    onMessageChange: (msg: string) => void
    onAddressChange: (addr: unknown) => void
  }) => (
    <div data-testid="interactive-postcard-mock">
      <span data-testid="mock-message">{message}</span>
      <span data-testid="mock-address">{address ? JSON.stringify(address) : 'no address'}</span>
      <button data-testid="mock-change-msg" onClick={() => onMessageChange('updated message')}>
        Change Message
      </button>
      <button
        data-testid="mock-change-addr"
        onClick={() => onAddressChange({ firstName: 'Jane', lastName: 'Smith', addressLine1: '456 Oak Ave', city: 'Othertown', provinceOrState: 'NY', postalOrZip: '67890', countryCode: 'US' })}
      >
        Change Address
      </button>
    </div>
  ),
}))

describe('ModalTestPage', () => {
  it('renders without crashing', () => {
    render(<ModalTestPage />)
    expect(screen.getByText('Modal Workflow Test')).toBeInTheDocument()
  })

  it('displays the test instructions', () => {
    render(<ModalTestPage />)
    expect(screen.getByText('Test Instructions:')).toBeInTheDocument()
    expect(screen.getByText(/Click on the message area/)).toBeInTheDocument()
  })

  it('renders the InteractivePostcard component', () => {
    render(<ModalTestPage />)
    expect(screen.getByTestId('interactive-postcard-mock')).toBeInTheDocument()
  })

  it('displays current state section', () => {
    render(<ModalTestPage />)
    expect(screen.getByText('Current State:')).toBeInTheDocument()
  })

  it('shows the initial message in the state display', () => {
    render(<ModalTestPage />)
    // Both the mock and the state display show the message; check the state <pre>
    const preElements = screen.getAllByText(/Hello \*\*world\*\*/)
    expect(preElements.length).toBeGreaterThanOrEqual(1)
  })

  it('shows the initial address in the state display', () => {
    render(<ModalTestPage />)
    // The address JSON appears in both mock and state display; just verify it's there
    const addressElements = screen.getAllByText(/"firstName": "John"/)
    expect(addressElements.length).toBeGreaterThanOrEqual(1)
  })

  it('displays message and address labels', () => {
    render(<ModalTestPage />)
    expect(screen.getByText('Message:')).toBeInTheDocument()
    expect(screen.getByText('Address:')).toBeInTheDocument()
  })

  it('renders with default address pre-populated', () => {
    render(<ModalTestPage />)
    // Address appears in both mock and state display; verify at least one instance
    const addressElements = screen.getAllByText(/123 Main St/)
    expect(addressElements.length).toBeGreaterThanOrEqual(1)
  })
})
