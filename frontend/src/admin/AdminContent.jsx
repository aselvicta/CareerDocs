import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Link2 } from 'lucide-react'
import { AdminError, AdminLoading, Pagination } from './AdminShell'
import { ContentModal } from './ContentModal'
import { useAdminData, useDebounced } from './useAdminData'
import { humanize, timeAgo, fmtDate } from './format'

const KINDS = [
  ['cvs', 'CVs'],
  ['letters', 'Letters'],
  ['applications', 'Applications'],
]

export function AdminContent() {
  const [kind, setKind] = useState('cvs')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [viewing, setViewing] = useState(null)
  const dq = useDebounced(q)
  const { data, error, loading, reload } = useAdminData(`/admin/content/${kind}/?${new URLSearchParams({ q: dq, page })}`)

  return (
    <>
      <div className="page-header page-header--row">
        <div>
          <h1>Content</h1>
          <p className="subtitle">Everything users have created on the site.</p>
        </div>
        <div className="segmented" role="group" aria-label="Content type">
          {KINDS.map(([k, l]) => (
            <button key={k} type="button" className={k === kind ? 'is-active' : ''} aria-pressed={k === kind}
              onClick={() => { setKind(k); setPage(1) }}>{l}</button>
          ))}
        </div>
      </div>
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={16} aria-hidden />
          <input className="form-control" type="search" placeholder="Search title, company, name or owner email" value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }} />
        </label>
      </div>

      {loading && !data && <AdminLoading />}
      {error && !data && <AdminError error={error} onRetry={reload} />}
      {data && (
        <section className={`dashboard-section ${loading ? 'admin-stale' : ''}`}>
          <div className="table-responsive">
            <table className="admin-table admin-table--rows">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>{kind === 'cvs' ? 'Template' : kind === 'letters' ? 'Type' : 'Status'}</th>
                  <th>Owner</th>
                  <th>Created</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map(r => (
                  <tr key={r.id}>
                    <td className="truncate">
                      <button type="button" className="admin-link-btn" onClick={() => setViewing({ kind, id: r.id })}>{r.title || '(untitled)'}</button>
                      {r.shared && <Link2 size={14} className="admin-inline-icon" aria-label="shared publicly" />}
                      {r.subtitle && <span className="muted admin-user-sub">{r.subtitle}</span>}
                    </td>
                    <td>{humanize(r.kind)}</td>
                    <td className="truncate"><Link to={`/admin/users/${r.user.id}`}>{r.user.email}</Link></td>
                    <td className="nowrap">{fmtDate(r.created_at)}</td>
                    <td className="nowrap">{timeAgo(r.updated_at)}</td>
                  </tr>
                ))}
                {!data.results.length && <tr><td colSpan={5} className="empty-state">Nothing found.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination {...data} onPage={setPage} noun={KINDS.find(k => k[0] === kind)[1].toLowerCase()} />
        </section>
      )}
      {viewing && <ContentModal {...viewing} onClose={() => setViewing(null)} onChanged={() => reload(true)} />}
    </>
  )
}
