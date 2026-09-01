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
