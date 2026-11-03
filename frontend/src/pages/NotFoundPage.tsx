import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <>
      <div className="container mx-auto px-4 py-20 max-w-md text-center">
        <p className="text-5xl">🗺️</p>
        <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Page not found</h1>
        <p className="mt-2 text-sm text-zinc-500">
          That link doesn't go anywhere. The postcard wizard is probably what you wanted.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="px-4 h-10 inline-flex items-center rounded-md border border-zinc-300 text-sm text-zinc-700 dark:text-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            Dashboard
          </Link>
          <Link to="/create" className="px-4 h-10 inline-flex items-center rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors">
            New postcard
          </Link>
        </div>
      </div>
    </>
  )
}
