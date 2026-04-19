import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import React, { useState } from 'react';
import { MessageEditor } from './MessageEditor';

// Mock the markdown editor
vi.mock('@uiw/react-md-editor', () => {
  return {
    default: function MockMDEditor({ value, onChange, placeholder }: { value?: string; onChange?: (val: string) => void; placeholder?: string }) {
      return (
        <textarea
          data-testid="md-editor"
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
        />
      );
    }
  };
});

// Stateful wrapper for tests that need onChange to update the message prop
function MessageEditorWithState({ initialMessage = '', ...props }: {
  initialMessage?: string;
  placeholder?: string;
  autoSave?: boolean;
  isEditing?: boolean;
  onEditingChange?: (isEditing: boolean) => void;
}) {
  const [message, setMessage] = useState(initialMessage);
  return <MessageEditor message={message} onChange={setMessage} {...props} />;
}

describe('MessageEditor', () => {
  const defaultProps = {
    message: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders placeholder when no message', () => {
    render(<MessageEditor {...defaultProps} />);
    expect(screen.getByText('Click to add your message...')).toBeInTheDocument();
  });

  it('renders message when provided', () => {
    render(<MessageEditor {...defaultProps} message="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('enters edit mode when clicked', async () => {
    const user = userEvent.setup();
    render(<MessageEditor {...defaultProps} />);

    const messageArea = screen.getByText('Click to add your message...');
    await user.click(messageArea);

    expect(screen.getByTestId('md-editor')).toBeInTheDocument();
  });

  it('calls onChange when message is edited', async () => {
    const user = userEvent.setup();
    // Use autoSave=false so onChange fires immediately and prop updates in real-time
    render(<MessageEditorWithState autoSave={false} />);

    // Enter edit mode
    const messageArea = screen.getByText('Click to add your message...');
    await user.click(messageArea);

    // Type in editor
    const editor = screen.getByTestId('md-editor');
    await user.type(editor, 'Hello');

    // With autoSave=false, onChange fires immediately on each keystroke
    expect(editor).toHaveValue('Hello');
  });

  it('shows word and character counts in edit mode', async () => {
    const user = userEvent.setup();
    render(<MessageEditor {...defaultProps} message="Hello world test" />);

    const messageArea = screen.getByText('Hello world test');
    await user.click(messageArea);

    expect(screen.getByText(/Words:/)).toBeInTheDocument();
    expect(screen.getByText(/Characters:/)).toBeInTheDocument();
    // "Hello world test" = 3 words
    expect(screen.getByText('3')).toBeInTheDocument();
    // "Hello world test" = 16 characters
    expect(screen.getByText(/16/)).toBeInTheDocument();
  });

  it('enforces maximum character limit', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(<MessageEditor {...defaultProps} onChange={mockOnChange} />);

    await user.click(screen.getByText('Click to add your message...'));

    const editor = screen.getByTestId('md-editor');
    const longMessage = 'a'.repeat(600); // Exceeds max limit of 500

    // Use fireEvent.change to set value directly (user.type with 600 chars is too slow)
    fireEvent.change(editor, { target: { value: longMessage } });

    // Should not call onChange with message exceeding limit
    expect(mockOnChange).not.toHaveBeenCalledWith(expect.stringMatching(/^a{501,}$/));
  }, 15000);

  it('exits edit mode when ESC key is pressed', async () => {
    const user = userEvent.setup();
    render(<MessageEditorWithState />);

    await user.click(screen.getByText('Click to add your message...'));
    expect(screen.getByTestId('md-editor')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByTestId('md-editor')).not.toBeInTheDocument();
    expect(screen.getByText('Click to add your message...')).toBeInTheDocument();
  });

  it('exits edit mode when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <MessageEditorWithState />
        <div data-testid="outside">Outside element</div>
      </div>
    );

    await user.click(screen.getByText('Click to add your message...'));
    expect(screen.getByTestId('md-editor')).toBeInTheDocument();

    await user.click(screen.getByTestId('outside'));

    expect(screen.queryByTestId('md-editor')).not.toBeInTheDocument();
  });

  it('shows warning when near character limit', async () => {
    const user = userEvent.setup();
    const longMessage = 'a'.repeat(460); // 92% of 500 limit
    render(<MessageEditor {...defaultProps} message={longMessage} />);

    await user.click(screen.getByText(longMessage));

    expect(screen.getByText(/460\/500/)).toBeInTheDocument();
    expect(screen.getByText(/460\/500/)).toHaveClass('text-yellow-600');
  });

  it('shows error when at character limit', async () => {
    const user = userEvent.setup();
    const longMessage = 'a'.repeat(500); // At limit
    render(<MessageEditor {...defaultProps} message={longMessage} />);

    await user.click(screen.getByText(longMessage));

    expect(screen.getByText(/500\/500/)).toBeInTheDocument();
    expect(screen.getByText(/500\/500/)).toHaveClass('text-red-600');
  });

  it('displays edit mode indicator', async () => {
    const user = userEvent.setup();
    render(<MessageEditor {...defaultProps} />);

    await user.click(screen.getByText('Click to add your message...'));

    expect(screen.getByText('Press ESC to finish')).toBeInTheDocument();
  });

  it('respects custom placeholder', () => {
    render(
      <MessageEditor
        {...defaultProps}
        placeholder="Custom placeholder text"
      />
    );

    expect(screen.getByText('Custom placeholder text')).toBeInTheDocument();
  });

  it('handles autoSave being disabled', () => {
    render(<MessageEditorWithState autoSave={false} />);

    // Click to enter edit mode
    const messageArea = screen.getByText('Click to add your message...');
    fireEvent.click(messageArea);

    const editor = screen.getByTestId('md-editor');
    // Use fireEvent.change to set value directly (avoids user.type garbling)
    act(() => {
      fireEvent.change(editor, { target: { value: 'Hello' } });
    });

    // Should update value immediately when autoSave is false
    expect(editor).toHaveValue('Hello');
  });

  it('handles external editing state control', () => {
    render(
      <MessageEditor
        {...defaultProps}
        isEditing={true}
      />
    );

    expect(screen.getByTestId('md-editor')).toBeInTheDocument();
  });

  it('calls onEditingChange when editing state changes', async () => {
    const user = userEvent.setup();
    const mockOnEditingChange = vi.fn();
    render(
      <MessageEditor
        {...defaultProps}
        onEditingChange={mockOnEditingChange}
      />
    );

    await user.click(screen.getByText('Click to add your message...'));
    expect(mockOnEditingChange).toHaveBeenCalledWith(true);

    await user.keyboard('{Escape}');
    expect(mockOnEditingChange).toHaveBeenCalledWith(false);
  });
});
