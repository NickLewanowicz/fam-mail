import { useEffect, useState } from 'react'

/**
 * Small footer that surfaces the running backend version — the Stirling-PDF/
 * Miniflux pattern: every screen can answer "what am I running?" which makes
 * bug reports and update checks trivial.
 */
export function VersionFooter() {
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { version?: string } | null) => {
        if (!cancelled && data?.version) setVersion(data.version)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!version) return null
  return (
    <footer className="py-6 text-center text-[11px] text-zinc-400">
      fam-mail v{version}
    </footer>
  )
}
