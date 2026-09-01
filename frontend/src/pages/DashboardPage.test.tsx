import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import DashboardPage from './DashboardPage'
import type { Draft } from '../types/postcard'
import { listDrafts, deleteDraft } from '../utils/draftApi'
import type { HTMLAttributes, ReactNode } from 'react'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, variants: _variants, whileHover: _whileHover, whileTap: _whileTap, layout: _layout, layoutId: _layoutId,
      ...props
    }: HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}))

vi.mock('../utils/draftApi', () => ({
  listDrafts: vi.fn(),
  deleteDraft: vi.fn(),
}))

vi.mock('../components/auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'u1',
      oidcSub: 'sub',
      oidcIssuer: 'iss',
      email: 'test@example.com',
      emailVerified: true,
      firstName: 'Test',
      lastName: 'User',
      createdAt: '',
      updatedAt: '',
    },
    logout: vi.fn(),
    isAuthenticated: true,
    isLoading: false,
    token: 'test-token',
    login: vi.fn(),
    handleCallbackToken: vi.fn(),
  })),
}))

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: 'draft-1',
    userId: 'user-1',
    recipientAddress: {
      firstName: 'Sam',
      lastName: 'Lee',
      addressLine1: '10 Main',
      addressLine2: '',
      city: 'NYC',
      provinceOrState: 'NY',
      postalOrZip: '10001',
      countryCode: 'US',
    },
    message: 'Hello',
    state: 'draft',
    size: '6x4',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
    ...overrides,
  }
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(listDrafts).mockReset()
    vi.mocked(deleteDraft).mockReset()
    vi.mocked(listDrafts).mockResolvedValue([])
    vi.mocked(deleteDraft).mockResolvedValue(undefined)
  })

  it('shows loading spinner initially', async () => {
    let resolveList!: (value: Draft[]) => void
    const listPromise = new Promise<Draft[]>((resolve) => {
      resolveList = resolve
    })
    vi.mocked(listDrafts).mockReturnValue(listPromise)
    const { container } = render(
      <MemoryRouter>
        <DashboardPage />
        <Toaster position="top-center" />
      </MemoryRouter>,
    )
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
    expect(screen.getByText('Send something real')).toBeInTheDocument()
    resolveList([])
    await waitFor(() => {
      expect(screen.getByText('No drafts yet')).toBeInTheDocument()
    })
  })

  it('shows hero CTA card', async () => {
    vi.mocked(listDrafts).mockResolvedValue([])
    render(
      <MemoryRouter>
        <DashboardPage />
        <Toaster position="top-center" />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Send something real')).toBeInTheDocument()
  })

  it('shows Create a Postcard button linking to /create', async () => {
    vi.mocked(listDrafts).mockResolvedValue([])
    render(
      <MemoryRouter>
        <DashboardPage />
        <Toaster position="top-center" />
      </MemoryRouter>,
    )
    const cta = await screen.findByRole('link', { name: /Create a Postcard/i })
    expect(cta).toHaveAttribute('href', '/create')
  })

  it('shows No drafts yet when drafts list is empty', async () => {
    vi.mocked(listDrafts).mockResolvedValue([])
    render(
      <MemoryRouter>
        <DashboardPage />
        <Toaster position="top-center" />
      </MemoryRouter>,
    )
    expect(await screen.findByText('No drafts yet')).toBeInTheDocument()
  })

  it('shows draft cards when drafts are loaded', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraft(), makeDraft({ id: 'draft-2', recipientAddress: { ...makeDraft().recipientAddress, firstName: 'Pat' } })])
    render(
      <MemoryRouter>
        <DashboardPage />
        <Toaster position="top-center" />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Sam Lee')).toBeInTheDocument()
    expect(screen.getByText('Pat Lee')).toBeInTheDocument()
  })

  it('draft cards show recipient name', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraft()])
    render(
      <MemoryRouter>
        <DashboardPage />
        <Toaster position="top-center" />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Sam Lee')).toBeInTheDocument()
  })

  it('draft cards show draft state badge', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraft({ state: 'ready' })])
    render(
      <MemoryRouter>
        <DashboardPage />
        <Toaster position="top-center" />
      </MemoryRouter>,
    )
    expect(await screen.findByText('ready')).toBeInTheDocument()
  })

  it('delete button opens confirm dialog, then removes draft on confirm', async () => {
    vi.mocked(listDrafts).mockResolvedValue([makeDraft()])
    render(
      <MemoryRouter>
        <DashboardPage />
        <Toaster position="top-center" />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Sam Lee')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Delete/i }))
    // dialog appears; draft is not yet removed
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(deleteDraft).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
    await waitFor(() => {
      expect(deleteDraft).toHaveBeenCalledWith('draft-1')
    })
    await waitFor(() => {
      expect(screen.queryByText('Sam Lee')).not.toBeInTheDocument()
    })
    expect(screen.getByText('No drafts yet')).toBeInTheDocument()
  })

  it('shows toast on API failure', async () => {
    vi.mocked(listDrafts).mockRejectedValue(new Error('API unavailable'))
    render(
      <MemoryRouter>
        <DashboardPage />
        <Toaster position="top-center" />
      </MemoryRouter>,
    )
    // sonner renders toasts into a portal outside the router tree
    expect(await screen.findByText('API unavailable')).toBeInTheDocument()
  })
})
