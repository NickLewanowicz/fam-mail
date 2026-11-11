import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <>
      <div className="container mx-auto px-4 py-20 max-w-md text-center">
        <p className="text-5xl">🗺️</p>
        <h1 className="mt-4 text-xl font-semibold text-warm-text">Page not found</h1>
        <p className="mt-2 text-sm text-warm-text2">
          That link doesn't go anywhere. The postcard wizard is probably what you wanted.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="px-4 h-10 inline-flex items-center rounded-md border border-ink-line text-sm text-warm-text2 hover:bg-white/5 transition-colors">
            Dashboard
          </Link>
          <Link to="/create" className="px-4 h-10 inline-flex items-center rounded-md bg-clay text-ink-bg text-sm font-medium hover:bg-clay-hover transition-colors">
            New postcard
          </Link>
        </div>
      </div>
    </>
  )
}
