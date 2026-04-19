import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReviewStep } from './ReviewStep'

const basePostcard = {
  image: { file: new File([''], 'test.jpg', { type: 'image/jpeg' }), preview: 'data:image/jpeg;base64,abc' },
  setImage: vi.fn(),
  message: 'Hello world',
  setMessage: vi.fn(),
  address: {
    firstName: 'Jane',
    lastName: 'Doe',
    addressLine1: '123 Main',
    addressLine2: '',
    city: 'Toronto',
    provinceOrState: 'ON',
    postalOrZip: 'M5V2T6',
    countryCode: 'CA',
  },
  setAddress: vi.fn(),
  isComplete: true,
  currentStep: 4,
  reset: vi.fn(),
}

describe('ReviewStep', () => {
  const onBack = vi.fn()
  const onSend = vi.fn()
  const onSaveDraft = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "Review Your Postcard" title', () => {
    render(
      <ReviewStep
        postcard={basePostcard}
        onBack={onBack}
        onSend={onSend}
        onSaveDraft={onSaveDraft}
        sending={false}
        saving={false}
      />,
    )
    expect(screen.getByRole('heading', { name: /Review Your Postcard/i })).toBeInTheDocument()
  })

  it('shows checklist items for photo, message, address', () => {
    render(
      <ReviewStep
        postcard={basePostcard}
        onBack={onBack}
        onSend={onSend}
        onSaveDraft={onSaveDraft}
        sending={false}
        saving={false}
      />,
    )
    expect(screen.getByText(/Photo uploaded/i)).toBeInTheDocument()
    expect(screen.getByText(/Message \(11 chars\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Jane Doe, Toronto, ON/i)).toBeInTheDocument()
  })

  it('shows checkmark for uploaded photo', () => {
    const { container } = render(
      <ReviewStep
        postcard={basePostcard}
        onBack={onBack}
        onSend={onSend}
        onSaveDraft={onSaveDraft}
        sending={false}
        saving={false}
      />,
    )
    expect(container.textContent).toContain('\u2713')
    expect(screen.getByText(/Photo uploaded/i)).toBeInTheDocument()
  })

  it('shows X for missing photo', () => {
    const { container } = render(
      <ReviewStep
        postcard={{ ...basePostcard, image: null, isComplete: false }}
        onBack={onBack}
        onSend={onSend}
        onSaveDraft={onSaveDraft}
        sending={false}
        saving={false}
      />,
    )
    expect(container.textContent).toContain('\u2717')
    expect(screen.getByText(/Photo missing/i)).toBeInTheDocument()
  })

  it('shows warning for empty message', () => {
    const { container } = render(
      <ReviewStep
        postcard={{ ...basePostcard, message: '', isComplete: false }}
        onBack={onBack}
        onSend={onSend}
        onSaveDraft={onSaveDraft}
        sending={false}
        saving={false}
      />,
    )
    expect(container.textContent).toContain('\u26A0')
    expect(screen.getByText(/Message \(optional, empty\)/i)).toBeInTheDocument()
  })

  it('shows checkmark for non-empty message with char count', () => {
    const { container } = render(
      <ReviewStep
        postcard={{ ...basePostcard, message: 'Hi' }}
        onBack={onBack}
        onSend={onSend}
        onSaveDraft={onSaveDraft}
        sending={false}
        saving={false}
      />,
    )
    expect(container.textContent).toContain('\u2713')
    expect(screen.getByText(/Message \(2 chars\)/i)).toBeInTheDocument()
  })

  it('Send button is disabled when postcard is incomplete', () => {
    render(
      <ReviewStep
        postcard={{ ...basePostcard, isComplete: false, image: null }}
        onBack={onBack}
        onSend={onSend}
        onSaveDraft={onSaveDraft}
        sending={false}
        saving={false}
      />,
    )
    expect(screen.getByRole('button', { name: /Send Postcard/i })).toBeDisabled()
  })

  it('Send button is enabled when postcard is complete', () => {
    render(
      <ReviewStep
        postcard={basePostcard}
        onBack={onBack}
        onSend={onSend}
        onSaveDraft={onSaveDraft}
        sending={false}
        saving={false}
      />,
    )
    expect(screen.getByRole('button', { name: /Send Postcard/i })).not.toBeDisabled()
  })

  it('Save as Draft button calls onSaveDraft', () => {
    render(
      <ReviewStep
        postcard={basePostcard}
        onBack={onBack}
        onSend={onSend}
        onSaveDraft={onSaveDraft}
        sending={false}
        saving={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Save as Draft/i }))
    expect(onSaveDraft).toHaveBeenCalledTimes(1)
  })

  it('Back button calls onBack', () => {
    render(
      <ReviewStep
        postcard={basePostcard}
        onBack={onBack}
        onSend={onSend}
        onSaveDraft={onSaveDraft}
        sending={false}
        saving={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^Back$/ }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('Send button shows Sending... when sending is true', () => {
    render(
      <ReviewStep
        postcard={basePostcard}
        onBack={onBack}
        onSend={onSend}
        onSaveDraft={onSaveDraft}
        sending
        saving={false}
      />,
    )
    expect(screen.getByText(/Sending\.\.\./i)).toBeInTheDocument()
  })

  it('Save as Draft shows Saving... when saving is true', () => {
    render(
      <ReviewStep
        postcard={basePostcard}
        onBack={onBack}
        onSend={onSend}
        onSaveDraft={onSaveDraft}
        sending={false}
        saving
      />,
    )
    expect(screen.getByText(/Saving\.\.\./i)).toBeInTheDocument()
  })
})
