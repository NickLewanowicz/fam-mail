import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PostcardPreview } from './PostcardPreview'
import type { Address } from '../../types/address'

const sampleAddress: Address = {
  firstName: 'Jane',
  lastName: 'Doe',
  addressLine1: '123 Main St',
  addressLine2: 'Apt 4',
  city: 'Boston',
  provinceOrState: 'MA',
  postalOrZip: '02110',
  countryCode: 'US',
}

describe('PostcardPreview', () => {
  const onFlip = vi.fn()

  beforeEach(() => {
    onFlip.mockClear()
  })

  it('renders Preview heading', () => {
    render(
      <PostcardPreview image={null} message="" address={null} showBack={false} onFlip={onFlip} />,
    )
    expect(screen.getByText('Preview')).toBeInTheDocument()
  })

  it('shows Front label when showBack is false', () => {
    render(
      <PostcardPreview image={null} message="" address={null} showBack={false} onFlip={onFlip} />,
    )
    expect(screen.getByText('6" x 4" postcard • Front')).toBeInTheDocument()
  })

  it('shows Back label when showBack is true', () => {
    render(
      <PostcardPreview image={null} message="" address={null} showBack onFlip={onFlip} />,
    )
    expect(screen.getByText('6" x 4" postcard • Back')).toBeInTheDocument()
  })

  it('shows Upload a photo placeholder when no image', () => {
    render(
      <PostcardPreview image={null} message="" address={null} showBack={false} onFlip={onFlip} />,
    )
    expect(screen.getByText('Upload a photo')).toBeInTheDocument()
  })

  it('shows image when provided', () => {
    const src = 'data:image/jpeg;base64,abc'
    render(
      <PostcardPreview image={src} message="" address={null} showBack={false} onFlip={onFlip} />,
    )
    expect(screen.getByAltText('Postcard front')).toHaveAttribute('src', src)
  })

  it('shows Your message here... placeholder when no message', () => {
    render(
      <PostcardPreview image={null} message="" address={null} showBack={false} onFlip={onFlip} />,
    )
    expect(screen.getByText('Your message here...')).toBeInTheDocument()
  })

  it('shows formatted message when provided (basic markdown: **bold** → strong)', () => {
    const { container } = render(
      <PostcardPreview image={null} message="**bold** words" address={null} showBack={false} onFlip={onFlip} />,
    )
    const strong = container.querySelector('strong')
    expect(strong).toBeTruthy()
    expect(strong?.textContent).toMatch(/bold/i)
  })

  it('shows Recipient address... placeholder when no address', () => {
    render(
      <PostcardPreview image={null} message="Hi" address={null} showBack={false} onFlip={onFlip} />,
    )
    expect(screen.getByText('Recipient address...')).toBeInTheDocument()
  })

  it('shows address when provided', () => {
    render(
      <PostcardPreview image={null} message="Hi" address={sampleAddress} showBack={false} onFlip={onFlip} />,
    )
    expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument()
    expect(screen.getByText(/123 Main St/i)).toBeInTheDocument()
    expect(screen.getByText(/Apt 4/i)).toBeInTheDocument()
    expect(screen.getByText(/Boston, MA 02110/i)).toBeInTheDocument()
    expect(screen.getByText('US')).toBeInTheDocument()
  })

  it('shows STAMP on the back side', () => {
    render(
      <PostcardPreview image={null} message="" address={null} showBack={false} onFlip={onFlip} />,
    )
    expect(screen.getByText('STAMP')).toBeInTheDocument()
  })

  it('clicking Flip button calls onFlip', () => {
    render(
      <PostcardPreview image={null} message="" address={null} showBack={false} onFlip={onFlip} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Flip/i }))
    expect(onFlip).toHaveBeenCalledTimes(1)
  })

  it('shows 6" x 4" postcard text', () => {
    render(
      <PostcardPreview image={null} message="" address={null} showBack={false} onFlip={onFlip} />,
    )
    expect(screen.getByText('6" x 4" postcard • Front')).toBeInTheDocument()
  })
})
