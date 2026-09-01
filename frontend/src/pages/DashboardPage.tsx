import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { AppShell } from '../components/layout/AppShell'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { listDrafts, deleteDraft } from '../utils/draftApi'
import type { Draft } from '../types/postcard'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Draft | null>(null)

  const loadDrafts = async () => {
    try {
      setLoading(true)
      const data = await listDrafts()
      setDrafts(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load drafts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDrafts() }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteDraft(deleteTarget.id)
      setDrafts(prev => prev.filter(d => d.id !== deleteTarget.id))
      toast.success('Draft deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete draft')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-zinc-900 rounded-lg p-8 md:p-10 mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
            Send something real
          </h1>
          <p className="text-zinc-400 text-base mt-2 max-w-md">
            Create a physical postcard — printed and mailed to the US, Canada, or UK.
          </p>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 mt-5 px-4 py-2 bg-white text-zinc-900 text-sm font-medium rounded-md hover:bg-zinc-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Create a Postcard
          </Link>
        </motion.div>

        {/* Drafts */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900">Your Drafts</h2>
          <button
            onClick={loadDrafts}
            className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.379 2.671l-1.06 1.06A7 7 0 0016.812 11.5a.75.75 0 00-1.5-.076zm-10.624-2.85a5.5 5.5 0 019.38-2.67l1.06-1.06A7 7 0 003.187 8.5a.75.75 0 001.5.075z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
          title="Delete this draft?"
          description={deleteTarget ? `"${deleteTarget.message?.slice(0, 60) || 'Untitled draft'}" will be permanently removed.` : undefined}
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
        />

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-200 rounded-lg">
            <p className="text-zinc-400 text-sm">No drafts yet</p>
            <p className="text-zinc-300 text-xs mt-1">Your saved postcards will appear here</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {drafts.map(draft => (
              <div
                key={draft.id}
                className="group bg-white rounded-lg border border-zinc-200 cursor-pointer overflow-hidden hover:border-zinc-300 transition-colors"
                onClick={() => navigate(`/drafts/${draft.id}`)}
              >
                <div className="aspect-[3/2] bg-zinc-100 overflow-hidden">
                  {draft.imageData ? (
                    <img
                      src={draft.imageData}
                      alt="Draft"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-zinc-300 text-sm">No photo</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm text-zinc-900 truncate">
                        {draft.recipientAddress
                          ? `${draft.recipientAddress.firstName} ${draft.recipientAddress.lastName}`
                          : 'No recipient'}
                      </h3>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {draft.message || 'No message yet'}
                      </p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      draft.state === 'ready' ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {draft.state}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-zinc-100">
                    <span className="text-xs text-zinc-400">
                      {new Date(draft.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <button
                      className="text-xs text-zinc-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(draft) }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </AppShell>
  )
}
