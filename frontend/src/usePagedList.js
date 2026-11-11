import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from './api'

/**
 * Server-paginated list. Page number lives in the URL (?page=N) so Back/refresh keep your place.
 * Keeps showing the previous page while the next one loads.
 */
export function usePagedList(path, pageSize = 12) {
  const [sp, setSp] = useSearchParams()
  const page = Math.max(1, Number(sp.get('page')) || 1)
  const [nonce, setNonce] = useState(0)
  const [state, setState] = useState({ key: null, items: [], page: 1, pages: 1, total: 0 })
  const key = `${path}|${page}|${nonce}`

  useEffect(() => {
    let live = true
    const sep = path.includes('?') ? '&' : '?'
    api
      .get(`${path}${sep}page=${page}&page_size=${pageSize}`)
      .then(d => live && setState({ key, items: d.results || [], page: d.page || page, pages: d.pages || 1, total: d.total || 0 }))
      .catch(() => live && setState(s => ({ ...s, key })))
    return () => { live = false }
  }, [path, page, pageSize, key])

  const setPage = useCallback(p => {
    const next = new URLSearchParams(sp)
    if (p > 1) next.set('page', String(p))
    else next.delete('page')
    setSp(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [sp, setSp])

  const reload = useCallback(() => setNonce(n => n + 1), [])

  return {
    items: state.items,
    page: state.key === null ? page : state.page,
    pages: state.pages,
    total: state.total,
    setPage,
    reload,
    loading: state.key !== key,
    initialLoading: state.key === null,
  }
}
