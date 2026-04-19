import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import '@testing-library/jest-dom/vitest'
import { DraftList } from './DraftList'
import type { Draft } from '../../types/postcard'
import type { Address } from '../../types/address'

// Mock the correct import path used by DraftList.tsx
vi.mock('../../utils/draftApi', () => ({
  listDrafts: vi.fn(),
  deleteDraft: vi.fn(),
  publishDraft: vi.fn(),
}))

import { listDrafts, deleteDraft, publishDraft } from '../../utils/draftApi'

const mockAddress: Address = {
  firstName: 'Jane',
  lastName: 'Smith',
  addressLine1: '456 Oak Ave',
  city: 'Toronto',
  provinceOrState: 'ON',
  postalOrZip: 'M5H 2N2',
  countryCode: 'CA',
}

const mockDrafts: Draft[] = [
  {
    id: 'draft-1',
    userId: 'user-1',
    recipientAddress: mockAddress,
    message: 'Hello from Toronto!',
    state: 'draft',
    size: '6x4',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T12:00:00Z',
  },
  {
    id: 'draft-2',
    userId: 'user-1',
    recipientAddress: { ...mockAddress, firstName: 'Bob', lastName: 'Jones' },
    message: 'Ready to send!',
    state: 'ready',
    size: '6x4',
    createdAt: '2025-01-14T10:00:00Z',
    updatedAt: '2025-01-14T12:00:00Z',
  },
]

describe('DraftList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading spinner initially', () => {
    vi.mocked(listDrafts).mockReturnValue(new Promise(() => {})) // Never resolves
    render(<DraftList onLoadDraft={vi.fn()} />)
    expect(document.querySelector('.loading-spinner')).toBeInTheDocument()
  })

  it('should render draft cards after loading', async () => {
    // listDrafts returns Draft[] (unwrapped from DraftListResponse internally)
    vi.mocked(listDrafts).mockResolvedValueOnce(mockDrafts)

    render(<DraftList onLoadDraft={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
    expect(screen.getByText('Bob Jones')).toBeInTheDocument()
  })

  it('should show filter count in buttons', async () => {
    vi.mocked(listDrafts).mockResolvedValueOnce(mockDrafts)

    render(<DraftList onLoadDraft={vi.fn()} />)

    await waitFor(() => {
      // "All (2)" - total count
      expect(screen.getByText(/All \(2\)/)).toBeInTheDocument()
    })
    // "Drafts (1)" - draft state count
    expect(screen.getByText(/Drafts \(1\)/)).toBeInTheDocument()
    // "Ready (1)" - ready state count
    expect(screen.getByText(/Ready \(1\)/)).toBeInTheDocument()
  })

  it('should show empty state when no drafts', async () => {
    vi.mocked(listDrafts).mockResolvedValueOnce([])

    render(<DraftList onLoadDraft={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('No drafts yet')).toBeInTheDocument()
    })
  })

  it('should show contextual empty state for draft filter', async () => {
    vi.mocked(listDrafts).mockResolvedValueOnce([])

    render(<DraftList onLoadDraft={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('No drafts yet')).toBeInTheDocument()
    })
    expect(screen.getByText(/Save a postcard as a draft to see it here/)).toBeInTheDocument()
  })

  it('should show error state when fetch fails', async () => {
    vi.mocked(listDrafts).mockRejectedValueOnce(new Error('Network error'))

    render(<DraftList onLoadDraft={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('should show Retry button on error', async () => {
    vi.mocked(listDrafts).mockRejectedValueOnce(new Error('Load failed'))

    render(<DraftList onLoadDraft={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  it('should retry loading when Retry is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(listDrafts).mockRejectedValueOnce(new Error('Load failed'))
    vi.mocked(listDrafts).mockResolvedValueOnce(mockDrafts)

    render(<DraftList onLoadDraft={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Retry'))

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
    expect(listDrafts).toHaveBeenCalledTimes(2)
  })

  it('should filter drafts by clicking Draft button', async () => {
    const user = userEvent.setup()
    vi.mocked(listDrafts).mockResolvedValueOnce(mockDrafts)
    vi.mocked(listDrafts).mockResolvedValueOnce([mockDrafts[0]])

    render(<DraftList onLoadDraft={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    // Click the "Drafts" filter button
    await user.click(screen.getByText(/Drafts \(1\)/))

    await waitFor(() => {
      expect(listDrafts).toHaveBeenCalledWith('draft')
    })
  })

  it('should call onLoadDraft when Edit is clicked', async () => {
    const user = userEvent.setup()
    const onLoadDraft = vi.fn()
    vi.mocked(listDrafts).mockResolvedValueOnce([mockDrafts[0]])

    render(<DraftList onLoadDraft={onLoadDraft} />)

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    // DraftCard has an "Edit" button
    await user.click(screen.getByText('Edit'))
    expect(onLoadDraft).toHaveBeenCalledWith(mockDrafts[0])
  })

  it('should call publishDraft when Publish is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(listDrafts).mockResolvedValueOnce([mockDrafts[0]])
    vi.mocked(publishDraft).mockResolvedValueOnce({ success: true, message: 'Published' })
    vi.mocked(listDrafts).mockResolvedValueOnce([{ ...mockDrafts[0], state: 'ready' }])

    render(<DraftList onLoadDraft={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Publish'))

    await waitFor(() => {
      expect(publishDraft).toHaveBeenCalledWith('draft-1')
    })
  })

  it('should call deleteDraft when Delete is clicked and confirmed', async () => {
    const user = userEvent.setup()
    vi.mocked(listDrafts).mockResolvedValueOnce([mockDrafts[0]])
    vi.mocked(deleteDraft).mockResolvedValueOnce(undefined)

    render(<DraftList onLoadDraft={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    // Click Delete to open confirmation dialog
    await user.click(screen.getByText('Delete'))

    // Confirm deletion in the dialog
    const confirmButtons = screen.getAllByText('Delete')
    await user.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(() => {
      expect(deleteDraft).toHaveBeenCalledWith('draft-1')
    })
  })

  it('should handle publish error gracefully', async () => {
    const user = userEvent.setup()
    vi.mocked(listDrafts).mockResolvedValueOnce([mockDrafts[0]])
    vi.mocked(publishDraft).mockRejectedValueOnce(new Error('Publish failed'))

    render(<DraftList onLoadDraft={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Publish'))

    await waitFor(() => {
      expect(screen.getByText('Publish failed')).toBeInTheDocument()
    })
  })

  it('should refresh when refreshTrigger changes', async () => {
    vi.mocked(listDrafts).mockResolvedValue(mockDrafts)

    const { rerender } = render(<DraftList onLoadDraft={vi.fn()} refreshTrigger={0} />)

    await waitFor(() => {
      expect(listDrafts).toHaveBeenCalledTimes(1)
    })

    rerender(<DraftList onLoadDraft={vi.fn()} refreshTrigger={1} />)

    await waitFor(() => {
      expect(listDrafts).toHaveBeenCalledTimes(2)
    })
  })

  it('should call onDraftsChanged after delete is confirmed', async () => {
    const user = userEvent.setup()
    const onDraftsChanged = vi.fn()
    vi.mocked(listDrafts).mockResolvedValueOnce([mockDrafts[0]])
    vi.mocked(deleteDraft).mockResolvedValueOnce(undefined)

    render(<DraftList onLoadDraft={vi.fn()} onDraftsChanged={onDraftsChanged} />)

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    // Click Delete to open confirmation dialog
    await user.click(screen.getByText('Delete'))

    // Confirm deletion in the dialog
    const confirmButtons = screen.getAllByText('Delete')
    await user.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(() => {
      expect(onDraftsChanged).toHaveBeenCalled()
    })
  })
})
