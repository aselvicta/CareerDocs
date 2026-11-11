import { Suspense } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3, Users, Activity, FolderOpen, ShieldCheck, ShieldX, ArrowLeftRight, LogOut, Sun, Moon,
} from 'lucide-react'
import { AppLogo } from '../AppLogo'
import { useAuth } from '../AuthContext'
import { useTheme } from '../ThemeContext'
import { LoadingState } from '../LoadingState'
import { AdminLogin } from './AdminLogin'
import './admin.css'

const TABS = [
  { to: '/admin', end: true, icon: BarChart3, label: 'Overview' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/activity', icon: Activity, label: 'Activity' },
  { to: '/admin/content', icon: FolderOpen, label: 'Content' },
]

/** /admin/*: login screen when signed out, "no access" for non-staff, otherwise the admin console. */
export function AdminGate() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingState />
  if (!user) return <AdminLogin />
  if (!user.is_staff) return <AdminNoAccess />
  return <AdminLayout />
}

function AdminNoAccess() {
  const { user, logout } = useAuth()
  return (
    <div className="admin-auth">
      <div className="admin-auth__card admin-auth__card--center">
        <ShieldX size={36} className="admin-auth__icon" aria-hidden />
        <h1 className="admin-auth__heading">No admin access</h1>
        <p className="admin-auth__sub">
          You&apos;re signed in as <strong>{user.email}</strong>, which isn&apos;t an administrator account.
        </p>
        <div className="admin-auth__actions">
          <Link to="/" className="btn btn-primary btn--full">Go to the app</Link>
          <button type="button" className="btn btn-secondary btn--full" onClick={logout}>Sign in with another account</button>
        </div>
      </div>
    </div>
  )
}

function AdminLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  return (
    <div className="admin-app">
      <aside className="admin-side">
        <Link to="/admin" className="admin-side__brand">
          <AppLogo className="app-logo--nav" alt="" />
          <span>
            <span className="admin-side__name">Career Docs</span>
            <span className="admin-side__tag"><ShieldCheck size={12} aria-hidden /> Admin</span>
          </span>
        </Link>
        <nav className="admin-side__nav" aria-label="Admin sections">
          {TABS.map(tab => {
            const TabIcon = tab.icon
            return (
              <NavLink key={tab.to} to={tab.to} end={tab.end}
                className={({ isActive }) => `admin-side__link${isActive ? ' is-active' : ''}`}>
                <TabIcon size={18} aria-hidden /> <span>{tab.label}</span>
              </NavLink>
            )
          })}
        </nav>
        <div className="admin-side__foot">
          <Link to="/" className="admin-side__link admin-side__switch">
            <ArrowLeftRight size={18} aria-hidden /> <span>Back to app</span>
          </Link>
          <div className="admin-side__user">
            <span className="admin-side__email" title={user.email}>{user.email}</span>
            <span className="admin-side__icons">
              <button type="button" className="admin-icon-btn" onClick={toggleTheme}
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <button type="button" className="admin-icon-btn" onClick={logout} aria-label="Log out">
                <LogOut size={16} />
              </button>
            </span>
          </div>
        </div>
      </aside>
      <main className="admin-main">
        <div className="admin-page">
          <Suspense fallback={<AdminLoading />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
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
