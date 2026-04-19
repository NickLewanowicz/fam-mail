import { useState, useEffect, useCallback } from 'react'
import type { Draft } from '../../types/postcard'
import { DraftCard } from './DraftCard'
import { listDrafts, deleteDraft, publishDraft } from '../../utils/draftApi'

interface DraftListProps {
  /** Called when user clicks "Edit" on a draft */
  onLoadDraft: (draft: Draft) => void
  /** Called when drafts list changes (create/delete) */
  onDraftsChanged?: () => void
  /** External refresh trigger - increment to trigger a refresh */
  refreshTrigger?: number
}

type FilterState = 'all' | 'draft' | 'ready'

export function DraftList({ onLoadDraft, onDraftsChanged, refreshTrigger }: DraftListProps) {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterState>('all')
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadDrafts = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const stateFilter = filter === 'all' ? undefined : filter
      const data = await listDrafts(stateFilter)
      setDrafts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drafts')
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadDrafts()
  }, [loadDrafts, refreshTrigger])

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      await deleteDraft(id)
      setDrafts(prev => prev.filter(d => d.id !== id))
      onDraftsChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete draft')
    } finally {
      setDeletingId(null)
    }
  }

  const handlePublish = async (id: string) => {
    try {
      setPublishingId(id)
      await publishDraft(id)
      // Refresh the list to update state
      await loadDrafts()
      onDraftsChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish draft')
    } finally {
      setPublishingId(null)
    }
  }

  const draftCount = drafts.filter(d => d.state === 'draft').length
  const readyCount = drafts.filter(d => d.state === 'ready').length

  return (
    <div className="space-y-4">
      {/* Header with filter tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold">My Drafts</h2>
        <div className="flex gap-1">
          <button
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('all')}
          >
            All ({drafts.length})
          </button>
          <button
            className={`btn btn-sm ${filter === 'draft' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('draft')}
          >
            Drafts ({draftCount})
          </button>
          <button
            className={`btn btn-sm ${filter === 'ready' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('ready')}
          >
            Ready ({readyCount})
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button className="btn btn-sm btn-ghost" onClick={loadDrafts}>Retry</button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && drafts.length === 0 && (
        <div className="text-center py-12">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-lg opacity-50 mb-1">No drafts yet</p>
          <p className="text-sm opacity-40">
            {filter === 'all'
              ? 'Save a postcard as a draft to see it here.'
              : `No ${filter === 'draft' ? 'draft' : 'ready'} postcards.`}
          </p>
        </div>
      )}

      {/* Draft cards grid */}
      {!isLoading && drafts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drafts.map(draft => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onLoad={onLoadDraft}
              onDelete={handleDelete}
              onPublish={handlePublish}
              isPublishing={publishingId === draft.id}
              isDeleting={deletingId === draft.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
