import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AppShell } from '../components/layout/AppShell'
import { listSentPostcards, type SentPostcard } from '../utils/api'
import { timeAgo } from '../utils/time'

const STATUS_STYLES: Record<string, string> = {
  sent: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  delivered: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [postcards, setPostcards] = useState<SentPostcard[]>([])
  const [limit, setLimit] = useState(25)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listSentPostcards(limit)
      .then((data) => { if (!cancelled) setPostcards(data) })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load history') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [limit])

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Postcard History</h1>
          <Link to="/create" className="inline-flex items-center h-11 px-2 -mx-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
            New postcard
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : postcards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center">
            <p className="text-zinc-500 dark:text-zinc-500">Nothing sent yet.</p>
            {/* padding + negative margin: 44px target without breaking the prose rhythm */}
            <Link to="/create" className="inline-block px-3 py-3 -mx-3 -my-3 text-sm text-zinc-900 dark:text-zinc-100 font-medium hover:underline">
              Send your first postcard
            </Link>
          </div>
        ) : (
          <>
          <ul className="space-y-2">
            {postcards.map((card) => (
              <li
                key={card.id}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{card.recipientName}</p>
                  <p className="text-xs text-zinc-500 truncate">{card.recipientAddress}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    <span title={new Date(card.createdAt).toLocaleString()}>
                      {timeAgo(card.createdAt)} · {card.mode} mode
                    </span>
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(`${card.recipientName}\n${card.recipientAddress}`).then(
                        () => toast.success('Address copied'),
                        () => toast.error('Could not copy'),
                      )
                    }}
                    className="inline-flex items-center justify-center h-11 min-w-11 px-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Copy address"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => navigate('/create', { state: { prefillRecipient: { firstName: card.recipientName.split(' ')[0], lastName: card.recipientName.split(' ').slice(1).join(' ') || '', addressLine1: card.recipientAddress } } })}
                    className="inline-flex items-center justify-center h-11 min-w-11 px-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Send another card to this recipient"
                  >
                    Again
                  </button>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[card.status] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                    {card.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          {postcards.length >= limit && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setLimit((l) => l + 25)}
                className="px-4 h-11 rounded-md border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Load more
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </AppShell>
  )
}
