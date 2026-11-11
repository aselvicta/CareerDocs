import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePagedList } from '../usePagedList'

/**
 * Search + sort + pagination state for a document library, kept in the URL so
 * Back, refresh and shared links keep the same view.
 */
export function useLibrary(basePath, pageSize = 11) {
  const [sp, setSp] = useSearchParams()
  const q = sp.get('q') || ''
  const sort = sp.get('sort') || 'updated'
  const [draft, setDraft] = useState(q)

  // Debounce typing into the URL (which triggers the fetch).
  useEffect(() => {
    if (draft === q) return undefined
    const t = setTimeout(() => {
      const next = new URLSearchParams(sp)
      if (draft) next.set('q', draft)
      else next.delete('q')
      next.delete('page')
      setSp(next, { replace: true })
    }, 250)
    return () => clearTimeout(t)
  }, [draft, q, sp, setSp])

  const setSort = useCallback(value => {
    const next = new URLSearchParams(sp)
    if (value && value !== 'updated') next.set('sort', value)
    else next.delete('sort')
    next.delete('page')
    setSp(next, { replace: true })
  }, [sp, setSp])

  const params = new URLSearchParams({ preview: '1', sort })
  if (q) params.set('q', q)
  const list = usePagedList(`${basePath}?${params}`, pageSize)
  return { ...list, q, draft, setDraft, sort, setSort }
}

