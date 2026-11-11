import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, RefreshCw } from 'lucide-react'
import { ActivityTable } from './ActivityTable'
import { AdminError, AdminLoading, Pagination } from './AdminShell'
import { useAdminData, useDebounced } from './useAdminData'
import { EVENT_GROUPS, eventLabel } from './format'

export function AdminActivity() {
  const [sp, setSp] = useSearchParams()
  const [q, setQ] = useState(sp.get('q') || '')
  const dq = useDebounced(q)
  const [live, setLive] = useState(true)
  const event = sp.get('event') || ''
  const hidePV = sp.get('exclude_page_views') === '1'
  const failed = sp.get('failed') === '1'
  const user = sp.get('user') || ''
  const page = Number(sp.get('page') || 1)

  const params = new URLSearchParams({ event, q: dq, user, page })
  if (hidePV) params.set('exclude_page_views', '1')
  if (failed) params.set('failed', '1')
  const { data, error, loading, reload } = useAdminData(`/admin/activity/?${params}`)

  function setParam(key, value) {
    const next = new URLSearchParams(sp)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setSp(next, { replace: true })
  }

  useEffect(() => {
    if (!live || page !== 1) return
    const t = setInterval(() => reload(true), 15000)
    return () => clearInterval(t)
  }, [live, page, reload])

  return (
    <>
      <div className="page-header page-header--row">
        <div>
          <h1>Activity log</h1>
          <p className="subtitle">Every page view and action on the site, newest first.</p>
        </div>
        <div className="admin-filters">
          <label className="admin-check"><input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)} /> Live (15s)</label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => reload()} aria-label="Refresh"><RefreshCw size={16} /></button>
        </div>
      </div>
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={16} aria-hidden />
          <input className="form-control" type="search" placeholder="Search email, page, IP or visitor id" value={q}
            onChange={e => { setQ(e.target.value); setParam('q', e.target.value) }} />
        </label>
        <select className="form-control" value={event} onChange={e => setParam('event', e.target.value)} aria-label="Event type">
          <option value="">All events</option>
          <optgroup label="Groups">
            {EVENT_GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </optgroup>
          <optgroup label="Specific">
            {(data?.event_types || []).map(ev => <option key={ev} value={ev}>{eventLabel(ev)}</option>)}
          </optgroup>
        </select>
        <label className="admin-check"><input type="checkbox" checked={hidePV} onChange={e => setParam('exclude_page_views', e.target.checked ? '1' : '')} /> Hide page views</label>
        <label className="admin-check"><input type="checkbox" checked={failed} onChange={e => setParam('failed', e.target.checked ? '1' : '')} /> Failed only</label>
        {user && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setParam('user', '')}>User #{user} ✕</button>}
      </div>

      {loading && !data && <AdminLoading />}
      {error && !data && <AdminError error={error} onRetry={reload} />}
      {data && (
        <section className={`dashboard-section ${loading ? 'admin-stale' : ''}`}>
          <ActivityTable events={data.results} />
          <Pagination {...data} onPage={p => setParam('page', String(p))} noun="events" />
        </section>
      )}
    </>
  )
}
