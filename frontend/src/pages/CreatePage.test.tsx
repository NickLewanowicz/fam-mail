import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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
