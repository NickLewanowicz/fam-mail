import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PostcardFront } from './PostcardFront'
import { ALLOWED_TYPES } from '../../utils/imageProcessing'

// Mock the useImageEditor hook
const mockReset = vi.fn()
const mockClearError = vi.fn()
const mockLoadImage = vi.fn()

vi.mock('../../hooks/useImageEditor', () => ({
  useImageEditor: () => ({
    originalImage: null,
    processedImage: null,
    thumbnail: null,
    dimensions: null,
    fileSize: 0,
    transform: { scale: 1, rotation: 0, offsetX: 0, offsetY: 0 },
    isLoading: false,
    error: null,
    qualityWarnings: [],
    qualityRecommendations: [],
    safeZoneOverlay: null,
    reset: mockReset,
    clearError: mockClearError,
    loadImage: mockLoadImage,
    getImageData: vi.fn(() => null),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    rotateLeft: vi.fn(),
    rotateRight: vi.fn(),
    resetRotation: vi.fn(),
    resetTransform: vi.fn(),
    pan: vi.fn(),
    updateTransform: vi.fn(),
  }),
}))

describe('PostcardFront', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const onImageUpload = vi.fn()
    render(<PostcardFront onImageUpload={onImageUpload} />)
    expect(screen.getByTestId('postcard-front')).toBeInTheDocument()
  })

  it('shows upload area when no image is loaded', () => {
    const onImageUpload = vi.fn()
    render(<PostcardFront onImageUpload={onImageUpload} />)
    expect(screen.getByText('Click to upload image')).toBeInTheDocument()
  })

  it('shows "No image uploaded" in readOnly mode', () => {
    const onImageUpload = vi.fn()
    render(<PostcardFront onImageUpload={onImageUpload} readOnly={true} />)
    expect(screen.getByText('No image uploaded')).toBeInTheDocument()
  })

  it('shows drag and drop text', () => {
    const onImageUpload = vi.fn()
    render(<PostcardFront onImageUpload={onImageUpload} />)
    expect(screen.getByText('or drag and drop')).toBeInTheDocument()
  })

  it('shows file type hints', () => {
    const onImageUpload = vi.fn()
    render(<PostcardFront onImageUpload={onImageUpload} />)
    expect(screen.getByText(/JPG, PNG, GIF, or WebP/)).toBeInTheDocument()
  })

  it('does not show file input in readOnly mode', () => {
    const onImageUpload = vi.fn()
    render(<PostcardFront onImageUpload={onImageUpload} readOnly={true} />)
    expect(screen.queryByLabelText('Upload image file')).not.toBeInTheDocument()
  })

  it('has a hidden file input when not readOnly', () => {
    const onImageUpload = vi.fn()
    render(<PostcardFront onImageUpload={onImageUpload} readOnly={false} />)
    expect(screen.getByLabelText('Upload image file')).toBeInTheDocument()
  })

  it('has correct aria-label for upload area', () => {
    const onImageUpload = vi.fn()
    render(<PostcardFront onImageUpload={onImageUpload} />)
    expect(screen.getByTestId('postcard-front')).toHaveAttribute(
      'aria-label',
      'Upload image for postcard front'
    )
  })

  it('has button role', () => {
    const onImageUpload = vi.fn()
    render(<PostcardFront onImageUpload={onImageUpload} />)
    expect(screen.getByTestId('postcard-front')).toHaveAttribute('role', 'button')
  })

  describe('File input', () => {
    it('accepts correct image types', () => {
      const onImageUpload = vi.fn()
      render(<PostcardFront onImageUpload={onImageUpload} />)
      const input = screen.getByLabelText('Upload image file') as HTMLInputElement
      expect(input.accept).toBe(ALLOWED_TYPES.join(','))
    })
  })

  describe('ReadOnly mode', () => {
    it('has not-allowed cursor style', () => {
      const onImageUpload = vi.fn()
      render(<PostcardFront onImageUpload={onImageUpload} readOnly={true} />)
      const container = screen.getByTestId('postcard-front')
      // Check the upload area inside the component
      expect(container.querySelector('.cursor-not-allowed')).toBeInTheDocument()
    })

    it('hides drag-and-drop hints in readOnly mode', () => {
      const onImageUpload = vi.fn()
      render(<PostcardFront onImageUpload={onImageUpload} readOnly={true} />)
      expect(screen.queryByText('or drag and drop')).not.toBeInTheDocument()
    })
  })
})
