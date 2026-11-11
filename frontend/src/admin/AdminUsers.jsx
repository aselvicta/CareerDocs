import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { AdminError, AdminLoading, Pagination } from './AdminShell'
import { useAdminData, useDebounced } from './useAdminData'
import { fmtDate, fmtNum, timeAgo } from './format'

export function AdminUsers() {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const dq = useDebounced(q)
  const params = new URLSearchParams({ q: dq, filter, sort, page })
  const { data, error, loading, reload } = useAdminData(`/admin/users/?${params}`)

  const set = fn => v => { fn(v); setPage(1) }

  return (
    <>
      <div className="page-header">
        <h1>Users</h1>
        <p className="subtitle">Everyone who has an account, with what they have created and when they were last active.</p>
      </div>
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={16} aria-hidden />
          <input className="form-control" type="search" placeholder="Search email, username or name" value={q} onChange={e => set(setQ)(e.target.value)} />
        </label>
        <select className="form-control" value={filter} onChange={e => set(setFilter)(e.target.value)} aria-label="Filter">
          <option value="">All users</option>
          <option value="google">Google sign-in</option>
          <option value="password">Password sign-in</option>
          <option value="staff">Admins</option>
          <option value="inactive">Disabled</option>
        </select>
        <select className="form-control" value={sort} onChange={e => set(setSort)(e.target.value)} aria-label="Sort">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="last_seen">Recently active</option>
          <option value="activity">Most activity</option>
          <option value="cvs">Most CVs</option>
          <option value="email">Email A–Z</option>
        </select>
      </div>

      {loading && !data && <AdminLoading />}
      {error && !data && <AdminError error={error} onRetry={reload} />}
      {data && (
        <section className={`dashboard-section ${loading ? 'admin-stale' : ''}`}>
          <div className="table-responsive">
            <table className="admin-table admin-table--rows">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Sign-in</th>
                  <th>Joined</th>
                  <th>Last active</th>
                  <th className="num">CVs</th>
                  <th className="num">Letters</th>
                  <th className="num">Apps</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map(u => (
                  <tr key={u.id}>
                    <td className="truncate">
                      <Link to={`/admin/users/${u.id}`} className="admin-user-link">{u.email}</Link>
                      <span className="muted admin-user-sub">
                        {u.name || u.username}
                        {u.is_staff && <span className="pill">admin</span>}
                        {!u.is_active && <span className="pill pill--danger">disabled</span>}
                      </span>
                    </td>
                    <td>{u.auth_method === 'google' ? 'Google' : 'Password'}</td>
                    <td className="nowrap">{fmtDate(u.date_joined)}</td>
                    <td className="nowrap">{timeAgo(u.last_seen || u.last_login)}</td>
                    <td className="num">{fmtNum(u.cv_count)}</td>
                    <td className="num">{fmtNum(u.letter_count)}</td>
                    <td className="num">{fmtNum(u.application_count)}</td>
                    <td className="num">{fmtNum(u.event_count)}</td>
                  </tr>
                ))}
                {!data.results.length && (
                  <tr><td colSpan={8} className="empty-state">No users match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination {...data} onPage={setPage} noun="users" />
        </section>
      )}
    </>
  )
}
