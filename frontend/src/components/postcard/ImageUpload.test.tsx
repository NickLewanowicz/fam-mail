import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImageUpload } from './ImageUpload'

describe('ImageUpload', () => {
  it('should render the image upload component', () => {
    const onImageSelect = vi.fn()
    render(<ImageUpload onImageSelect={onImageSelect} isOpen={true} />)
    
    expect(screen.getByText('Postcard Image')).toBeInTheDocument()
  })

  it('should render drag and drop area when no image selected', () => {
    const onImageSelect = vi.fn()
    render(<ImageUpload onImageSelect={onImageSelect} isOpen={true} />)
    
    expect(screen.getByText(/drag and drop your image here/i)).toBeInTheDocument()
  })

  it('should render file input', () => {
    const onImageSelect = vi.fn()
    render(<ImageUpload onImageSelect={onImageSelect} isOpen={true} />)
    
    const fileInput = document.querySelector('#postcard-image-upload')
    expect(fileInput).toBeInTheDocument()
    expect(fileInput).toHaveAttribute('type', 'file')
    expect(fileInput).toHaveAttribute('accept', 'image/*,application/pdf')
  })

  it('should validate file type', () => {
    const onImageSelect = vi.fn()
    render(<ImageUpload onImageSelect={onImageSelect} isOpen={true} />)
    
    const fileInput = document.querySelector('#postcard-image-upload') as HTMLInputElement
    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' })
    
    fireEvent.change(fileInput, { target: { files: [invalidFile] } })
    
    expect(screen.getByText(/please upload a jpg, png, or pdf file/i)).toBeInTheDocument()
    expect(onImageSelect).not.toHaveBeenCalled()
  })

  it('should validate file size', () => {
    const onImageSelect = vi.fn()
    render(<ImageUpload onImageSelect={onImageSelect} isOpen={true} />)
    
    const fileInput = document.querySelector('#postcard-image-upload') as HTMLInputElement
    const largeFile = new File(['content'], 'large.jpg', { type: 'image/jpeg' })
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 })
    
    fireEvent.change(fileInput, { target: { files: [largeFile] } })
    
    expect(screen.getByText(/file size must be less than 10mb/i)).toBeInTheDocument()
    expect(onImageSelect).not.toHaveBeenCalled()
  })

  it('should show preview after valid file selection', async () => {
    const onImageSelect = vi.fn()
    const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 })
    
    const selectedImage = {
      file: mockFile,
      preview: 'data:image/jpeg;base64,test'
    }
    
    render(<ImageUpload onImageSelect={onImageSelect} isOpen={true} selectedImage={selectedImage} />)
    
    const img = screen.getByAltText('Postcard preview')
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,test')
    expect(screen.getByText(/test.jpg/i)).toBeInTheDocument()
  })

  it('should allow removing selected image', () => {
    const onImageSelect = vi.fn()
    const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    const selectedImage = {
      file: mockFile,
      preview: 'data:image/jpeg;base64,test'
    }
    
    render(<ImageUpload onImageSelect={onImageSelect} isOpen={true} selectedImage={selectedImage} />)
    
    const removeButton = screen.getByRole('button', { name: /remove/i })
    fireEvent.click(removeButton)
    
    expect(onImageSelect).toHaveBeenCalled()
  })

  it('should display selected image file size', () => {
    const onImageSelect = vi.fn()
    const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    Object.defineProperty(mockFile, 'size', { value: 2 * 1024 * 1024 })
    
    const selectedImage = {
      file: mockFile,
      preview: 'data:image/jpeg;base64,test'
    }
    
    render(<ImageUpload onImageSelect={onImageSelect} isOpen={true} selectedImage={selectedImage} />)
    
    expect(screen.getByText(/2\.00 mb/i)).toBeInTheDocument()
  })
})
