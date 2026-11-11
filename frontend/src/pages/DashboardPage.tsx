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
          className="bg-ink-surface rounded-lg p-8 md:p-10 mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-semibold text-warm-text tracking-tight">
            Send something real
          </h1>
          <p className="text-warm-text2 text-base mt-2 max-w-md">
            Create a physical postcard — printed and mailed to the US, Canada, or UK.
          </p>
          <Link
            to="/create"
            className="press active:scale-[0.97] inline-flex items-center gap-2 mt-5 h-11 px-4 bg-clay text-ink-bg text-sm font-medium rounded-md hover:bg-clay-hover"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Create a Postcard
          </Link>
        </motion.div>

        {/* Drafts */}
        <motion.div variants={staggerChild} className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-lg font-semibold text-warm-text">Your Drafts</h2>
          {drafts.length > 0 && (
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search drafts…"
              aria-label="Search drafts"
              className="h-11 w-44 rounded-md border border-ink-line bg-ink-raised px-2 text-base outline-none focus:border-warm-ring placeholder:text-warm-text2"
            />
          )}
          <button
            onClick={loadDrafts}
            aria-label="Refresh drafts"
            className="press h-11 w-11 flex items-center justify-center rounded-md text-warm-text2 hover:text-warm-text hover:bg-white/5 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-ink-line border-t-clay rounded-full animate-spin" />
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
              <div key={i} className="bg-ink-surface rounded-lg border border-ink-line overflow-hidden">
                <div className="skeleton motion-reduce:animate-none bg-ink-raised aspect-[3/2] rounded-none" aria-hidden />
                <div className="p-3 space-y-2">
                  <div className="skeleton motion-reduce:animate-none bg-ink-raised h-3 w-2/3" aria-hidden />
                  <div className="skeleton motion-reduce:animate-none bg-ink-raised h-3 w-1/2" aria-hidden />
                </div>
              </div>
            ))}
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-ink-line rounded-lg">
            <p className="text-warm-text2 text-sm">No drafts yet</p>
            <p className="text-warm-text2 text-xs mt-1">Your saved postcards will appear here</p>
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
                className="group bg-ink-surface rounded-lg border border-ink-line cursor-pointer overflow-hidden hover:border-clay/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-ring transition-colors"
                onClick={() => navigate(`/drafts/${draft.id}`)}
              >
                <div className="aspect-[3/2] bg-ink-bg overflow-hidden">
                  {draft.imageData ? (
                    <img
                      src={draft.imageData.startsWith('data:') ? draft.imageData : `data:image/jpeg;base64,${draft.imageData}`}
                      alt="Draft"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-warm-text3 text-sm">No photo</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm text-warm-text truncate">
                        {draft.recipientAddress
                          ? `${draft.recipientAddress.firstName} ${draft.recipientAddress.lastName}`
                          : 'No recipient'}
                      </h3>
                      <p className="text-xs text-warm-text2 truncate mt-0.5">
                        {draft.message || 'No message yet'}
                      </p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      draft.state === 'ready' ? 'bg-green-900/40 text-green-300' : 'bg-ink-raised text-warm-text2'
                    }`}>
                      {draft.state}
                    </span>
                    {draft.scheduledFor && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300" title={`Scheduled for ${new Date(draft.scheduledFor).toLocaleString()}`}>
                        📅 {new Date(draft.scheduledFor).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-ink-line/50">
                    <span className="text-[11px] text-warm-text2">{timeAgo(draft.updatedAt)}</span>
                    <span className="text-xs text-warm-text2">
                      {new Date(draft.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <button
                        onClick={(e) => { e.stopPropagation(); exportDraftJson(draft) }}
                        className="press inline-flex items-center justify-center h-11 min-w-11 px-2 -my-3 text-xs text-warm-text2 hover:text-warm-text"
                        title="Export draft as JSON"
                      >
                        Export
                      </button>
                      <button
                      className="press inline-flex items-center justify-center h-11 min-w-11 px-2 -my-3 text-xs text-warm-text2 hover:text-red-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
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
