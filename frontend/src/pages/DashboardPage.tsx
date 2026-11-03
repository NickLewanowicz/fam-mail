import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { listDrafts, deleteDraft, exportDraftJson } from '../utils/draftApi'
import type { Draft } from '../types/postcard'
import { timeAgo } from '../utils/time'
import { staggerParent, staggerChild } from '../utils/motion'

// D5: the entry reveal runs once per browser session; back-nav remounts
// jump straight to the settled state (reload resets — intended).
let dashboardAnimated = false

// Draft cards nest under the section parent and stagger 75ms apart on top
// of it, so cards land at ~200/275/350ms (each 200ms → last ≈550ms ≤ 600).
const cardStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.075 } },
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Draft | null>(null)
  const [search, setSearch] = useState('')

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

  const visibleDrafts = drafts.filter((d) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const name = d.recipientAddress
      ? `${d.recipientAddress.firstName} ${d.recipientAddress.lastName}`.toLowerCase()
      : ''
    return (d.message ?? '').toLowerCase().includes(q) || name.includes(q)
  })

  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Entry reveal (D5): hero → header → cards, staggered 75ms apart,
            ~550ms total. Reduced motion: MotionConfig skips the y-shift,
            keeps the fade. Runs once per session (module flag). */}
        <motion.div
          variants={staggerParent}
          initial={dashboardAnimated ? false : 'hidden'}
          animate="show"
          onAnimationComplete={() => { dashboardAnimated = true }}
        >
        {/* Hero */}
        <motion.div
          variants={staggerChild}
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
            className="press active:scale-[0.97] inline-flex items-center gap-2 mt-5 h-11 px-4 bg-white text-zinc-900 text-sm font-medium rounded-md hover:bg-zinc-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Create a Postcard
          </Link>
        </motion.div>

        {/* Drafts */}
        <motion.div variants={staggerChild} className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">Your Drafts</h2>
          {drafts.length > 0 && (
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search drafts…"
              aria-label="Search drafts"
              className="h-11 w-44 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-base outline-none focus:border-zinc-400"
            />
          )}
          <button
            onClick={loadDrafts}
            aria-label="Refresh drafts"
            className="h-11 w-11 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
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
        </motion.div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
            <span className="sr-only">Loading…</span>
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
                <div className="skeleton motion-reduce:animate-none bg-zinc-200 dark:bg-zinc-800 aspect-[3/2] rounded-none" aria-hidden />
                <div className="p-3 space-y-2">
                  <div className="skeleton motion-reduce:animate-none bg-zinc-200 dark:bg-zinc-800 h-3 w-2/3" aria-hidden />
                  <div className="skeleton motion-reduce:animate-none bg-zinc-200 dark:bg-zinc-800 h-3 w-1/2" aria-hidden />
                </div>
              </div>
            ))}
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-200 rounded-lg">
            <p className="text-zinc-500 text-sm">No drafts yet</p>
            <p className="text-zinc-500 text-xs mt-1">Your saved postcards will appear here</p>
          </div>
        ) : (
          <motion.div
            variants={cardStagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {visibleDrafts.map(draft => (
              <motion.div
                variants={staggerChild}
                key={draft.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/drafts/${draft.id}`) } }}
                className="group bg-white rounded-lg border border-zinc-200 cursor-pointer overflow-hidden hover:border-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 transition-colors"
                onClick={() => navigate(`/drafts/${draft.id}`)}
              >
                <div className="aspect-[3/2] bg-zinc-100 overflow-hidden">
                  {draft.imageData ? (
                    <img
                      src={draft.imageData.startsWith('data:') ? draft.imageData : `data:image/jpeg;base64,${draft.imageData}`}
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
                      <p className="text-xs text-zinc-500 truncate mt-0.5">
                        {draft.message || 'No message yet'}
                      </p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      draft.state === 'ready' ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {draft.state}
                    </span>
                    {draft.scheduledFor && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" title={`Scheduled for ${new Date(draft.scheduledFor).toLocaleString()}`}>
                        📅 {new Date(draft.scheduledFor).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-zinc-100">
                    <span className="text-[11px] text-zinc-500">{timeAgo(draft.updatedAt)}</span>
                    <span className="text-xs text-zinc-500">
                      {new Date(draft.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <button
                        onClick={(e) => { e.stopPropagation(); exportDraftJson(draft) }}
                        className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
                        title="Export draft as JSON"
                      >
                        Export
                      </button>
                      <button
                      className="text-xs text-zinc-500 hover:text-red-600 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-all"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(draft) }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
        </motion.div>
      </div>
    </>
  )
}
