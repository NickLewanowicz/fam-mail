import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImageUpload } from './ImageUpload'

describe('ImageUpload', () => {
  it('should render collapsed by default', () => {
    render(<ImageUpload isOpen={false} />)
    expect(screen.getByText('Postcard Image')).toBeInTheDocument()
  })

  it('should render expanded when isOpen is true', () => {
    render(<ImageUpload isOpen={true} />)
    expect(screen.getByText('Image upload functionality coming soon!')).toBeInTheDocument()
  })

  it('should show file input when expanded', () => {
    render(<ImageUpload isOpen={true} />)
    const fileInput = screen.getByLabelText(/upload your postcard image/i)
    expect(fileInput).toBeInTheDocument()
    expect(fileInput).toHaveAttribute('type', 'file')
    expect(fileInput).toHaveAttribute('accept', 'image/*')
  })

  it('should call onImageSelect when file is selected', () => {
    const mockOnImageSelect = vi.fn()
    render(<ImageUpload isOpen={true} onImageSelect={mockOnImageSelect} />)
    
    const fileInput = screen.getByLabelText(/upload your postcard image/i) as HTMLInputElement
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    })
    
    fireEvent.change(fileInput)
    
    expect(mockOnImageSelect).toHaveBeenCalledWith(file)
  })

  it('should display placeholder image preview', () => {
    render(<ImageUpload isOpen={true} />)
    expect(screen.getByText('🖼️')).toBeInTheDocument()
    expect(screen.getByText('Image preview will appear here')).toBeInTheDocument()
  })

  it('should show file format requirements', () => {
    render(<ImageUpload isOpen={true} />)
    expect(screen.getByText(/Accepted formats: JPG, PNG, GIF/i)).toBeInTheDocument()
  })
})
