import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { listSentPostcards, type SentPostcard } from '../utils/api'

const STATUS_STYLES: Record<string, string> = {
  sent: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  delivered: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function HistoryPage() {
  const [postcards, setPostcards] = useState<SentPostcard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listSentPostcards()
      .then((data) => { if (!cancelled) setPostcards(data) })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load history') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Postcard History</h1>
          <Link to="/create" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
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
            <p className="text-zinc-500 dark:text-zinc-400">Nothing sent yet.</p>
            <Link to="/create" className="text-sm text-zinc-900 dark:text-zinc-100 font-medium hover:underline">
              Send your first postcard
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {postcards.map((card) => (
              <li
                key={card.id}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{card.recipientName}</p>
                  <p className="text-xs text-zinc-500 truncate">{card.recipientAddress}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {new Date(card.createdAt).toLocaleDateString()} · {card.mode} mode
                  </p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[card.status] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                  {card.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  )
}
