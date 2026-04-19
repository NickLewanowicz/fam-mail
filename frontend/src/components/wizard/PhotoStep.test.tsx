import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PhotoStep } from './PhotoStep'

describe('PhotoStep', () => {
  const onImageChange = vi.fn()
  const onNext = vi.fn()

  beforeEach(() => {
    onImageChange.mockClear()
    onNext.mockClear()
  })

  it('renders upload area when no image is provided', () => {
    const { container } = render(
      <PhotoStep image={null} onImageChange={onImageChange} onNext={onNext} />,
    )
    expect(container.querySelector('input[type="file"]')).toBeInTheDocument()
    expect(screen.queryByAltText('Selected')).not.toBeInTheDocument()
  })

  it('shows "Drop an image here or click to browse" text', () => {
    render(<PhotoStep image={null} onImageChange={onImageChange} onNext={onNext} />)
    expect(screen.getByText('Drop an image here or click to browse')).toBeInTheDocument()
  })

  it('Next button is disabled when no image', () => {
    render(<PhotoStep image={null} onImageChange={onImageChange} onNext={onNext} />)
    expect(screen.getByRole('button', { name: /Next: Write Message/i })).toBeDisabled()
  })

  it('when image is provided, shows the image preview', () => {
    const image = { file: new File([''], 'a.jpg', { type: 'image/jpeg' }), preview: 'data:image/jpeg;base64,abc' }
    render(<PhotoStep image={image} onImageChange={onImageChange} onNext={onNext} />)
    expect(screen.getByAltText('Selected')).toHaveAttribute('src', image.preview)
  })

  it('when image is provided, shows Change photo and Remove buttons', () => {
    const image = { file: new File([''], 'a.jpg', { type: 'image/jpeg' }), preview: 'data:image/jpeg;base64,abc' }
    render(<PhotoStep image={image} onImageChange={onImageChange} onNext={onNext} />)
    expect(screen.getByRole('button', { name: /Change photo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument()
  })

  it('Next button is enabled when image is provided', () => {
    const image = { file: new File([''], 'a.jpg', { type: 'image/jpeg' }), preview: 'data:image/jpeg;base64,abc' }
    render(<PhotoStep image={image} onImageChange={onImageChange} onNext={onNext} />)
    expect(screen.getByRole('button', { name: /Next: Write Message/i })).not.toBeDisabled()
  })

  it('clicking Remove calls onImageChange(null)', () => {
    const image = { file: new File([''], 'a.jpg', { type: 'image/jpeg' }), preview: 'data:image/jpeg;base64,abc' }
    render(<PhotoStep image={image} onImageChange={onImageChange} onNext={onNext} />)
    fireEvent.click(screen.getByRole('button', { name: /Remove/i }))
    expect(onImageChange).toHaveBeenCalledWith(null)
  })

  it('clicking Next calls onNext', () => {
    const image = { file: new File([''], 'a.jpg', { type: 'image/jpeg' }), preview: 'data:image/jpeg;base64,abc' }
    render(<PhotoStep image={image} onImageChange={onImageChange} onNext={onNext} />)
    fireEvent.click(screen.getByRole('button', { name: /Next: Write Message/i }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('shows error for invalid file types', () => {
    const { container } = render(<PhotoStep image={null} onImageChange={onImageChange} onNext={onNext} />)
    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    expect(screen.getByText('Please upload a JPEG, PNG, or WebP image')).toBeInTheDocument()
    expect(onImageChange).not.toHaveBeenCalled()
  })

  it('shows error for oversized files (>10MB)', () => {
    const { container } = render(<PhotoStep image={null} onImageChange={onImageChange} onNext={onNext} />)
    const file = new File(['x'], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    expect(screen.getByText('Image must be under 10MB')).toBeInTheDocument()
    expect(onImageChange).not.toHaveBeenCalled()
  })

  it('valid file processing: jpeg fires change and eventually calls onImageChange', async () => {
    const { container } = render(<PhotoStep image={null} onImageChange={onImageChange} onNext={onNext} />)
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => {
      expect(onImageChange).toHaveBeenCalled()
    })
    const arg = onImageChange.mock.calls[0][0]
    expect(arg).not.toBeNull()
    expect(arg?.file).toBe(file)
    expect(typeof arg?.preview).toBe('string')
    expect(arg?.preview).toMatch(/^data:image\/jpeg/)
  })
})
