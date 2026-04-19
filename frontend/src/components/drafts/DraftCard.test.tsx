import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import '@testing-library/jest-dom/vitest'
import { DraftCard } from './DraftCard'
import type { Draft } from '../../types/postcard'
import type { Address } from '../../types/address'

const mockAddress: Address = {
  firstName: 'Jane',
  lastName: 'Smith',
  addressLine1: '456 Oak Ave',
  city: 'Toronto',
  provinceOrState: 'ON',
  postalOrZip: 'M5H 2N2',
  countryCode: 'CA',
}

const baseDraft: Draft = {
  id: 'draft-1',
  userId: 'user-1',
  recipientAddress: mockAddress,
  message: 'Hello from Toronto!',
  state: 'draft',
  size: '4x6',
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T12:00:00Z',
}

describe('DraftCard', () => {
  it('should render recipient name', () => {
    render(
      <DraftCard
        draft={baseDraft}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onPublish={vi.fn()}
      />
    )
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('should render recipient city and state', () => {
    render(
      <DraftCard
        draft={baseDraft}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onPublish={vi.fn()}
      />
    )
    expect(screen.getByText('Toronto, ON')).toBeInTheDocument()
  })

  it('should render draft message truncated', () => {
    render(
      <DraftCard
        draft={baseDraft}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onPublish={vi.fn()}
      />
    )
    expect(screen.getByText('Hello from Toronto!')).toBeInTheDocument()
  })

  it('should show draft badge for draft state', () => {
    render(
      <DraftCard
        draft={baseDraft}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onPublish={vi.fn()}
      />
    )
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('should show ready badge for ready state', () => {
    const readyDraft = { ...baseDraft, state: 'ready' as const }
    render(
      <DraftCard
        draft={readyDraft}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onPublish={vi.fn()}
      />
    )
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('should show Edit button for draft state', () => {
    render(
      <DraftCard
        draft={baseDraft}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onPublish={vi.fn()}
      />
    )
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })

  it('should show Publish button for draft state', () => {
    render(
      <DraftCard
        draft={baseDraft}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onPublish={vi.fn()}
      />
    )
    expect(screen.getByText('Publish')).toBeInTheDocument()
  })

  it('should show Edit button for ready state', () => {
    const readyDraft = { ...baseDraft, state: 'ready' as const }
    render(
      <DraftCard
        draft={readyDraft}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onPublish={vi.fn()}
      />
    )
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })

  it('should not show Publish button for ready state', () => {
    const readyDraft = { ...baseDraft, state: 'ready' as const }
    render(
      <DraftCard
        draft={readyDraft}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onPublish={vi.fn()}
      />
    )
    expect(screen.queryByText('Publish')).not.toBeInTheDocument()
  })

  it('should always show Delete button', () => {
    render(
      <DraftCard
        draft={baseDraft}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onPublish={vi.fn()}
      />
    )
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('should call onLoad when Edit is clicked', async () => {
    const user = userEvent.setup()
    const onLoad = vi.fn()

    render(
      <DraftCard
        draft={baseDraft}
        onLoad={onLoad}
        onDelete={vi.fn()}
        onPublish={vi.fn()}
      />
    )

    await user.click(screen.getByText('Edit'))
    expect(onLoad).toHaveBeenCalledWith(baseDraft)
  })

  it('should call onDelete when Delete is clicked', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()

    render(
      <DraftCard
        draft={baseDraft}
        onLoad={vi.fn()}
        onDelete={onDelete}
        onPublish={vi.fn()}
      />
    )

    await user.click(screen.getByText('Delete'))
    expect(onDelete).toHaveBeenCalledWith('draft-1')
  })

  it('should call onPublish when Publish is clicked', async () => {
    const user = userEvent.setup()
    const onPublish = vi.fn()

    render(
      <DraftCard
        draft={baseDraft}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onPublish={onPublish}
      />
    )

    await user.click(screen.getByText('Publish'))
    expect(onPublish).toHaveBeenCalledWith('draft-1')
  })

  it('should show loading spinner when publishing', () => {
    render(
      <DraftCard
        draft={baseDraft}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onPublish={vi.fn()}
        isPublishing={true}
      />
    )
    expect(screen.getByRole('button', { name: /publish/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /publish/i }).querySelector('.loading-spinner')).toBeInTheDocument()
  })

  it('should not show image thumbnail when imageData is present', () => {
    const draftWithImage = {
      ...baseDraft,
      imageData: 'data:image/jpeg;base64,test',
    }
    render(
      <DraftCard
        draft={draftWithImage}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onPublish={vi.fn()}
      />
    )
    // Component does not render image thumbnails
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('should truncate long messages with CSS line-clamp', () => {
    const longMessage = 'A'.repeat(150)
    const draftWithLongMessage = { ...baseDraft, message: longMessage }
    render(
      <DraftCard
        draft={draftWithLongMessage}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onPublish={vi.fn()}
      />
    )
    // The full message is in the DOM but truncated via CSS line-clamp-2
    expect(screen.getByText(longMessage)).toBeInTheDocument()
  })

  it('should show created and updated dates', () => {
    render(
      <DraftCard
        draft={baseDraft}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onPublish={vi.fn()}
      />
    )
    // Created date is always shown
    expect(screen.getByText(/Created:/)).toBeInTheDocument()
    // Updated date is shown only when different from created date (after locale formatting)
    // In this case, both timestamps format to the same date, so Updated is not shown
    expect(screen.queryByText(/Updated:/)).not.toBeInTheDocument()
  })

  it('should show draft size', () => {
    render(
      <DraftCard
        draft={baseDraft}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onPublish={vi.fn()}
      />
    )
    expect(screen.getByText('4x6')).toBeInTheDocument()
  })

  it('should not have aria-labels on buttons', () => {
    render(
      <DraftCard
        draft={baseDraft}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onPublish={vi.fn()}
      />
    )
    // Buttons do not have aria-labels, only visible text
    expect(screen.queryByLabelText('Load draft for Jane Smith')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Delete draft for Jane Smith')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Publish draft for Jane Smith')).not.toBeInTheDocument()
    // Buttons are identifiable by their visible text
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('Publish')).toBeInTheDocument()
  })
})
