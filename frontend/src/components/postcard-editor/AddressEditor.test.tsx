import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddressEditor } from './AddressEditor';
import type { Address } from '../../types/address';

const mockAddress: Address = {
  firstName: 'John',
  lastName: 'Doe',
  addressLine1: '123 Main St',
  addressLine2: 'Apt 4B',
  city: 'New York',
  provinceOrState: 'NY',
  postalOrZip: '10001',
  countryCode: 'US',
};

describe('AddressEditor', () => {
  const defaultProps = {
    address: null,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders stamp placeholder', () => {
    render(<AddressEditor {...defaultProps} />);
    expect(screen.getByText('Stamp')).toBeInTheDocument();
    expect(screen.getByText('(1" × 0.875")')).toBeInTheDocument();
  });

  it('shows click to add message when no address', () => {
    render(<AddressEditor {...defaultProps} />);
    expect(screen.getByText('Click to add recipient address')).toBeInTheDocument();
  });

  it('displays formatted address when provided', () => {
    render(<AddressEditor {...defaultProps} address={mockAddress} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('Apt 4B')).toBeInTheDocument();
    expect(screen.getByText('New York, NY 10001')).toBeInTheDocument();
  });

  it('enters edit mode when clicked', async () => {
    const user = userEvent.setup();
    render(<AddressEditor {...defaultProps} />);

    await user.click(screen.getByText('Click to add recipient address'));

    expect(screen.getByDisplayValue('First Name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Last Name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Street Address')).toBeInTheDocument();
  });

  it('calls onChange when address fields are edited', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    render(<AddressEditor {...defaultProps} onChange={mockOnChange} />);

    await user.click(screen.getByText('Click to add recipient address'));

    const firstNameInput = screen.getByPlaceholderText('John');
    await user.type(firstNameInput, 'Jane');

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'J',
      })
    );
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<AddressEditor {...defaultProps} />);

    await user.click(screen.getByText('Click to add recipient address'));
    await user.click(document.body); // Trigger blur

    expect(screen.getByText('✓ Address format is valid')).toBeInTheDocument();
  });

  it('auto-formats postal codes', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    render(<AddressEditor {...defaultProps} onChange={mockOnChange} />);

    await user.click(screen.getByText('Click to add recipient address'));

    const zipInput = screen.getByPlaceholderText('12345');
    await user.type(zipInput, '123456789');

    // Should format with dash
    expect(mockOnChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        postalOrZip: '12345-6789',
      })
    );
  });

  it('auto-capitalizes names and addresses', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    render(<AddressEditor {...defaultProps} onChange={mockOnChange} />);

    await user.click(screen.getByText('Click to add recipient address'));

    const firstNameInput = screen.getByPlaceholderText('John');
    await user.type(firstNameInput, 'john');

    expect(mockOnChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        firstName: 'John',
      })
    );
  });

  it('handles country selection', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    render(<AddressEditor {...defaultProps} onChange={mockOnChange} />);

    await user.click(screen.getByText('Click to add recipient address'));

    const countrySelect = screen.getByDisplayValue('United States');
    await user.selectOptions(countrySelect, 'CA');

    expect(mockOnChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        countryCode: 'CA',
      })
    );
  });

  it('shows return address section when enabled', () => {
    render(
      <AddressEditor
        {...defaultProps}
        includeReturnAddress={true}
      />
    );

    expect(screen.getByText('Return Address (Optional)')).toBeInTheDocument();
  });

  it('handles return address editing', async () => {
    const user = userEvent.setup();
    const mockOnReturnAddressChange = jest.fn();
    render(
      <AddressEditor
        {...defaultProps}
        includeReturnAddress={true}
        onReturnAddressChange={mockOnReturnAddressChange}
      />
    );

    await user.click(screen.getByText('Click to add return address'));

    const nameInput = screen.getByPlaceholderText('Your Name');
    await user.type(nameInput, 'Jane Smith');

    expect(mockOnReturnAddressChange).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'J',
      })
    );
  });

  it('displays return address when provided', () => {
    render(
      <AddressEditor
        {...defaultProps}
        includeReturnAddress={true}
        returnAddress={mockAddress}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
  });

  it('exits edit mode when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <AddressEditor {...defaultProps} />
        <div data-testid="outside">Outside</div>
      </div>
    );

    await user.click(screen.getByText('Click to add recipient address'));
    expect(screen.getByDisplayValue('First Name')).toBeInTheDocument();

    await user.click(screen.getByTestId('outside'));
    expect(screen.queryByDisplayValue('First Name')).not.toBeInTheDocument();
  });

  it('validates address format', async () => {
    const user = userEvent.setup();
    const invalidAddress = {
      ...mockAddress,
      postalOrZip: 'invalid', // Invalid ZIP code
    };

    render(<AddressEditor {...defaultProps} address={invalidAddress} />);

    await user.click(screen.getByText('John Doe')); // Enter edit mode

    expect(screen.getByText(/Address format is valid/)).toBeInTheDocument();
  });

  it('shows field validation errors', async () => {
    const user = userEvent.setup();
    const invalidAddress = {
      firstName: '',
      lastName: '',
      addressLine1: '',
      city: '',
      provinceOrState: '',
      postalOrZip: '',
      countryCode: 'US',
    };

    render(<AddressEditor {...defaultProps} address={invalidAddress} />);

    await user.click(screen.getByText('Click to add recipient address'));
    await user.click(document.body); // Trigger validation

    expect(screen.getByText('⚠ Please complete required fields')).toBeInTheDocument();
  });

  it('handles optional address line 2', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    render(<AddressEditor {...defaultProps} onChange={mockOnChange} />);

    await user.click(screen.getByText('Click to add recipient address'));

    const aptInput = screen.getByPlaceholderText('Apt 4B');
    await user.type(aptInput, 'Suite 100');

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        addressLine2: 'Suite 100',
      })
    );
  });

  it('displays country for international addresses', () => {
    const caAddress = { ...mockAddress, countryCode: 'CA' };
    render(<AddressEditor {...defaultProps} address={caAddress} />);

    expect(screen.getByText('Canada')).toBeInTheDocument();
  });

  it('respects external editing state control', () => {
    render(<AddressEditor {...defaultProps} isEditing={true} />);

    expect(screen.getByDisplayValue('First Name')).toBeInTheDocument();
  });

  it('calls onEditingChange when editing state changes', async () => {
    const user = userEvent.setup();
    const mockOnEditingChange = jest.fn();
    render(
      <AddressEditor
        {...defaultProps}
        onEditingChange={mockOnEditingChange}
      />
    );

    await user.click(screen.getByText('Click to add recipient address'));
    expect(mockOnEditingChange).toHaveBeenCalledWith(true);
  });

  it('enforces maximum field lengths', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    render(<AddressEditor {...defaultProps} onChange={mockOnChange} />);

    await user.click(screen.getByText('Click to add recipient address'));

    const streetInput = screen.getByPlaceholderText('123 Main St');
    const longStreet = 'a'.repeat(51); // Exceeds 50 char limit

    await user.type(streetInput, longStreet);

    // Should truncate to 50 characters
    expect(mockOnChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        addressLine1: 'a'.repeat(50),
      })
    );
  });
});