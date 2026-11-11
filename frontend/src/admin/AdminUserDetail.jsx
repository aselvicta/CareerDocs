import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, ShieldOff, UserX, UserCheck, Trash2, Link2 } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { useToast } from '../ToastContext'
import { AdminError, AdminLoading } from './AdminShell'
import { ActivityTable } from './ActivityTable'
import { BarList, StatTile } from './charts'
import { ContentModal } from './ContentModal'
import { useAdminData } from './useAdminData'
import { eventLabel, fmtDate, fmtDateTime, humanize, timeAgo } from './format'

export function AdminUserDetail() {
  const { id } = useParams()
  const { user: me } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const { data: u, error, loading, reload } = useAdminData(`/admin/users/${id}/`)
  const [busy, setBusy] = useState(false)
  const [viewing, setViewing] = useState(null)

  if (loading && !u) return <AdminLoading />
  if (error && !u) return <AdminError error={error} onRetry={reload} />

  const isMe = me?.id === u.id

  async function update(patch, msg) {
    setBusy(true)
    try {
      await api.patch(`/admin/users/${u.id}/`, patch)
      addToast(msg, 'success')
      await reload(true)
    } catch (e) {
      addToast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Permanently delete ${u.email} and ALL their CVs, letters and applications? This cannot be undone.`)) return
    setBusy(true)
    try {
      await api.delete(`/admin/users/${u.id}/`)
      addToast('User deleted.', 'success')
      navigate('/admin/users', { replace: true })
    } catch (e) {
      addToast(e.message, 'error')
      setBusy(false)
    }
  }

  const p = u.profile || {}
  return (
    <>
      <Link to="/admin/users" className="btn btn-ghost btn-sm admin-back"><ArrowLeft size={16} /> All users</Link>
      <div className="page-header page-header--row">
        <div>
          <h1 className="admin-break">{u.email}</h1>
          <p className="subtitle">
            {u.name || u.username} · {u.auth_method === 'google' ? 'Google sign-in' : 'Password sign-in'}
            {u.is_staff && <span className="pill">admin</span>}
            {u.is_superuser && <span className="pill">superuser</span>}
            {!u.is_active && <span className="pill pill--danger">disabled</span>}
          </p>
        </div>
        <div className="btn-group">
          {u.is_staff ? (
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy || isMe} onClick={() => update({ is_staff: false }, 'Admin access removed.')}>
              <ShieldOff size={16} /> Remove admin
            </button>
          ) : (
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => update({ is_staff: true }, 'User is now an admin.')}>
              <ShieldCheck size={16} /> Make admin
            </button>
          )}
          {u.is_active ? (
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy || isMe}
              onClick={() => window.confirm(`Disable ${u.email}? They will be signed out and unable to log in.`) && update({ is_active: false }, 'Account disabled.')}>
              <UserX size={16} /> Disable
            </button>
          ) : (
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => update({ is_active: true }, 'Account re-enabled.')}>
              <UserCheck size={16} /> Enable
            </button>
          )}
          <button type="button" className="btn btn-danger btn-sm" disabled={busy || isMe} onClick={remove}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <StatTile label="Joined" value={fmtDate(u.date_joined)} />
        <StatTile label="Last active" value={timeAgo(u.last_seen || u.last_login)} sub={u.last_login ? `last login ${fmtDateTime(u.last_login)}` : null} />
        <StatTile label="CVs / letters" value={`${u.cv_count} / ${u.letter_count}`} />
        <StatTile label="Tracked actions" value={u.event_count} sub={`${u.application_count} applications`} />
      </div>

      <div className="admin-grid">
        <section className="dashboard-section">
          <div className="section-header"><h2>Profile</h2></div>
          <table className="detail-table">
            <tbody>
              <tr><td className="detail-table__label">Full name</td><td>{p.full_name || 'Not set'}</td></tr>
              <tr><td className="detail-table__label">Contact email</td><td>{p.email || 'Not set'}</td></tr>
              <tr><td className="detail-table__label">Phone</td><td>{p.phone || 'Not set'}</td></tr>
              <tr><td className="detail-table__label">Location</td><td>{p.location || 'Not set'}</td></tr>
              <tr><td className="detail-table__label">Username</td><td>{u.username}</td></tr>
              <tr><td className="detail-table__label">User ID</td><td>{u.id}</td></tr>
            </tbody>
          </table>
          {p.summary && <p className="muted admin-summary">{p.summary}</p>}
        </section>
        <section className="dashboard-section">
          <div className="section-header"><h2>What they use</h2></div>
          <BarList items={u.event_breakdown.slice(0, 10)} formatLabel={eventLabel} empty="No tracked activity yet." />
        </section>
      </div>

      <div className="admin-grid admin-grid--3">
        <ContentList title="CVs" items={u.cvs} render={c => (
          <>{c.title} <span className="muted">· {humanize(c.template)}</span>{c.shared && <Link2 size={14} className="admin-inline-icon" aria-label="shared publicly" />}</>
        )} onOpen={c => setViewing({ kind: 'cvs', id: c.id })} />
        <ContentList title="Letters" items={u.letters} render={l => (
          <>{l.title || humanize(l.letter_type)} {l.company && <span className="muted">· {l.company}</span>}</>
        )} onOpen={l => setViewing({ kind: 'letters', id: l.id })} />
        <ContentList title="Applications" items={u.applications} render={a => (
          <>{a.job_title} {a.company && <span className="muted">· {a.company}</span>} <span className="pill">{humanize(a.status)}</span></>
        )} onOpen={a => setViewing({ kind: 'applications', id: a.id })} />
      </div>

      <section className="dashboard-section">
        <div className="section-header">
          <h2>Activity timeline</h2>
          <Link to={`/admin/activity?user=${u.id}`} className="btn btn-ghost btn-sm">Full history</Link>
        </div>
        <ActivityTable events={u.activity} showUser={false} />
      </section>

      {viewing && <ContentModal {...viewing} onClose={() => setViewing(null)} onChanged={() => reload(true)} />}
    </>
  )
}

function ContentList({ title, items, render, onOpen }) {
  return (
    <section className="dashboard-section">
      <div className="section-header"><h2>{title} <span className="muted">({items.length})</span></h2></div>
      {items.length ? (
        <ul className="item-list">
          {items.map(i => (
            <li key={i.id}>
              <button type="button" className="item-list__link admin-item-btn" onClick={() => onOpen(i)}>
                <span className="item-list__title">{render(i)}</span>
                <span className="item-list__meta">updated {timeAgo(i.updated_at)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="empty-state">None.</p>}
    </section>
  )
}
