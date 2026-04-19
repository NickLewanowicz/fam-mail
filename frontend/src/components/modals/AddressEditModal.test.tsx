import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AddressEditModal } from './AddressEditModal'
import type { Address } from '../../types/address'

// Mock AddressEditor
vi.mock('../postcard-editor/AddressEditor', () => ({
  AddressEditor: function MockAddressEditor({
    address,
    onChange,
    includeReturnAddress,
    returnAddress,
    onReturnAddressChange,
  }: {
    address?: Address | null
    onChange: (address: Address) => void
    includeReturnAddress?: boolean
    returnAddress?: Address | null
    onReturnAddressChange?: (address: Address) => void
  }) {
    return (
      <div data-testid="address-editor">
        <span data-testid="current-address">
          {address?.addressLine1 || 'no address'}
        </span>
        <button
          data-testid="change-address-btn"
          onClick={() =>
            onChange({
              firstName: 'Jane',
              lastName: 'Smith',
              addressLine1: '456 New St',
              city: 'Boston',
              provinceOrState: 'MA',
              postalOrZip: '02101',
              countryCode: 'US',
            })
          }
        >
          Change Address
        </button>
        {includeReturnAddress && (
          <div data-testid="return-address-section">
            <span data-testid="current-return">
              {returnAddress?.addressLine1 || 'no return address'}
            </span>
            <button
              data-testid="change-return-btn"
              onClick={() =>
                onReturnAddressChange?.({
                  firstName: 'Sender',
                  lastName: 'Person',
                  addressLine1: '789 Sender St',
                  city: 'LA',
                  provinceOrState: 'CA',
                  postalOrZip: '90001',
                  countryCode: 'US',
                })
              }
            >
              Change Return
            </button>
          </div>
        )}
      </div>
    )
  },
}))

const mockAddress: Address = {
  firstName: 'John',
  lastName: 'Doe',
  addressLine1: '123 Main St',
  city: 'New York',
  provinceOrState: 'NY',
  postalOrZip: '10001',
  countryCode: 'US',
}

describe('AddressEditModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    initialAddress: mockAddress,
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
    render(<AddressEditModal {...defaultProps} />)

    expect(screen.getByText('Edit Address')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<AddressEditModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByText('Edit Address')).not.toBeInTheDocument()
  })

  it('renders address editor', () => {
    render(<AddressEditModal {...defaultProps} />)

    expect(screen.getByTestId('address-editor')).toBeInTheDocument()
  })

  it('displays initial address', () => {
    render(<AddressEditModal {...defaultProps} />)

    expect(screen.getByTestId('current-address')).toHaveTextContent('123 Main St')
  })

  it('has Cancel button', () => {
    render(<AddressEditModal {...defaultProps} />)

    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('has Save Changes button', () => {
    render(<AddressEditModal {...defaultProps} />)

    expect(screen.getByText('Save Changes')).toBeInTheDocument()
  })

  it('Save button is disabled when not dirty', () => {
    render(<AddressEditModal {...defaultProps} />)

    expect(screen.getByText('Save Changes')).toBeDisabled()
  })

  it('enables Save button after address change', () => {
    render(<AddressEditModal {...defaultProps} />)

    fireEvent.click(screen.getByTestId('change-address-btn'))

    expect(screen.getByText('Save Changes')).not.toBeDisabled()
  })

  it('calls onSave with new address and closes on Save', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    render(
      <AddressEditModal {...defaultProps} onSave={onSave} onClose={onClose} />
    )

    // Change address
    fireEvent.click(screen.getByTestId('change-address-btn'))

    // Save
    fireEvent.click(screen.getByText('Save Changes'))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        addressLine1: '456 New St',
        city: 'Boston',
      })
    )
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when Cancel is clicked without changes', () => {
    const onClose = vi.fn()

    render(<AddressEditModal {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByText('Cancel'))

    expect(onClose).toHaveBeenCalled()
  })

  it('shows confirm when canceling with unsaved changes', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onClose = vi.fn()

    render(<AddressEditModal {...defaultProps} onClose={onClose} />)

    // Make a change
    fireEvent.click(screen.getByTestId('change-address-btn'))

    // Cancel
    fireEvent.click(screen.getByText('Cancel'))

    expect(confirmSpy).toHaveBeenCalledWith(
      'You have unsaved changes. Are you sure you want to close?'
    )
    expect(onClose).toHaveBeenCalled()
  })

  it('does not close when user declines confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onClose = vi.fn()

    render(<AddressEditModal {...defaultProps} onClose={onClose} />)

    // Make a change
    fireEvent.click(screen.getByTestId('change-address-btn'))

    // Cancel - user declines
    fireEvent.click(screen.getByText('Cancel'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders return address section when includeReturnAddress is true', () => {
    render(
      <AddressEditModal
        {...defaultProps}
        includeReturnAddress={true}
        initialReturnAddress={mockAddress}
      />
    )

    expect(screen.getByTestId('return-address-section')).toBeInTheDocument()
  })

  it('handles return address save', () => {
    const onReturnAddressSave = vi.fn()
    const onSave = vi.fn()
    const onClose = vi.fn()

    render(
      <AddressEditModal
        {...defaultProps}
        onSave={onSave}
        onClose={onClose}
        includeReturnAddress={true}
        initialReturnAddress={mockAddress}
        onReturnAddressSave={onReturnAddressSave}
      />
    )

    // Change both addresses
    fireEvent.click(screen.getByTestId('change-address-btn'))
    fireEvent.click(screen.getByTestId('change-return-btn'))

    // Save
    fireEvent.click(screen.getByText('Save Changes'))

    expect(onReturnAddressSave).toHaveBeenCalledWith(
      expect.objectContaining({
        addressLine1: '789 Sender St',
      })
    )
  })

  it('Save is disabled when address is null', () => {
    render(
      <AddressEditModal {...defaultProps} initialAddress={null} />
    )

    expect(screen.getByText('Save Changes')).toBeDisabled()
  })

  it('handles null initial address', () => {
    render(
      <AddressEditModal {...defaultProps} initialAddress={null} />
    )

    expect(screen.getByTestId('current-address')).toHaveTextContent('no address')
  })
})
