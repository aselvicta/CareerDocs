import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'

/**
 * Fetch an admin endpoint; refetches when `path` changes or reload() is called.
 * reload(true) refreshes quietly (no loading state), used for live polling.
 */
export function useAdminData(path) {
  const [req, setReq] = useState({ n: 0, quiet: false })
  const [state, setState] = useState({ key: null, data: null, error: '' })
  const key = `${path}#${req.n}`

  useEffect(() => {
    let live = true
    api
      .get(path)
      .then(data => live && setState({ key, data, error: '' }))
      .catch(e => live && setState(s => ({ ...s, key, error: e.message })))
    return () => { live = false }
  }, [path, key])

  const reload = useCallback((quiet = false) => setReq(r => ({ n: r.n + 1, quiet })), [])
  const samePath = state.key?.startsWith(`${path}#`)
  const loading = state.key !== key && !(req.quiet && samePath)
  return { data: state.data, error: state.error, loading, reload }
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
