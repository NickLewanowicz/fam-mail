import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ButtonHTMLAttributes, HTMLAttributes } from 'react'
import CreatePage from './CreatePage'

vi.mock('framer-motion', () => ({
  useReducedMotion: () => false,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, variants: _variants, custom: _custom, ...props }: HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, layoutId: _layoutId, ...props }: HTMLAttributes<HTMLSpanElement> & Record<string, unknown>) => (
      <span {...props}>{children}</span>
    ),
    button: ({ children, whileHover: _whileHover, whileTap: _whileTap, initial: _initial, animate: _animate, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}))

vi.mock('../utils/draftApi', () => ({
  getDraft: vi.fn(),
  createDraft: vi.fn(),
  updateDraft: vi.fn(),
  listDrafts: vi.fn().mockResolvedValue([]),
}))

vi.mock('../components/auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'u1', email: 't@example.com', oidcSub: 's', oidcIssuer: 'i', emailVerified: true, createdAt: '', updatedAt: '' },
  })),
}))

vi.mock('../utils/api', () => ({
  submitPostcard: vi.fn(),
}))

vi.mock('../components/wizard/ReviewStep', () => ({
  ReviewStep: () => <div data-testid="review-step">Review</div>,
}))

function renderWizard(initialEntry?: Partial<Location>) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/create', ...initialEntry }]}>
      <CreatePage />
    </MemoryRouter>
  )
}

describe('CreatePage step indicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts on the Destination step with no country pre-selected and nothing done', () => {
    renderWizard()
    expect(screen.getByRole('heading', { name: 'Where is this going?' })).toBeVisible()
    // No step shows ✓ on first paint — not even Destination (no choice made)
    expect(screen.queryByText('✓')).not.toBeInTheDocument()
  })

  it('marks Destination done and advances after picking a country', () => {
    renderWizard()
    fireEvent.click(screen.getByRole('button', { name: /United States/ }))
    // Auto-advanced to Photo; Destination is now ✓
    expect(screen.getByText('Upload your photo')).toBeVisible()
    expect(screen.getByRole('button', { name: /Destination/ }).textContent).toContain('✓')
  })

  it('blocks jumping ahead to Message until the Photo step is done', () => {
    renderWizard()
    fireEvent.click(screen.getByRole('button', { name: /United States/ }))
    expect(screen.getByText('Upload your photo')).toBeVisible()
    // Photo has no image yet: jumping to Message must be a no-op
    fireEvent.click(screen.getByRole('button', { name: /^3 Message/ }))
    expect(screen.getByText('Upload your photo')).toBeVisible()
    expect(screen.getByRole('button', { name: /^2 Photo/ }).textContent).not.toContain('✓')
  })

  it('always allows jumping backwards', () => {
    renderWizard()
    fireEvent.click(screen.getByRole('button', { name: /United States/ }))
    expect(screen.getByText('Upload your photo')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /Destination/ }))
    expect(screen.getByRole('heading', { name: 'Where is this going?' })).toBeVisible()
  })
})

describe('#110 checkpoint P3 — Again prefill sets the wizard country', () => {
  it('lands on Address with the CA country wired through (no US default)', async () => {
    renderWizard({
      state: {
        prefillRecipient: {
          firstName: 'Jean', lastName: 'Tremblay', addressLine1: '456 Rue Principale',
          city: 'Ottawa', provinceOrState: 'ON', postalOrZip: 'K1A 0B1', countryCode: 'CA',
        },
      },
    })

    // Jumps straight to the Address step
    await waitFor(() => {
      expect(screen.getByText('Recipient Address')).toBeVisible()
    })
    // Country readout comes from postcard.countryCode, not the US fallback:
    // the recipient-country <select> must be replaced by the static readout
    expect(screen.getByText('Canada')).toBeVisible()
    expect(screen.queryByRole('combobox')).toBeNull()
  })
})

describe('#M5 — sticky action bar lifts AddressStep validation', () => {
  const baseAddress = {
    firstName: 'Jean', lastName: 'Tremblay', addressLine1: '456 Rue Principale',
    city: 'Ottawa', provinceOrState: 'ON', postalOrZip: 'K1A 0B1', countryCode: 'CA',
  }

  function renderOnAddress(address: Partial<typeof baseAddress>) {
    return renderWizard({
      state: { prefillRecipient: { ...baseAddress, ...address } as typeof baseAddress },
    })
  }

  it('blocks on a bad ZIP and advances only through the step\'s own validation', async () => {
    renderOnAddress({ postalOrZip: 'NOT-A-ZIP', provinceOrState: 'ON' })

    await waitFor(() => {
      expect(screen.getByText('Recipient Address')).toBeVisible()
    })

    // The lifted action runs AddressStep's handleSubmit, not a blind onNext
    fireEvent.click(screen.getByTestId('wizard-primary'))

    // Still on Address — validation rejected, error surfaced in place
    expect(screen.queryByText('Recipient Address')).toBeVisible()
    expect(screen.getByText('Postal code must look like A1A 1A1')).toBeVisible()
    expect(screen.queryByTestId('review-step')).not.toBeInTheDocument()

    // Fix the ZIP through the same form, then the lifted action advances
    fireEvent.change(screen.getByDisplayValue('NOT-A-ZIP'), { target: { value: 'K1A 0B1' } })
    fireEvent.click(screen.getByTestId('wizard-primary'))

    await waitFor(() => {
      expect(screen.getByTestId('review-step')).toBeVisible()
    })
  })
})

describe('#116 — draft load restores the destination country', () => {
  it('seeds a CA draft and restores countryCode onto the wizard', async () => {
    // useParams needs a real route match — render through the drafts route
    const renderWithDraftRoute = () =>
      render(
        <MemoryRouter initialEntries={[{ pathname: '/drafts/draft-ca' }]}>
          <Routes>
            <Route path="/drafts/:id" element={<CreatePage />} />
          </Routes>
        </MemoryRouter>
      )
    const { getDraft } = await import('../utils/draftApi')
    ;(getDraft as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'draft-ca',
      userId: 'user-e2e-test',
      recipientAddress: {
        firstName: 'Jean', lastName: 'Tremblay', addressLine1: '456 Rue Principale',
        addressLine2: '', city: 'Ottawa', provinceOrState: 'ON',
        postalOrZip: 'K1A 0B1', countryCode: 'CA',
      },
      senderAddress: {
        firstName: 'Jean', lastName: 'Tremblay', addressLine1: '456 Rue Principale',
        addressLine2: '', city: 'Ottawa', provinceOrState: 'ON',
        postalOrZip: 'K1A 0B1', countryCode: 'CA',
      },
      message: 'Bonjour from a saved draft',
      state: 'ready',
      size: '6x4',
      createdAt: '2026-11-02T00:00:00Z',
      updatedAt: '2026-11-02T00:00:00Z',
    })

    renderWithDraftRoute()

    // After the draft loads, the Canada card must show as the selected
    // destination (postcard.countryCode === 'CA'), not the US default
    await waitFor(() => {
      const canada = screen.getByRole('button', { name: /Canada/ })
      expect(canada.className).toContain('border-zinc-900')
    })
  })
})

describe('D1 — soft-print dimension warning (warn, never reject)', () => {
  it('warns on the Photo step when the uploaded photo is under the print minimum, and clears when a crisp photo replaces it', async () => {
    // jsdom never decodes image bytes; stub Image to report controlled dims.
    let decoded = { width: 1500, height: 1000 }
    class FakeImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      naturalWidth = 0
      naturalHeight = 0
      set src(_v: string) {
        this.naturalWidth = decoded.width
        this.naturalHeight = decoded.height
        queueMicrotask(() => this.onload?.())
      }
    }
    vi.stubGlobal('Image', FakeImage)
    try {
      renderWizard()
      fireEvent.click(screen.getByRole('button', { name: /United States/ }))

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      fireEvent.change(input, { target: { files: [new File(['small'], 'small.jpg', { type: 'image/jpeg' })] } })

      // Amber, non-blocking status banner on the Photo step (index 1)
      const banner = await screen.findByText(/may print soft at 6×4"/)
      expect(banner.textContent).toContain('about 1875×1275 px looks crisper')

      // Replacing the photo with a high-res one clears the warning
      decoded = { width: 3000, height: 2000 }
      fireEvent.change(input, { target: { files: [new File(['big'], 'big.jpg', { type: 'image/jpeg' })] } })
      await waitFor(() => {
        expect(screen.queryByText(/may print soft/)).not.toBeInTheDocument()
      })
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

