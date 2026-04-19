import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { EnhancedInteractivePostcard } from './EnhancedInteractivePostcard'

// Mock CSS
vi.mock('./EnhancedInteractivePostcard.css', () => ({}))

// Mock PostcardFront
vi.mock('./PostcardFront', () => ({
  PostcardFront: ({ onImageUpload, onError }: {
    imageData?: string
    onImageUpload: (img: unknown) => void
    onError?: (error: string) => void
    showSafeZones?: boolean
  }) => (
    <div data-testid="postcard-front-mock">
      <button data-testid="upload-btn" onClick={() => onImageUpload({ file: new File([], 'test.jpg'), preview: 'data:image/jpeg;base64,test' })}>
        Upload Image
      </button>
      <button data-testid="error-btn" onClick={() => onError?.('Image too large')}>
        Trigger Error
      </button>
    </div>
  ),
}))

// Mock PostcardBack — vi.hoisted ensures the mock component is available
// when the hoisted vi.mock factory runs, even for React.lazy() dynamic imports.
const MockPostcardBack = vi.hoisted(() => {
  return function MockPostcardBack({ message, onMessageChange }: {
    message: string
    onMessageChange: (msg: string) => void
    [key: string]: unknown
  }) {
    return (
      <div data-testid="postcard-back-mock">
        <span data-testid="message-display">{message}</span>
        <button data-testid="change-msg-btn" onClick={() => onMessageChange('new message')}>
          Change Message
        </button>
      </div>
    )
  }
})

vi.mock('./PostcardBack', () => ({
  PostcardBack: MockPostcardBack,
}))

// Create a mock state that can be modified per test
const mockState = {
  image: null as { file: File; preview: string } | null,
  message: '',
  recipientAddress: null as unknown,
  senderAddress: {
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    provinceOrState: '',
    postalOrZip: '',
    countryCode: 'US',
  },
  showSafeZones: true,
  isFlipped: false,
  isUploading: false,
  errors: {} as Record<string, string | null>,
}

const mockUsePostcardState = {
  state: mockState,
  isLoading: false,
  isDirty: false,
  lastSaved: null as Date | null,
  canUndo: false,
  canRedo: false,
  undo: vi.fn(),
  redo: vi.fn(),
  setImage: vi.fn(),
  setMessage: vi.fn(),
  setRecipientAddress: vi.fn(),
  setSenderAddress: vi.fn(),
  toggleSafeZones: vi.fn(),
  flip: vi.fn(() => {
    mockState.isFlipped = !mockState.isFlipped
  }),
  setIsUploading: vi.fn(),
  setError: vi.fn(),
  clearErrors: vi.fn(),
  validate: vi.fn(() => false),
  clearDraft: vi.fn(),
  exportState: vi.fn(() => ({
    image: null,
    message: '',
    recipientAddress: null,
    senderAddress: mockState.senderAddress,
  })),
  progress: { completed: 0, total: 4, percentage: 0 },
}

vi.mock('../../hooks/usePostcardState', () => ({
  usePostcardState: () => mockUsePostcardState,
}))

// Mock window.confirm
const mockConfirm = vi.fn(() => true)
const originalConfirm = window.confirm

describe('EnhancedInteractivePostcard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = mockConfirm
    // Reset mock state
    mockState.image = null
    mockState.message = ''
    mockState.recipientAddress = null
    mockState.isFlipped = false
    mockState.isUploading = false
    mockState.errors = {}
    mockUsePostcardState.isLoading = false
    mockUsePostcardState.isDirty = false
    mockUsePostcardState.canUndo = false
    mockUsePostcardState.canRedo = false
    mockUsePostcardState.progress = { completed: 0, total: 4, percentage: 0 }
  })

  afterEach(() => {
    window.confirm = originalConfirm
  })

  it('renders without crashing', async () => {
    await act(async () => {
      render(<EnhancedInteractivePostcard />)
    })
    expect(screen.getByTestId('postcard-front-mock')).toBeInTheDocument()
    expect(screen.getByTestId('postcard-back-mock')).toBeInTheDocument()
  })

  it('renders the flip button', () => {
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByRole('button', { name: /show back side/i })).toBeInTheDocument()
  })

  it('renders Front and Back tab indicators', () => {
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByText('Front')).toBeInTheDocument()
    expect(screen.getByText('Back')).toBeInTheDocument()
  })

  it('calls flip when flip button is clicked', () => {
    render(<EnhancedInteractivePostcard />)
    const flipButton = screen.getByRole('button', { name: /show back side/i })
    fireEvent.click(flipButton)
    expect(mockUsePostcardState.flip).toHaveBeenCalled()
  })

  it('renders the progress bar', () => {
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByText(/Progress: 0 of 4/)).toBeInTheDocument()
  })

  it('shows Safe Zones toggle button', () => {
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByRole('button', { name: /safe zones/i })).toBeInTheDocument()
  })

  it('calls toggleSafeZones when safe zones button is clicked', () => {
    render(<EnhancedInteractivePostcard />)
    fireEvent.click(screen.getByRole('button', { name: /safe zones/i }))
    expect(mockUsePostcardState.toggleSafeZones).toHaveBeenCalled()
  })

  it('renders undo button', () => {
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByRole('button', { name: /undo last action/i })).toBeInTheDocument()
  })

  it('disables undo button when canUndo is false', () => {
    mockUsePostcardState.canUndo = false
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByRole('button', { name: /undo last action/i })).toBeDisabled()
  })

  it('enables undo button when canUndo is true', () => {
    mockUsePostcardState.canUndo = true
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByRole('button', { name: /undo last action/i })).not.toBeDisabled()
  })

  it('calls undo when undo button is clicked', () => {
    mockUsePostcardState.canUndo = true
    render(<EnhancedInteractivePostcard />)
    fireEvent.click(screen.getByRole('button', { name: /undo last action/i }))
    expect(mockUsePostcardState.undo).toHaveBeenCalled()
  })

  it('renders redo button', () => {
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByRole('button', { name: /redo last action/i })).toBeInTheDocument()
  })

  it('disables redo button when canRedo is false', () => {
    mockUsePostcardState.canRedo = false
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByRole('button', { name: /redo last action/i })).toBeDisabled()
  })

  it('calls redo when redo button is clicked', () => {
    mockUsePostcardState.canRedo = true
    render(<EnhancedInteractivePostcard />)
    fireEvent.click(screen.getByRole('button', { name: /redo last action/i }))
    expect(mockUsePostcardState.redo).toHaveBeenCalled()
  })

  it('renders clear draft button', () => {
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByRole('button', { name: /clear draft/i })).toBeInTheDocument()
  })

  it('calls clearDraft after confirmation when clear button is clicked', () => {
    mockUsePostcardState.isDirty = true
    mockConfirm.mockReturnValue(true)
    render(<EnhancedInteractivePostcard />)
    fireEvent.click(screen.getByRole('button', { name: /clear draft/i }))
    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to clear your draft? This cannot be undone.')
    expect(mockUsePostcardState.clearDraft).toHaveBeenCalled()
  })

  it('does not call clearDraft when confirmation is cancelled', () => {
    mockUsePostcardState.isDirty = true
    mockConfirm.mockReturnValue(false)
    render(<EnhancedInteractivePostcard />)
    fireEvent.click(screen.getByRole('button', { name: /clear draft/i }))
    expect(mockConfirm).toHaveBeenCalled()
    expect(mockUsePostcardState.clearDraft).not.toHaveBeenCalled()
  })

  it('does not show confirm when not dirty and clear is clicked', () => {
    mockUsePostcardState.isDirty = false
    render(<EnhancedInteractivePostcard />)
    fireEvent.click(screen.getByRole('button', { name: /clear draft/i }))
    expect(mockConfirm).not.toHaveBeenCalled()
    expect(mockUsePostcardState.clearDraft).not.toHaveBeenCalled()
  })

  it('renders submit button', () => {
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByRole('button', { name: /submit postcard/i })).toBeInTheDocument()
  })

  it('disables submit when progress is less than 100%', () => {
    mockUsePostcardState.progress = { completed: 2, total: 4, percentage: 50 }
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByRole('button', { name: /submit postcard/i })).toBeDisabled()
  })

  it('disables submit when uploading', () => {
    mockState.isUploading = true
    mockUsePostcardState.progress = { completed: 4, total: 4, percentage: 100 }
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByRole('button', { name: /submit postcard/i })).toBeDisabled()
  })

  it('calls validate and onSubmit when submit is clicked and valid', () => {
    const onSubmit = vi.fn()
    mockUsePostcardState.validate.mockReturnValue(true)
    mockUsePostcardState.exportState.mockReturnValue({
      image: { file: new File([], 'test.jpg'), preview: 'data:image/jpeg;base64,test' },
      message: 'Hello',
      recipientAddress: { firstName: 'John', lastName: 'Doe', addressLine1: '123 Main', city: 'Town', provinceOrState: 'CA', postalOrZip: '12345', countryCode: 'US' },
      senderAddress: { firstName: '', lastName: '', addressLine1: '', city: '', provinceOrState: '', postalOrZip: '', countryCode: 'US' },
    })
    mockUsePostcardState.progress = { completed: 4, total: 4, percentage: 100 }

    render(<EnhancedInteractivePostcard onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /submit postcard/i }))

    expect(mockUsePostcardState.validate).toHaveBeenCalled()
    expect(onSubmit).toHaveBeenCalled()
  })

  it('does not call onSubmit when validation fails', () => {
    const onSubmit = vi.fn()
    mockUsePostcardState.validate.mockReturnValue(false)
    mockUsePostcardState.progress = { completed: 4, total: 4, percentage: 100 }

    render(<EnhancedInteractivePostcard onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /submit postcard/i }))

    expect(mockUsePostcardState.validate).toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows loading overlay when isLoading is true', () => {
    mockUsePostcardState.isLoading = true
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByText('Loading your draft...')).toBeInTheDocument()
  })

  it('does not show loading overlay when isLoading is false', () => {
    mockUsePostcardState.isLoading = false
    render(<EnhancedInteractivePostcard />)
    expect(screen.queryByText('Loading your draft...')).not.toBeInTheDocument()
  })

  it('shows error display when there are errors', () => {
    mockState.errors = { image: 'Image is required', message: 'Message is required' }
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByText('Please fix the following errors:')).toBeInTheDocument()
    expect(screen.getByText('Image is required')).toBeInTheDocument()
    expect(screen.getByText('Message is required')).toBeInTheDocument()
  })

  it('does not show error display when there are no errors', () => {
    mockState.errors = {}
    render(<EnhancedInteractivePostcard />)
    expect(screen.queryByText('Please fix the following errors:')).not.toBeInTheDocument()
  })

  it('calls onStateChange when state changes', () => {
    const onStateChange = vi.fn()
    render(<EnhancedInteractivePostcard onStateChange={onStateChange} />)
    expect(onStateChange).toHaveBeenCalledWith(mockState)
  })

  it('toggles keyboard shortcuts help with ? key', () => {
    render(<EnhancedInteractivePostcard />)
    // Initially keyboard help should not be visible
    expect(screen.queryByText('Keyboard Shortcuts:')).not.toBeInTheDocument()

    // Press ? to toggle
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByText('Keyboard Shortcuts:')).toBeInTheDocument()

    // Press ? again to hide
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.queryByText('Keyboard Shortcuts:')).not.toBeInTheDocument()
  })

  it('hides keyboard shortcuts help with Escape key', () => {
    render(<EnhancedInteractivePostcard />)
    // Show help
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByText('Keyboard Shortcuts:')).toBeInTheDocument()

    // Press Escape to hide
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText('Keyboard Shortcuts:')).not.toBeInTheDocument()
  })

  it('displays progress percentage in the progress bar', () => {
    mockUsePostcardState.progress = { completed: 2, total: 4, percentage: 50 }
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByText(/Progress: 2 of 4/)).toBeInTheDocument()
  })

  it('shows last saved time when dirty', () => {
    mockUsePostcardState.isDirty = true
    const savedDate = new Date('2024-06-15T12:00:00')
    mockUsePostcardState.lastSaved = savedDate
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByText(/Last saved:/)).toBeInTheDocument()
  })

  it('shows "Saving..." when dirty but not yet saved', () => {
    mockUsePostcardState.isDirty = true
    mockUsePostcardState.lastSaved = null
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByText('Saving...')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<EnhancedInteractivePostcard className="custom-class" />)
    const wrapper = document.querySelector('.enhanced-postcard-wrapper.custom-class')
    expect(wrapper).toBeInTheDocument()
  })

  it('shows aria-live region for screen reader announcements', () => {
    render(<EnhancedInteractivePostcard />)
    const liveRegion = screen.getByRole('status')
    expect(liveRegion).toBeInTheDocument()
    expect(liveRegion).toHaveAttribute('aria-live', 'polite')
  })

  it('renders screen reader announcements container', () => {
    render(<EnhancedInteractivePostcard />)
    const srOnly = document.querySelector('.sr-only')
    expect(srOnly).toBeInTheDocument()
  })

  it('flip button shows correct aria-label based on state', () => {
    mockState.isFlipped = false
    const { rerender } = render(<EnhancedInteractivePostcard />)
    expect(screen.getByRole('button', { name: /show back side/i })).toBeInTheDocument()

    mockState.isFlipped = true
    rerender(<EnhancedInteractivePostcard />)
    expect(screen.getByRole('button', { name: /show front side/i })).toBeInTheDocument()
  })

  it('shows submitting state on submit button when uploading', () => {
    mockState.isUploading = true
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByText('Submitting...')).toBeInTheDocument()
  })

  it('flip button is disabled when uploading', () => {
    mockState.isUploading = true
    render(<EnhancedInteractivePostcard />)
    expect(screen.getByRole('button', { name: /show back side/i })).toBeDisabled()
  })

  it('has correct ARIA roles for side indicators', () => {
    render(<EnhancedInteractivePostcard />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
    expect(tabs[0]).toHaveTextContent('Front')
    expect(tabs[1]).toHaveTextContent('Back')
  })
})
