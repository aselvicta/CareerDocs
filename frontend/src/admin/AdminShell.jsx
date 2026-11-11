import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { BarChart3, Users, Activity, FolderOpen, ShieldCheck } from 'lucide-react'
import { useAuth } from '../AuthContext'
import './admin.css'

const TABS = [
  { to: '/admin', end: true, icon: BarChart3, label: 'Overview' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/activity', icon: Activity, label: 'Activity' },
  { to: '/admin/content', icon: FolderOpen, label: 'Content' },
]

export function AdminShell() {
  const { user } = useAuth()
  if (!user?.is_staff) return <Navigate to="/" replace />
  return (
    <div className="admin-page">
      <div className="admin-head">
        <p className="admin-head__eyebrow"><ShieldCheck size={14} aria-hidden /> Admin</p>
        <nav className="admin-tabs" aria-label="Admin sections">
          {TABS.map(tab => {
            const TabIcon = tab.icon
            return (
              <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => `admin-tabs__link${isActive ? ' is-active' : ''}`}>
                <TabIcon size={16} aria-hidden /> {tab.label}
              </NavLink>
            )
          })}
        </nav>
      </div>
      <Outlet />
    </div>
  )
}

export function AdminLoading() {
  return <div className="admin-loading" role="status">Loading…</div>
}

export function AdminError({ error, onRetry }) {
  return (
    <div className="empty-block">
      <p>{error || 'Something went wrong.'}</p>
      {onRetry && <button type="button" className="btn btn-secondary" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function Pagination({ page, pages, total, onPage, noun = 'items' }) {
  return (
    <div className="admin-pagination">
      <span className="muted">{total.toLocaleString()} {noun}</span>
      {pages > 1 && (
        <div className="btn-group">
          <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
          <span className="muted">Page {page} of {pages}</span>
          <button type="button" className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  )
}
