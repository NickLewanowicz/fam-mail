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

  it('shows Upload a photo placeholder when no image and no activeZone', () => {
    render(
      <PostcardPreview image={null} message="" address={null} showBack={false} onFlip={onFlip} />,
    )
    expect(screen.getByText('Upload a photo')).toBeInTheDocument()
  })

  it('shows Click to upload photo when activeZone is photo', () => {
    render(
      <PostcardPreview image={null} message="" address={null} showBack={false} onFlip={onFlip} activeZone="photo" />,
    )
    expect(screen.getByText('Click to upload photo')).toBeInTheDocument()
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
      <PostcardPreview image={null} message="Hi" address={null} showBack onFlip={onFlip} />,
    )
    expect(screen.getByText('Recipient address...')).toBeInTheDocument()
  })

  it('shows address when provided', () => {
    render(
      <PostcardPreview image={null} message="Hi" address={sampleAddress} showBack onFlip={onFlip} />,
    )
    expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument()
    expect(screen.getByText(/123 Main St/i)).toBeInTheDocument()
    expect(screen.getByText(/Apt 4/i)).toBeInTheDocument()
    expect(screen.getByText(/Boston, MA 02110/i)).toBeInTheDocument()
    expect(screen.getByText('US')).toBeInTheDocument()
  })

  it('shows STAMP on the back side', () => {
    render(
      <PostcardPreview image={null} message="" address={null} showBack onFlip={onFlip} />,
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

  it('has hidden file input for photo upload', () => {
    const { container } = render(
      <PostcardPreview image={null} message="" address={null} showBack={false} onFlip={onFlip} activeZone="photo" />,
    )
    expect(container.querySelector('input[type="file"]')).toBeInTheDocument()
  })

  it('shows remove button on image when photo zone is active', () => {
    const onImageChange = vi.fn()
    render(
      <PostcardPreview
        image="data:image/jpeg;base64,abc"
        message=""
        address={null}
        showBack={false}
        onFlip={onFlip}
        activeZone="photo"
        onImageChange={onImageChange}
      />,
    )
    const removeBtn = screen.getByTitle('Remove photo')
    expect(removeBtn).toBeInTheDocument()
    fireEvent.click(removeBtn)
    expect(onImageChange).toHaveBeenCalledWith(null)
  })

  it('opens inline message editor when message zone clicked', () => {
    const onMessageChange = vi.fn()
    render(
      <PostcardPreview
        image={null}
        message=""
        address={null}
        showBack
        onFlip={onFlip}
        activeZone="message"
        onMessageChange={onMessageChange}
      />,
    )
    // Click the message area to open editor
    const msgArea = screen.getByText('Click to write your message...')
    fireEvent.click(msgArea)
    // Now the inline editor should be visible with a Done button
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('opens inline address form when address zone clicked', () => {
    const onAddressChange = vi.fn()
    render(
      <PostcardPreview
        image={null}
        message=""
        address={null}
        showBack
        onFlip={onFlip}
        activeZone="address"
        onAddressChange={onAddressChange}
      />,
    )
    // Click the address area to open editor
    const addrArea = screen.getByText('Click to add address...')
    fireEvent.click(addrArea)
    // Now inline address form should be visible
    expect(screen.getByText('Recipient')).toBeInTheDocument()
  })

  it('shows inline message editor with character count', () => {
    const onMessageChange = vi.fn()
    const { container } = render(
      <PostcardPreview
        image={null}
        message="Hello"
        address={null}
        showBack
        onFlip={onFlip}
        activeZone="message"
        onMessageChange={onMessageChange}
      />,
    )
    // Click the message zone container (role=button when active and not editing)
    const msgZone = container.querySelector('[role="button"][tabindex="0"]')
    expect(msgZone).toBeTruthy()
    fireEvent.click(msgZone!)
    expect(screen.getByText('5/500')).toBeInTheDocument()
    expect(screen.getByText('Markdown supported')).toBeInTheDocument()
  })

  it('accepts countryCode prop with default US', () => {
    render(
      <PostcardPreview
        image={null}
        message=""
        address={null}
        showBack={false}
        onFlip={onFlip}
      />
    )
    // Should render without error when countryCode is not provided (defaults to undefined)
    expect(screen.getByText('Preview')).toBeInTheDocument()
  })

  it('accepts countryCode prop for CA', () => {
    render(
      <PostcardPreview
        image={null}
        message=""
        address={null}
        showBack={false}
        onFlip={onFlip}
        countryCode="CA"
      />
    )
    expect(screen.getByText('Preview')).toBeInTheDocument()
  })

  it('accepts countryCode prop for GB', () => {
    render(
      <PostcardPreview
        image={null}
        message=""
        address={null}
        showBack={false}
        onFlip={onFlip}
        countryCode="GB"
      />
    )
    expect(screen.getByText('Preview')).toBeInTheDocument()
  })

  it('passes countryCode to inline address form when editing', () => {
    const onAddressChange = vi.fn()
    render(
      <PostcardPreview
        image={null}
        message=""
        address={null}
        showBack
        onFlip={onFlip}
        activeZone="address"
        onAddressChange={onAddressChange}
        countryCode="CA"
      />
    )
    // Click to open inline address form
    const addrArea = screen.getByText('Click to add address...')
    fireEvent.click(addrArea)
    // InlineAddressForm should be visible with country code CA
    expect(screen.getByText('Recipient')).toBeInTheDocument()
    // The form should show the country code value
    expect(screen.getByText('CA')).toBeInTheDocument()
  })

  it('renders back side with message and address for US countryCode', () => {
    render(
      <PostcardPreview
        image={null}
        message="Hello from the US!"
        address={sampleAddress}
        showBack
        onFlip={onFlip}
        countryCode="US"
      />
    )
    expect(screen.getByText(/Hello from the US!/i)).toBeInTheDocument()
    expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument()
  })

  it('renders back side with message and address for CA countryCode', () => {
    render(
      <PostcardPreview
        image={null}
        message="Hello from Canada!"
        address={sampleAddress}
        showBack
        onFlip={onFlip}
        countryCode="CA"
      />
    )
    expect(screen.getByText(/Hello from Canada!/i)).toBeInTheDocument()
    expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument()
  })

  it('renders back side with message and address for GB countryCode', () => {
    render(
      <PostcardPreview
        image={null}
        message="Hello from the UK!"
        address={sampleAddress}
        showBack
        onFlip={onFlip}
        countryCode="GB"
      />
    )
    expect(screen.getByText(/Hello from the UK!/i)).toBeInTheDocument()
    expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument()
  })
})
