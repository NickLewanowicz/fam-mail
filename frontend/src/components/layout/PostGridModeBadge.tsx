import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { fetchPostgridStatus, setPostgridMode, type PostgridApiMode } from '../../utils/postgridApi'

const LIVE_CONFIRM =
  'Switching to LIVE mode means postcards will actually be printed and mailed. Continue?'

export function PostGridModeBadge() {
  const { token } = useAuth()
  const [mode, setMode] = useState<PostgridApiMode | null>(null)
  const [mockMode, setMockMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const s = await fetchPostgridStatus()
      setMode(s.mode)
      setMockMode(s.mockMode)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load PostGrid status')
      setMode(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const toggle = async () => {
    if (!mode || mode === 'mock' || mockMode) return
    const next: 'test' | 'live' = mode === 'live' ? 'test' : 'live'
    if (next === 'live' && !window.confirm(LIVE_CONFIRM)) return
    setLoading(true)
    setError(null)
    try {
      const s = await setPostgridMode(next)
      setMode(s.mode)
      setMockMode(s.mockMode)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update mode')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return null

  if (error && mode === null) {
    return (
      <span className="badge badge-ghost badge-sm text-white/90 border border-white/30" title={error}>
        PostGrid ?
      </span>
    )
  }

  if (mode === null && loading) {
    return (
      <span className="badge badge-ghost badge-sm text-white/80 border border-white/20">
        <span className="loading loading-spinner loading-xs" />
      </span>
    )
  }

  if (mode === null) return null

  const label = mode === 'live' ? 'LIVE' : mode === 'test' ? 'TEST' : 'MOCK'
  const badgeClass =
    mode === 'live'
      ? 'badge-error text-white border-0'
      : mode === 'test'
        ? 'badge-warning text-warning-content border-0'
        : 'badge-neutral text-neutral-content border border-white/20'

  const canToggle = !mockMode && mode !== 'mock'

  if (!canToggle) {
    return (
      <span
        className={`badge badge-sm font-semibold tracking-wide ${badgeClass}`}
        title="PostGrid mock mode — no API keys; mode cannot be changed here."
      >
        {label}
      </span>
    )
  }

  return (
    <button
      type="button"
      className={`badge badge-sm font-semibold tracking-wide cursor-pointer hover:opacity-90 ${badgeClass}`}
      disabled={loading}
      title={mode === 'live' ? 'Click to switch to test mode' : 'Click to switch to live mode (confirmation required)'}
      onClick={() => void toggle()}
    >
      {loading ? <span className="loading loading-spinner loading-xs" /> : label}
    </button>
  )
}
