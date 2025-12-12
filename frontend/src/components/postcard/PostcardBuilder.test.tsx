import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostcardBuilder } from './PostcardBuilder'
import type { Address } from '../../types/address'
import { generatePreviewHTML, POSTCARD_6X4_DIMENSIONS } from '../../utils/postcardTemplate'

// Mock dependencies
vi.mock('@uiw/react-md-editor', () => ({
  default: ({ value, onChange, height }: any) => (
    <div data-testid="md-editor" data-height={height}>
      <textarea
        data-testid="md-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
      />
      <div data-testid="md-preview">Markdown Preview</div>
    </div>
  )
}))

vi.mock('marked', () => ({
  marked: vi.fn((text) => Promise.resolve(`<p>${text}</p>`))
}))

vi.mock('../../utils/postcardTemplate', () => ({
  generatePreviewHTML: vi.fn((image, side, showZones, message) =>
    `<html><body>${side} preview</body></html>`
  ),
  POSTCARD_6X4_DIMENSIONS: {
    width: 1800,
    height: 1200,
    safeMargin: 37.5,
    bleedMargin: 18.75,
  }
}))

vi.mock('../address/AddressForm', () => ({
  AddressForm: ({ onSubmit, initialAddress }: any) => (
    <div data-testid="address-form">
      <h2>Recipient Address</h2>
      <input
        data-testid="first-name"
        placeholder="First Name"
        defaultValue={initialAddress?.firstName || ''}
        onChange={(e) => {
          const address = {
            firstName: e.target.value,
            lastName: '',
            addressLine1: '',
            city: '',
            provinceOrState: '',
            postalOrZip: '',
            countryCode: 'CA',
            ...initialAddress
          }
          onSubmit(address)
        }}
      />
      <button onClick={() => onSubmit(initialAddress || {})}>
        Save Address
      </button>
    </div>
  )
}))

describe('PostcardBuilder', () => {
  const mockOnAddressChange = vi.fn()
  const mockOnImageChange = vi.fn()
  const mockOnMessageChange = vi.fn()

  const defaultProps = {
    onAddressChange: mockOnAddressChange,
    onImageChange: mockOnImageChange,
    onMessageChange: mockOnMessageChange,
    selectedImage: null,
    recipientAddress: null,
    message: ''
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset FileReader mock
    global.FileReader = class MockFileReader {
      onload: ((event: any) => {}) | null = null
      onerror: ((event: any) => {}) | null = null
      readAsDataURL = vi.fn(() => {
        if (this.onload) {
          this.onload({ target: { result: 'data:image/jpeg;base64,test' } })
        }
      })
    } as any
  })

  describe('Component Rendering', () => {
    it('should render the postcard builder with all sections', () => {
      render(<PostcardBuilder {...defaultProps} />)

      expect(screen.getByText('Create Your Postcard')).toBeInTheDocument()
      expect(screen.getByText('Recipient Address')).toBeInTheDocument()
      expect(screen.getByText('Message Content')).toBeInTheDocument()
      expect(screen.getByText('Postcard Image')).toBeInTheDocument()
    })

    it('should render progress indicator with initial state', () => {
      render(<PostcardBuilder {...defaultProps} />)

      const progressBar = document.querySelector('.bg-primary.h-3')
      expect(progressBar).toBeInTheDocument()

      expect(screen.getByText('Complete: 0 of 3 steps')).toBeInTheDocument()
    })

    it('should render safe zones toggle', () => {
      render(<PostcardBuilder {...defaultProps} />)

      const toggle = screen.getByRole('checkbox')
      expect(toggle).toBeInTheDocument()
      expect(screen.getByText('Show Safe Zones')).toBeInTheDocument()
    })

    it('should show safe zones guide when toggle is enabled', () => {
      render(<PostcardBuilder {...defaultProps} />)

      expect(screen.getByText('Safe Zone Guide:')).toBeInTheDocument()
      expect(screen.getByText('Green')).toBeInTheDocument()
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Green: Safe zone - keep important content here'
      })).toBeInTheDocument()
      expect(screen.getByText('Yellow')).toBeInTheDocument()
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Yellow: Bleed zone - design can extend here'
      })).toBeInTheDocument()
      expect(screen.getByText('Red')).toBeInTheDocument()
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Red: Address block - reserved area'
      })).toBeInTheDocument()
    })

    it('should not show safe zones guide when toggle is disabled', async () => {
      const user = userEvent.setup()
      render(<PostcardBuilder {...defaultProps} />)

      const toggle = screen.getByRole('checkbox')
      await user.click(toggle)

      expect(screen.queryByText('Safe Zone Guide:')).not.toBeInTheDocument()
    })

    it('should render dimensions information', () => {
      render(<PostcardBuilder {...defaultProps} />)

      expect(screen.getByText('Dimensions: 6" × 4" (1800px × 1200px at 300 DPI)')).toBeInTheDocument()
    })
  })

  describe('Progress Indicator', () => {
    it('should update progress when address is filled', async () => {
      const user = userEvent.setup()
      render(<PostcardBuilder {...defaultProps} />)

      expect(screen.getByText('Complete: 0 of 3 steps')).toBeInTheDocument()

      const firstNameInput = screen.getByTestId('first-name')
      await user.type(firstNameInput, 'John')

      await waitFor(() => {
        expect(mockOnAddressChange).toHaveBeenCalled()
      })
    })

    it('should update progress when message is added', () => {
      const props = {
        ...defaultProps,
        message: 'Hello world'
      }
      render(<PostcardBuilder {...props} />)

      expect(screen.getByText('Complete: 1 of 3 steps')).toBeInTheDocument()
    })

    it('should update progress when image is selected', () => {
      const props = {
        ...defaultProps,
        selectedImage: { file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }), preview: 'test' }
      }
      render(<PostcardBuilder {...props} />)

      expect(screen.getByText('Complete: 1 of 3 steps')).toBeInTheDocument()
    })

    it('should show complete progress when all fields are filled', () => {
      const props = {
        ...defaultProps,
        message: 'Test message',
        selectedImage: { file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }), preview: 'test' },
        recipientAddress: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'Toronto',
          provinceOrState: 'ON',
          postalOrZip: 'M5V 2N6',
          countryCode: 'CA'
        }
      }
      render(<PostcardBuilder {...props} />)

      expect(screen.getByText('Complete: 3 of 3 steps')).toBeInTheDocument()
    })
  })

  describe('Address Form Integration', () => {
    it('should pass address changes to parent component', async () => {
      const user = userEvent.setup()
      render(<PostcardBuilder {...defaultProps} />)

      const firstNameInput = screen.getByTestId('first-name')
      await user.type(firstNameInput, 'John')

      await waitFor(() => {
        expect(mockOnAddressChange).toHaveBeenCalledWith(
          expect.objectContaining({ firstName: 'John' })
        )
      })
    })

    it('should pass initial address to AddressForm', () => {
      const initialAddress: Address = {
        firstName: 'Jane',
        lastName: 'Doe',
        addressLine1: '123 Main St',
        addressLine2: '',
        city: 'Toronto',
        provinceOrState: 'ON',
        postalOrZip: 'M5V 2N6',
        countryCode: 'CA'
      }

      const props = {
        ...defaultProps,
        recipientAddress: initialAddress
      }
      render(<PostcardBuilder {...props} />)

      const addressForm = screen.getByTestId('address-form')
      expect(addressForm).toBeInTheDocument()
    })
  })

  describe('Message Editor', () => {
    it('should render markdown editor', () => {
      render(<PostcardBuilder {...defaultProps} />)

      expect(screen.getByTestId('md-editor')).toBeInTheDocument()
      expect(screen.getByText('Your Message')).toBeInTheDocument()
      expect(screen.getByText('Markdown with live preview')).toBeInTheDocument()
    })

    it('should pass message value to markdown editor', () => {
      const props = {
        ...defaultProps,
        message: '# Test Message'
      }
      render(<PostcardBuilder {...props} />)

      const textarea = screen.getByTestId('md-textarea')
      expect(textarea).toHaveValue('# Test Message')
    })

    it('should call onMessageChange when markdown editor value changes', async () => {
      const user = userEvent.setup()
      render(<PostcardBuilder {...defaultProps} />)

      const textarea = screen.getByTestId('md-textarea')
      await user.type(textarea, 'Hello world')

      await waitFor(() => {
        expect(mockOnMessageChange).toHaveBeenCalled()
      })
    })

    it('should show correct editor height', () => {
      render(<PostcardBuilder {...defaultProps} />)

      const editor = screen.getByTestId('md-editor')
      expect(editor).toHaveAttribute('data-height', '300')
    })
  })

  describe('Image Upload', () => {
    it('should render upload area when no image is selected', () => {
      render(<PostcardBuilder {...defaultProps} />)

      expect(screen.getByText(/Click to upload/)).toBeInTheDocument()
      expect(screen.getByText(/or drag and drop/)).toBeInTheDocument()
      expect(screen.getByText(/JPG, PNG or GIF/)).toBeInTheDocument()
    })

    it('should render file input with correct attributes', () => {
      render(<PostcardBuilder {...defaultProps} />)

      const fileInput = document.getElementById('postcard-front-image')
      expect(fileInput).toBeInTheDocument()
      expect(fileInput).toHaveAttribute('type', 'file')
      expect(fileInput).toHaveAttribute('accept', 'image/jpeg,image/jpg,image/png,image/gif')
      expect(fileInput).toHaveClass('hidden')
    })

    it('should show selected image information', () => {
      const selectedImage = {
        file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
        preview: 'data:image/jpeg;base64,test'
      }

      const props = {
        ...defaultProps,
        selectedImage
      }
      render(<PostcardBuilder {...props} />)

      expect(screen.getByText('test.jpg')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Change Image' })).toBeInTheDocument()
    })

    it('should handle file input change', async () => {
      render(<PostcardBuilder {...defaultProps} />)

      const fileInput = document.getElementById('postcard-front-image') as HTMLInputElement
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(mockOnImageChange).toHaveBeenCalledWith({
          file,
          preview: 'data:image/jpeg;base64,test'
        })
      })
    })

    it('should handle drag and drop', async () => {
      render(<PostcardBuilder {...defaultProps} />)

      const dropArea = screen.getByText(/Click to upload/).closest('div')
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      fireEvent.dragOver(dropArea!)
      fireEvent.drop(dropArea!, {
        dataTransfer: {
          files: [file]
        }
      })

      await waitFor(() => {
        expect(mockOnImageChange).toHaveBeenCalled()
      })
    })

    it('should handle image removal', async () => {
      const user = userEvent.setup()
      const selectedImage = {
        file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
        preview: 'data:image/jpeg;base64,test'
      }

      const props = {
        ...defaultProps,
        selectedImage
      }
      render(<PostcardBuilder {...props} />)

      const removeButton = screen.getByRole('button', { name: 'Change Image' })
      await user.click(removeButton)

      expect(mockOnImageChange).toHaveBeenCalledWith(null)
    })
  })

  describe('File Validation', () => {
    it('should reject invalid file types', async () => {
      render(<PostcardBuilder {...defaultProps} />)

      const fileInput = document.getElementById('postcard-front-image') as HTMLInputElement
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText(/Invalid file type/)).toBeInTheDocument()
        expect(mockOnImageChange).not.toHaveBeenCalled()
      })
    })

    it('should reject files that are too large', async () => {
      render(<PostcardBuilder {...defaultProps} />)

      const fileInput = document.getElementById('postcard-front-image') as HTMLInputElement
      const file = new File(['test'], 'large.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText(/File size must be less than 10MB/)).toBeInTheDocument()
        expect(mockOnImageChange).not.toHaveBeenCalled()
      })
    })

    it('should clear upload error when new file is selected', async () => {
      const user = userEvent.setup()
      render(<PostcardBuilder {...defaultProps} />)

      // First trigger an error
      const fileInput = document.getElementById('postcard-front-image') as HTMLInputElement
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' })

      fireEvent.change(fileInput, { target: { files: [invalidFile] } })

      await waitFor(() => {
        expect(screen.getByText(/Invalid file type/)).toBeInTheDocument()
      })

      // Upload a valid file to clear error
      const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      fireEvent.change(fileInput, { target: { files: [validFile] } })

      await waitFor(() => {
        expect(screen.queryByText(/Invalid file type/)).not.toBeInTheDocument()
      })
    })
  })

  describe('Preview Generation', () => {
    it('should generate preview HTML for front and back', () => {
      const props = {
        ...defaultProps,
        selectedImage: { file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }), preview: 'test' },
        message: 'Hello world'
      }
      render(<PostcardBuilder {...props} />)

      expect(generatePreviewHTML).toHaveBeenCalled()
      expect(generatePreviewHTML).toHaveBeenCalledWith('test', 'front', true)
      expect(generatePreviewHTML).toHaveBeenCalledWith('', 'back', true, expect.any(String))
    })

    it('should render preview iframes', () => {
      render(<PostcardBuilder {...defaultProps} />)

      const iframes = document.querySelectorAll('iframe')
      expect(iframes).toHaveLength(2)

      const frontPreview = document.querySelector('iframe[title="Postcard Front Preview"]')
      const backPreview = document.querySelector('iframe[title="Postcard Back Preview"]')

      expect(frontPreview).toBeInTheDocument()
      expect(backPreview).toBeInTheDocument()
    })

    it('should update preview when safe zones toggle changes', async () => {
      const user = userEvent.setup()
      render(<PostcardBuilder {...defaultProps} />)

      const toggle = screen.getByRole('checkbox')
      await user.click(toggle)

      expect(generatePreviewHTML).toHaveBeenCalled()
    })

    it('should update preview when message changes', () => {
      const props = {
        ...defaultProps,
        message: 'New message'
      }
      render(<PostcardBuilder {...props} />)

      expect(generatePreviewHTML).toHaveBeenCalledWith('', 'back', true, expect.any(String))
    })
  })

  describe('Component Props', () => {
    it('should handle all props correctly', () => {
      const props = {
        ...defaultProps,
        message: 'Test message',
        selectedImage: { file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }), preview: 'test' },
        recipientAddress: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          addressLine2: '',
          city: 'Toronto',
          provinceOrState: 'ON',
          postalOrZip: 'M5V 2N6',
          countryCode: 'CA'
        }
      }

      render(<PostcardBuilder {...props} />)

      expect(screen.getByTestId('md-textarea')).toHaveValue('Test message')
      expect(screen.getByText('test.jpg')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle FileReader errors', async () => {
      global.FileReader = class MockFileReaderError {
        onerror: ((event: any) => {}) | null = null
        readAsDataURL = vi.fn(() => {
          if (this.onerror) {
            this.onerror({} as any)
          }
        })
      } as any

      render(<PostcardBuilder {...defaultProps} />)

      const fileInput = document.getElementById('postcard-front-image') as HTMLInputElement
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText('Failed to read file')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels and descriptions', () => {
      render(<PostcardBuilder {...defaultProps} />)

      expect(screen.getByText('Create Your Postcard')).toBeInTheDocument()
      expect(screen.getByText('Show Safe Zones')).toBeInTheDocument()
      expect(screen.getByText('Message Content')).toBeInTheDocument()
      expect(screen.getByText('Postcard Image')).toBeInTheDocument()
    })

    it('should have proper ARIA roles', () => {
      render(<PostcardBuilder {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeInTheDocument()

      const iframe1 = screen.getByTitle('Postcard Front Preview')
      const iframe2 = screen.getByTitle('Postcard Back Preview')
      expect(iframe1).toBeInTheDocument()
      expect(iframe2).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<PostcardBuilder {...defaultProps} />)

      const toggle = screen.getByRole('checkbox')
      toggle.focus()
      expect(toggle).toHaveFocus()

      await user.keyboard('[Space]')
      expect(toggle).not.toBeChecked()
    })
  })

  describe('Edge Cases', () => {
    it('should handle null selectedImage', () => {
      render(<PostcardBuilder {...defaultProps} />)

      expect(screen.queryByText('Change Image')).not.toBeInTheDocument()
      expect(screen.getByText(/Click to upload/)).toBeInTheDocument()
    })

    it('should handle empty message', () => {
      render(<PostcardBuilder {...defaultProps} />)

      const textarea = screen.getByTestId('md-textarea')
      expect(textarea).toHaveValue('')
    })

    it('should handle rapid prop changes', () => {
      const { rerender } = render(<PostcardBuilder {...defaultProps} />)

      const props1 = {
        ...defaultProps,
        message: 'Message 1'
      }
      rerender(<PostcardBuilder {...props1} />)

      const props2 = {
        ...defaultProps,
        message: 'Message 2'
      }
      rerender(<PostcardBuilder {...props2} />)

      expect(screen.getByTestId('md-textarea')).toHaveValue('Message 2')
    })
  })
})