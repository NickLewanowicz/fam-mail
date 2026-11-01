import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthContext'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { fetchPostgridStatus, setPostgridMode, type PostgridApiMode } from '../../utils/postgridApi'

export function PostGridModeBadge() {
  const { token } = useAuth()
  const [mode, setMode] = useState<PostgridApiMode | null>(null)
  const [mockMode, setMockMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingLive, setConfirmingLive] = useState(false)

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

  const requestToggle = () => {
    if (!mode || mode === 'mock' || mockMode) return
    if (mode === 'test') {
      setConfirmingLive(true)
    } else {
      void applyMode('test')
    }
  }

  const applyMode = async (next: 'test' | 'live') => {
    setLoading(true)
    setError(null)
    try {
      const s = await setPostgridMode(next)
      setMode(s.mode)
      setMockMode(s.mockMode)
      toast.success(s.mode === 'live' ? 'Live mode — postcards will be mailed' : 'Test mode — nothing will be mailed')
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
    mock: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  }

  const cls = styles[mode] || styles.mock
  const label = mode.toUpperCase()
  const canToggle = !mockMode && mode !== 'mock'

  const Tag = canToggle ? 'button' : 'span'
  return (
    <>
      <Tag
        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${cls} ${canToggle ? 'cursor-pointer hover:opacity-80' : ''}`}
        {...(canToggle ? {
          onClick: requestToggle,
          disabled: loading,
          title: mode === 'live' ? 'Switch to test' : 'Switch to live',
        } : {
          title: 'Mock mode',
        })}
      >
        {loading ? '...' : label}
      </Tag>
      <ConfirmDialog
        open={confirmingLive}
        onOpenChange={setConfirmingLive}
        title="Switch to live mode?"
        description="Postcards will actually be printed and mailed, and your PostGrid account will be charged."
        confirmLabel="Go live"
        destructive
        onConfirm={() => void applyMode('live')}
      />
    </>
  )
}
