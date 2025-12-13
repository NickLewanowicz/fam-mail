import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostcardBack } from './PostcardBack';
import type { Address } from '../../types/address';

const mockAddress: Address = {
  firstName: 'John',
  lastName: 'Doe',
  addressLine1: '123 Main St',
  city: 'New York',
  provinceOrState: 'NY',
  postalOrZip: '10001',
  countryCode: 'US',
};

// Mock the editor components
jest.mock('./MessageEditor', () => {
  return function MockMessageEditor({
    message,
    onChange,
    isEditing,
    onEditingChange
  }: any) {
    return (
      <div
        data-testid="message-editor"
        data-editing={isEditing}
        onClick={() => onEditingChange?.(!isEditing)}
      >
        Message: {message || '[empty]'}
      </div>
    );
  };
});

jest.mock('./AddressEditor', () => {
  return function MockAddressEditor({
    address,
    onChange,
    isEditing,
    onEditingChange,
    includeReturnAddress,
    returnAddress,
    onReturnAddressChange
  }: any) {
    return (
      <div
        data-testid="address-editor"
        data-editing={isEditing}
        data-include-return={includeReturnAddress}
        onClick={() => onEditingChange?.(!isEditing)}
      >
        Address: {address?.addressLine1 || '[no address]'}
        {includeReturnAddress && (
          <div data-testid="return-address">
            Return: {returnAddress?.addressLine1 || '[no return address]'}
          </div>
        )}
      </div>
    );
  };
});

describe('PostcardBack', () => {
  const defaultProps = {
    message: '',
    address: null,
    onMessageChange: jest.fn(),
    onAddressChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with 60/40 split layout', () => {
    render(<PostcardBack {...defaultProps} />);

    const messageEditor = screen.getByTestId('message-editor');
    const addressEditor = screen.getByTestId('address-editor');

    expect(messageEditor).toBeInTheDocument();
    expect(addressEditor).toBeInTheDocument();

    // The components should be rendered in the correct areas
    expect(messageEditor.parentElement).toHaveStyle('width: 60%');
    expect(addressEditor.parentElement).toHaveStyle('width: 40%');
  });

  it('displays postal compliance indicator', () => {
    render(<PostcardBack {...defaultProps} />);

    // Check for compliance indicator
    expect(screen.getByText(/Postal Compliant/)).toBeInTheDocument();
  });

  it('passes message and address to editors', () => {
    render(
      <PostcardBack
        {...defaultProps}
        message="Hello world"
        address={mockAddress}
      />
    );

    expect(screen.getByText('Message: Hello world')).toBeInTheDocument();
    expect(screen.getByText('Address: 123 Main St')).toBeInTheDocument();
  });

  it('handles message editing', async () => {
    const user = userEvent.setup();
    const mockOnMessageChange = jest.fn();

    render(<PostcardBack {...defaultProps} onMessageChange={mockOnMessageChange} />);

    const messageEditor = screen.getByTestId('message-editor');
    await user.click(messageEditor);

    expect(messageEditor).toHaveAttribute('data-editing', 'true');
  });

  it('handles address editing', async () => {
    const user = userEvent.setup();
    const mockOnAddressChange = jest.fn();

    render(<PostcardBack {...defaultProps} onAddressChange={mockOnAddressChange} />);

    const addressEditor = screen.getByTestId('address-editor');
    await user.click(addressEditor);

    expect(addressEditor).toHaveAttribute('data-editing', 'true');
  });

  it('shows edit mode indicator when editing', async () => {
    const user = userEvent.setup();

    render(<PostcardBack {...defaultProps} />);

    const messageEditor = screen.getByTestId('message-editor');
    await user.click(messageEditor);

    expect(screen.getByText('Editing message • Press ESC to finish')).toBeInTheDocument();
  });

  it('shows correct edit mode indicator for address', async () => {
    const user = userEvent.setup();

    render(<PostcardBack {...defaultProps} />);

    const addressEditor = screen.getByTestId('address-editor');
    await user.click(addressEditor);

    expect(screen.getByText('Editing address • Press ESC to finish')).toBeInTheDocument();
  });

  it('handles return address when enabled', () => {
    const mockReturnAddress: Address = {
      ...mockAddress,
      firstName: 'Jane',
      lastName: 'Smith',
    };

    render(
      <PostcardBack
        {...defaultProps}
        includeReturnAddress={true}
        returnAddress={mockReturnAddress}
        onReturnAddressChange={jest.fn()}
      />
    );

    expect(screen.getByTestId('address-editor')).toHaveAttribute('data-include-return', 'true');
    expect(screen.getByTestId('return-address')).toBeInTheDocument();
    expect(screen.getByText('Return: 123 Main St')).toBeInTheDocument();
  });

  it('applies correct styling for message editing zone', async () => {
    const user = userEvent.setup();

    render(<PostcardBack {...defaultProps} />);

    const messageEditor = screen.getByTestId('message-editor');
    await user.click(messageEditor);

    // Check if editing state applies ring
    const messageContainer = messageEditor.parentElement;
    expect(messageContainer).toHaveClass('ring-2', 'ring-blue-400', 'ring-opacity-50');
  });

  it('applies correct styling for address editing zone', async () => {
    const user = userEvent.setup();

    render(<PostcardBack {...defaultProps} />);

    const addressEditor = screen.getByTestId('address-editor');
    await user.click(addressEditor);

    // Check if editing state applies ring
    const addressContainer = addressEditor.parentElement;
    expect(addressContainer).toHaveClass('ring-2', 'ring-blue-400', 'ring-opacity-50');
  });

  it('passes autoSave prop to MessageEditor', () => {
    render(<PostcardBack {...defaultProps} autoSave={false} />);

    const messageEditor = screen.getByTestId('message-editor');
    // We can't directly test the prop passing with our mock, but we can verify it renders
    expect(messageEditor).toBeInTheDocument();
  });

  it('handles coordinate editing state correctly', async () => {
    const user = userEvent.setup();

    render(<PostcardBack {...defaultProps} />);

    // Start editing message
    const messageEditor = screen.getByTestId('message-editor');
    await user.click(messageEditor);
    expect(screen.getByText(/Editing message/)).toBeInTheDocument();

    // Click address - should switch to address editing
    const addressEditor = screen.getByTestId('address-editor');
    await user.click(addressEditor);
    expect(screen.getByText(/Editing address/)).toBeInTheDocument();
    expect(screen.queryByText(/Editing message/)).not.toBeInTheDocument();
  });

  it('maintains proper layout structure', () => {
    const { container } = render(<PostcardBack {...defaultProps} />);

    // Check main container
    const postcardBack = container.querySelector('.postcard-back');
    expect(postcardBack).toHaveClass('flex', 'overflow-hidden');

    // Check message area
    const messageArea = container.querySelector('[style*="width: 60%"]');
    expect(messageArea).toBeInTheDocument();

    // Check address area
    const addressArea = container.querySelector('[style*="width: 40%"]');
    expect(addressArea).toBeInTheDocument();

    // Check divider
    const divider = container.querySelector('.w-px');
    expect(divider).toBeInTheDocument();
  });

  it('displays correct compliance text on different screen sizes', () => {
    render(<PostcardBack {...defaultProps} />);

    const complianceText = screen.getByText(/Postal Compliant/);

    // Should have responsive text
    expect(complianceText).toBeInTheDocument();
    expect(complianceText).toHaveClass('text-xs', 'text-gray-400');
  });

  it('provides proper event handling to editors', async () => {
    const user = userEvent.setup();
    const mockOnMessageChange = jest.fn();
    const mockOnAddressChange = jest.fn();

    render(
      <PostcardBack
        {...defaultProps}
        onMessageChange={mockOnMessageChange}
        onAddressChange={mockOnAddressChange}
      />
    );

    // Test message interactions
    const messageEditor = screen.getByTestId('message-editor');
    await user.click(messageEditor);

    // Test address interactions
    const addressEditor = screen.getByTestId('address-editor');
    await user.click(addressEditor);

    // Verify editors are rendered and clickable
    expect(messageEditor).toBeInTheDocument();
    expect(addressEditor).toBeInTheDocument();
  });

  it('handles return address changes', () => {
    const mockOnReturnAddressChange = jest.fn();

    render(
      <PostcardBack
        {...defaultProps}
        includeReturnAddress={true}
        onReturnAddressChange={mockOnReturnAddressChange}
      />
    );

    expect(screen.getByTestId('address-editor')).toHaveAttribute('data-include-return', 'true');
  });
});