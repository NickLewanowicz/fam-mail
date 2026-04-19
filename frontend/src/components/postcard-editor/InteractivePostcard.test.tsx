import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InteractivePostcard } from './InteractivePostcard'
import type { Address } from '../../types/address'

// Mock the CSS imports
vi.mock('./InteractivePostcard.css', () => ({}))

// Mock PostcardFront since it uses complex image processing hooks
vi.mock('./PostcardFront', () => ({
  PostcardFront: ({ onImageUpload }: { onImageUpload: (img: unknown) => void }) => (
    <div data-testid="postcard-front-mock">
      <button onClick={() => onImageUpload({ preview: 'test-data' })}>Upload Image</button>
    </div>
  ),
}))

// Mock PostcardBack
vi.mock('./PostcardBack', () => ({
  PostcardBack: ({
    message,
    recipientAddress,
    onMessageChange,
    onMessageEdit,
    onAddressEdit,
  }: {
    message: string
    recipientAddress: Address | null
    onMessageChange: (msg: string) => void
    onRecipientAddressChange: (addr: Address | null) => void
    onSenderAddressChange: (addr: Address | null) => void
    onMessageEdit: () => void
    onAddressEdit: () => void
  }) => (
    <div data-testid="postcard-back-mock">
      <span data-testid="back-message">{message}</span>
      <span data-testid="back-address">{recipientAddress ? recipientAddress.firstName : 'No address'}</span>
      <button data-testid="edit-message-btn" onClick={onMessageEdit}>Edit Message</button>
      <button data-testid="edit-address-btn" onClick={onAddressEdit}>Edit Address</button>
      <button data-testid="change-message-btn" onClick={() => onMessageChange('new message')}>Change Message</button>
    </div>
  ),
}))

// Mock MessageEditModal since it depends on MDEditor
vi.mock('../modals/MessageEditModal', () => ({
  MessageEditModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="message-edit-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null,
}))

// Mock AddressEditModal since it depends on AddressEditor
vi.mock('../modals/AddressEditModal', () => ({
  AddressEditModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="address-edit-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null,
}))

describe('InteractivePostcard', () => {
  const defaultProps = {
    imageData: undefined,
    message: 'Hello World',
    address: null as Address | null,
    onImageUpload: vi.fn(),
    onMessageChange: vi.fn(),
    onAddressChange: vi.fn(),
  }

  it('renders without crashing', () => {
    render(<InteractivePostcard {...defaultProps} />)
    expect(screen.getByTestId('postcard-front-mock')).toBeInTheDocument()
    expect(screen.getByTestId('postcard-back-mock')).toBeInTheDocument()
  })

  it('displays the message on the back', () => {
    render(<InteractivePostcard {...defaultProps} message="Test message" />)
    expect(screen.getByTestId('back-message')).toHaveTextContent('Test message')
  })

  it('displays address info on the back', () => {
    const address: Address = {
      firstName: 'John',
      lastName: 'Doe',
      addressLine1: '123 Main St',
      city: 'Toronto',
      provinceOrState: 'ON',
      postalOrZip: 'M5V 2N6',
      countryCode: 'CA',
    }
    render(<InteractivePostcard {...defaultProps} address={address} />)
    expect(screen.getByTestId('back-address')).toHaveTextContent('John')
  })

  it('shows "No address" when address is null', () => {
    render(<InteractivePostcard {...defaultProps} address={null} />)
    expect(screen.getByTestId('back-address')).toHaveTextContent('No address')
  })

  it('displays Front Side and Back Side labels', () => {
    render(<InteractivePostcard {...defaultProps} />)
    expect(screen.getByText('Front Side')).toBeInTheDocument()
    expect(screen.getByText('Back Side')).toBeInTheDocument()
  })

  it('renders front and back postcard sides', () => {
    render(<InteractivePostcard {...defaultProps} />)
    const sides = screen.getAllByText(/Side$/)
    expect(sides).toHaveLength(2)
  })
})
