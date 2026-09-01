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
  if (mode === null && loading) return null
  if (mode === null && error) return null
  if (mode === null) return null

  const styles: Record<string, string> = {
    live: 'bg-red-100 text-red-700 border-red-200',
    test: 'bg-amber-50 text-amber-700 border-amber-200',
    mock: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  }

  const cls = styles[mode] || styles.mock
  const label = mode.toUpperCase()
  const canToggle = !mockMode && mode !== 'mock'

  const Tag = canToggle ? 'button' : 'span'
  return (
    <Tag
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${cls} ${canToggle ? 'cursor-pointer hover:opacity-80' : ''}`}
      {...(canToggle ? {
        onClick: () => void toggle(),
        disabled: loading,
        title: mode === 'live' ? 'Switch to test' : 'Switch to live',
      } : {
        title: 'Mock mode',
      })}
    >
      {loading ? '...' : label}
    </Tag>
  )
}
