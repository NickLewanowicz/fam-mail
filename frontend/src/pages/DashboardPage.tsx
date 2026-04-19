import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { listDrafts, deleteDraft } from '../utils/draftApi'
import type { Draft } from '../types/postcard'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDrafts = async () => {
    try {
      setLoading(true)
      const data = await listDrafts()
      setDrafts(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drafts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDrafts() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft?')) return
    try {
      await deleteDraft(id)
      setDrafts(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete draft')
    }
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Hero CTA */}
        <div className="card bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-xl mb-8">
          <div className="card-body items-center text-center py-12">
            <h1 className="card-title text-3xl md:text-4xl font-bold">Send a Postcard</h1>
            <p className="text-white/80 text-lg mt-2">Create a beautiful physical postcard for someone you love</p>
            <Link to="/create" className="btn btn-lg bg-white text-purple-600 hover:bg-white/90 border-none mt-4">
              Create New Postcard
            </Link>
          </div>
        </div>

        {/* Drafts Section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">My Drafts</h2>
          <button onClick={loadDrafts} className="btn btn-ghost btn-sm" disabled={loading}>
            {loading ? <span className="loading loading-spinner loading-xs"></span> : 'Refresh'}
          </button>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="btn btn-ghost btn-xs">Dismiss</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : drafts.length === 0 ? (
          <div className="card bg-base-100 shadow">
            <div className="card-body items-center text-center py-12">
              <p className="text-base-content/60 text-lg">No drafts yet</p>
              <p className="text-base-content/40">Create your first postcard to get started</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drafts.map(draft => (
              <div key={draft.id} className="card bg-base-100 shadow hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/drafts/${draft.id}`)}>
                <div className="card-body p-4">
                  {/* Thumbnail placeholder */}
                  <div className="aspect-[3/2] bg-base-200 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                    {draft.imageData ? (
                      <img src={draft.imageData} alt="Draft" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl opacity-20">&#x1F4F7;</span>
                    )}
                  </div>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate">
                        {draft.recipientAddress ? `${draft.recipientAddress.firstName} ${draft.recipientAddress.lastName}` : 'No recipient'}
                      </h3>
                      <p className="text-sm text-base-content/60 truncate">{draft.message || 'No message'}</p>
                      <p className="text-xs text-base-content/40 mt-1">{new Date(draft.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <span className={`badge badge-sm ${draft.state === 'ready' ? 'badge-success' : 'badge-ghost'}`}>
                        {draft.state}
                      </span>
                    </div>
                  </div>
                  <div className="card-actions justify-end mt-2">
                    <button className="btn btn-ghost btn-xs text-error" onClick={(e) => { e.stopPropagation(); handleDelete(draft.id) }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
