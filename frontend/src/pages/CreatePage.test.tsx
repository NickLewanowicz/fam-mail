import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ButtonHTMLAttributes, HTMLAttributes } from 'react'
import CreatePage from './CreatePage'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
      <div {...props}>{children}</div>
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

function renderWizard() {
  return render(
    <MemoryRouter>
      <CreatePage />
    </MemoryRouter>
  )
}

describe('CreatePage step indicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts on the Destination step without marking later steps done', () => {
    renderWizard()
    expect(screen.getByRole('button', { name: /Destination/ })).toBeInTheDocument()
    // No green check circles on photo/message/address steps
    expect(screen.queryByText('✓')).not.toBeInTheDocument()
  })

  it('does not mark Photo complete when the user jumps ahead to Message', () => {
    renderWizard()
    // Jump straight to the Message step (skipping Photo)
    fireEvent.click(screen.getByRole('button', { name: /^3 Message/ }))
    const photoStep = screen.getByRole('button', { name: /Photo/ })
    // Photo was skipped with no image: it must NOT show the ✓ state
    expect(photoStep.textContent).not.toContain('✓')
    // Destination is satisfied by the default country: it may show ✓
    expect(screen.getByRole('button', { name: /Destination/ }).textContent).toContain('✓')
  })

  it('marks Message complete only once the message is non-empty', () => {
    renderWizard()
    fireEvent.click(screen.getByRole('button', { name: /^3 Message/ }))
    // Jump to Address without writing a message: Message must not show ✓
    fireEvent.click(screen.getByRole('button', { name: /^4 Address/ }))
    expect(screen.getByRole('button', { name: /^3 Message/ }).textContent).not.toContain('✓')
  })
})
