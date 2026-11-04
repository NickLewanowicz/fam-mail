import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, whileHover: _whileHover, whileTap: _whileTap, initial: _initial, animate: _animate, transition: _transition, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>) => (
      <button {...props}>{children}</button>
    ),
  },
}))

vi.mock('../../utils/postgridApi', () => ({
  fetchPostgridStatus: vi.fn(),
}))

import { ReviewStep } from './ReviewStep'
import { fetchPostgridStatus } from '../../utils/postgridApi'
import type { ButtonHTMLAttributes } from 'react'

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
  returnAddress: {
    firstName: 'John',
    lastName: 'Smith',
    addressLine1: '456 Oak',
    addressLine2: '',
    city: 'Ottawa',
    provinceOrState: 'ON',
    postalOrZip: 'K1A0B1',
    countryCode: 'CA',
  },
  setAddress: vi.fn(),
  size: '6x4' as const,
  setSize: vi.fn(),
  setReturnAddress: vi.fn(),
  isComplete: true,
  reset: vi.fn(),
}

describe('ReviewStep', () => {
  const onBack = vi.fn()
  const onSend = vi.fn()
  const onSaveDraft = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchPostgridStatus).mockResolvedValue({ mode: 'test', mockMode: false })
  })

  it('renders "Review & Send" title', async () => {
    await act(async () => {
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
    })
    expect(screen.getByRole('heading', { name: /Review & Send/i })).toBeInTheDocument()
  })

  it('shows checklist items for photo, message, address', async () => {
    await act(async () => {
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
    })
    expect(screen.getByText(/Photo uploaded/i)).toBeInTheDocument()
    expect(screen.getByText(/Message \(11 chars\)/i)).toBeInTheDocument()
    expect(screen.getByText(/To: Jane Doe, Toronto/i)).toBeInTheDocument()
  })

  it('shows checkmark for uploaded photo', async () => {
    let container: HTMLElement
    await act(async () => {
      const result = render(
        <ReviewStep
          postcard={basePostcard}
          onBack={onBack}
          onSend={onSend}
          onSaveDraft={onSaveDraft}
          sending={false}
          saving={false}
        />,
      )
      container = result.container
    })
    expect(container!.textContent).toContain('\u2713')
    expect(screen.getByText(/Photo uploaded/i)).toBeInTheDocument()
  })

  it('shows X for missing photo', async () => {
    let container: HTMLElement
    await act(async () => {
      const result = render(
        <ReviewStep
          postcard={{ ...basePostcard, image: null, isComplete: false }}
          onBack={onBack}
          onSend={onSend}
          onSaveDraft={onSaveDraft}
          sending={false}
          saving={false}
        />,
      )
      container = result.container
    })
    expect(container!.textContent).toContain('×')
    expect(screen.getByText(/Photo missing/i)).toBeInTheDocument()
  })

  it('shows warning for empty message', async () => {
    let container: HTMLElement
    await act(async () => {
      const result = render(
        <ReviewStep
          postcard={{ ...basePostcard, message: '', isComplete: false }}
          onBack={onBack}
          onSend={onSend}
          onSaveDraft={onSaveDraft}
          sending={false}
          saving={false}
        />,
      )
      container = result.container
    })
    expect(container!.textContent).toContain('!')
    expect(screen.getByText(/Message missing — required to send/i)).toBeInTheDocument()
  })

  it('shows checkmark for non-empty message with char count', async () => {
    let container: HTMLElement
    await act(async () => {
      const result = render(
        <ReviewStep
          postcard={{ ...basePostcard, message: 'Hi' }}
          onBack={onBack}
          onSend={onSend}
          onSaveDraft={onSaveDraft}
          sending={false}
          saving={false}
        />,
      )
      container = result.container
    })
    expect(container!.textContent).toContain('\u2713')
    expect(screen.getByText(/Message \(2 chars\)/i)).toBeInTheDocument()
  })

  it('Send button is disabled when postcard is incomplete', async () => {
    await act(async () => {
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
    })
    expect(screen.getByRole('button', { name: /Send Postcard/i })).toBeDisabled()
  })

  it('Send button is enabled when postcard is complete', async () => {
    await act(async () => {
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
    })
    expect(screen.getByRole('button', { name: /Send Postcard/i })).not.toBeDisabled()
  })

  it('Save Draft button calls onSaveDraft', async () => {
    await act(async () => {
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
    })
    fireEvent.click(screen.getByRole('button', { name: /Save Draft/i }))
    expect(onSaveDraft).toHaveBeenCalledTimes(1)
  })

  it('Back button calls onBack', async () => {
    await act(async () => {
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
    })
    fireEvent.click(screen.getByRole('button', { name: /^Back$/ }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('Send button shows Sending... when sending is true', async () => {
    await act(async () => {
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
    })
    expect(screen.getByText(/Sending\.\.\./i)).toBeInTheDocument()
  })

  it('Save Draft shows Saving... when saving is true', async () => {
    await act(async () => {
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
    })
    expect(screen.getByText(/Saving\.\.\./i)).toBeInTheDocument()
  })

  // ISSUE-0117 (Decision 2): the three top banners are gone; mode arrives
  // as a prop and renders as the truth line above Send
  it('shows the test-mode truth line and drops the old top banner', () => {
    render(
      <ReviewStep
        postcard={basePostcard}
        onBack={onBack}
        onSend={onSend}
        onSaveDraft={onSaveDraft}
        sending={false}
        saving={false}
        mode="test"
      />,
    )
    const truth = screen.getByText('Practice send — nothing will be mailed.')
    expect(truth.id).toBe('send-truth-panel')
    expect(truth.getAttribute('role')).toBe('status')
    expect(screen.queryByText(/Test mode — no physical mail will be sent/i)).not.toBeInTheDocument()
  })

  it('shows the live truth line with recipient and estimate', () => {
    render(
      <ReviewStep
        postcard={basePostcard}
        onBack={onBack}
        onSend={onSend}
        onSaveDraft={onSaveDraft}
        sending={false}
        saving={false}
        mode="live"
        pricing={{ '6x4': 1.11, '9x6': 1.86, '11x6': 2.24 }}
      />,
    )
    expect(screen.getByText('This mails a real card to Jane for about $1.11.')).toBeInTheDocument()
  })

  it('live truth line omits the price clause when the server has no price for the size', () => {
    render(
      <ReviewStep
        postcard={basePostcard}
        onBack={onBack}
        onSend={onSend}
        onSaveDraft={onSaveDraft}
        sending={false}
        saving={false}
        mode="live"
        pricing={{ '6x4': null, '9x6': null, '11x6': null }}
      />,
    )
    expect(screen.getByText('This mails a real card to Jane.')).toBeInTheDocument()
    expect(screen.queryByText(/about \$/)).not.toBeInTheDocument()
  })

  it('shows the mock-mode truth line', () => {
    render(
      <ReviewStep
        postcard={basePostcard}
        onBack={onBack}
        onSend={onSend}
        onSaveDraft={onSaveDraft}
        sending={false}
        saving={false}
        mode="mock"
      />,
    )
    expect(screen.getByText('Practice send — nothing will be mailed.')).toBeInTheDocument()
  })

  it('fails closed when mode is unavailable', () => {
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
    expect(screen.getByText('Mode unavailable — check your connection before sending.')).toBeInTheDocument()
  })

  it('size buttons carry their price estimate and the qualifier ships beside the hint', () => {
    render(
      <ReviewStep
        postcard={basePostcard}
        onBack={onBack}
        onSend={onSend}
        onSaveDraft={onSaveDraft}
        sending={false}
        saving={false}
        mode="test"
        pricing={{ '6x4': 1.11, '9x6': 1.86, '11x6': 2.24 }}
      />,
    )
    expect(screen.getByText('about $1.11')).toBeInTheDocument()
    expect(screen.getByText('about $1.86')).toBeInTheDocument()
    expect(screen.getByText('about $2.24')).toBeInTheDocument()
    expect(screen.getByText(/Estimates only — the final cost is set when the card is sent/)).toBeInTheDocument()
  })

  it('size buttons show no estimate line when the server has no price for a size', () => {
    render(
      <ReviewStep
        postcard={basePostcard}
        onBack={onBack}
        onSend={onSend}
        onSaveDraft={onSaveDraft}
        sending={false}
        saving={false}
        mode="test"
        pricing={{ '6x4': 1.11, '9x6': null, '11x6': null }}
      />,
    )
    expect(screen.getByText('about $1.11')).toBeInTheDocument()
    expect(screen.queryByText('about $1.86')).not.toBeInTheDocument()
    expect(screen.queryByText('about $2.24')).not.toBeInTheDocument()
  })
})

