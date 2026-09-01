import { useEffect } from 'react'

/** Sets the browser tab title for the current route. */
export function RouteTitle({ title }: { title: string }) {
  useEffect(() => {
    document.title = title ? `${title} · Fam Mail` : 'Fam Mail'
  }, [title])
  return null
}
