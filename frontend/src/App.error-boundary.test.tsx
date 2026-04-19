import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import '@testing-library/jest-dom/vitest'

// Suppress console.error output in tests (ErrorBoundary logs errors)
const originalConsoleError = console.error
beforeEach(() => {
  console.error = vi.fn()
})
afterEach(() => {
  console.error = originalConsoleError
})

global.fetch = vi.fn()

const mockHealthResponse = {
  json: async () => ({ status: 'ok', message: 'Test', testMode: false }),
} as Response

// These mocks throw errors to test ErrorBoundary isolation.
// Each test re-mocks the component that should throw.
vi.mock('./components/layout/Header', () => ({
  Header: ({ testMode }: { testMode?: boolean }) => (
    <div data-testid="mock-header">Header {testMode && '(Test Mode)'}</div>
  ),
}))

vi.mock('./utils/api', () => ({
  submitPostcard: vi.fn(),
}))

vi.mock('./components/drafts/DraftList', () => ({
  DraftList: ({ onLoadDraft, onDraftsChanged, refreshTrigger }: {
    onLoadDraft: (draft: Record<string, unknown>) => void
    onDraftsChanged?: () => void
    refreshTrigger?: number
  }) => (
    <div data-testid="mock-draft-list">
      Draft List (trigger: {refreshTrigger})
      <button onClick={() => onLoadDraft({})}>Load Draft</button>
      {onDraftsChanged && <button onClick={onDraftsChanged}>Changed</button>}
    </div>
  ),
}))

vi.mock('./components/drafts/SaveDraftModal', () => ({
  SaveDraftModal: () => null,
}))

describe('App ErrorBoundary Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('shows section error when StatusCard throws, without crashing header/tabs/builder', async () => {
    vi.doMock('./components/status/StatusCard', () => ({
      StatusCard: () => {
        throw new Error('StatusCard exploded')
      },
    }))
    vi.doMock('./components/postcard/PostcardBuilder', () => ({
      PostcardBuilder: () => <div data-testid="mock-postcard-builder">Postcard Builder</div>,
    }))

    const { default: App } = await import('./App')
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

    render(<App />)

    await waitFor(() => {
      // Section-level fallback should appear
      expect(screen.getByText('Status Check Error')).toBeInTheDocument()
    })

    // Rest of the app should still be functional
    expect(screen.getByTestId('mock-header')).toBeInTheDocument()
    expect(screen.getByText('✏️ Editor')).toBeInTheDocument()
    expect(screen.getByTestId('mock-postcard-builder')).toBeInTheDocument()
  })

  it('shows section error when PostcardBuilder throws, without crashing header/tabs', async () => {
    vi.doMock('./components/status/StatusCard', () => ({
      StatusCard: () => <div data-testid="mock-status-card">Status OK</div>,
    }))
    vi.doMock('./components/postcard/PostcardBuilder', () => ({
      PostcardBuilder: () => {
        throw new Error('PostcardBuilder exploded')
      },
    }))

    const { default: App } = await import('./App')
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Postcard Builder Error')).toBeInTheDocument()
    })

    // Header and tabs should still work
    expect(screen.getByTestId('mock-header')).toBeInTheDocument()
    expect(screen.getByText('✏️ Editor')).toBeInTheDocument()
    expect(screen.getByText('📋 My Drafts')).toBeInTheDocument()
    expect(screen.getByTestId('mock-status-card')).toBeInTheDocument()
  })

  it('shows section error when DraftList throws, without crashing header/tabs', async () => {
    vi.doMock('./components/status/StatusCard', () => ({
      StatusCard: () => <div data-testid="mock-status-card">Status OK</div>,
    }))
    vi.doMock('./components/postcard/PostcardBuilder', () => ({
      PostcardBuilder: () => <div data-testid="mock-postcard-builder">Postcard Builder</div>,
    }))
    vi.doMock('./components/drafts/DraftList', () => ({
      DraftList: () => {
        throw new Error('DraftList exploded')
      },
    }))
    vi.doMock('./components/drafts/SaveDraftModal', () => ({
      SaveDraftModal: () => null,
    }))

    const { default: App } = await import('./App')
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockHealthResponse)

    const user = userEvent.setup()
    render(<App />)

    // Wait for initial render, then switch to drafts
    await waitFor(() => screen.getByText('📋 My Drafts'))
    await user.click(screen.getByText('📋 My Drafts'))

    await waitFor(() => {
      expect(screen.getByText('Drafts Error')).toBeInTheDocument()
    })

    // Header and tabs should still work — user can navigate away
    expect(screen.getByTestId('mock-header')).toBeInTheDocument()
    expect(screen.getByText('✏️ Editor')).toBeInTheDocument()
    expect(screen.getByTestId('mock-status-card')).toBeInTheDocument()
  })
})
