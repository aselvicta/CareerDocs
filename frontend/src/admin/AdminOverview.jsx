import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users, Eye, MousePointerClick, UserPlus, Sparkles, Download, Send, FileText, Mail, Briefcase,
  UserCheck, RefreshCw, AlertTriangle,
} from 'lucide-react'
import { BarList, StatTile, TrendChart } from './charts'
import { AdminError, AdminLoading } from './AdminShell'
import { useAdminData } from './useAdminData'
import { eventLabel, fmtDateTime, fmtNum, humanize, pageLabel, timeAgo } from './format'

const RANGES = [7, 30, 90, 365]
const METRICS = [
  ['page_views', 'Page views'],
  ['visitors', 'Visitors'],
  ['active_users', 'Active users'],
  ['signups', 'Sign-ups'],
  ['actions', 'Actions'],
]

export function AdminOverview() {
  const [days, setDays] = useState(30)
  const [metric, setMetric] = useState('page_views')
  const [bust, setBust] = useState(0)
  const { data, error, loading, reload } = useAdminData(`/admin/overview/?days=${days}${bust ? `&refresh=1&t=${bust}` : ''}`)
  const navigate = useNavigate()

  return (
    <>
      <div className="page-header page-header--row">
        <div>
          <h1>Site analytics</h1>
          <p className="subtitle">
            {data ? `Last ${days} days · updated ${timeAgo(data.generated_at)}` : 'Usage across all users'}
          </p>
        </div>
        <div className="admin-filters">
          <div className="segmented" role="group" aria-label="Date range">
            {RANGES.map(r => (
              <button key={r} type="button" className={r === days ? 'is-active' : ''} aria-pressed={r === days} onClick={() => { setDays(r); setBust(0) }}>
                {r === 365 ? '1y' : `${r}d`}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBust(Date.now())} aria-label="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {loading && !data && <AdminLoading />}
      {error && !data && <AdminError error={error} onRetry={reload} />}
      {data && (
        <div className={loading ? 'admin-stale' : ''}>
          <div className="stat-grid">
            <StatTile icon={Users} label="Visitors" value={data.period.visitors} sub="unique browsers" />
            <StatTile icon={Eye} label="Page views" value={data.period.page_views} />
            <StatTile icon={UserCheck} label="Active users" value={data.period.active_users} sub="signed-in users who did something" />
            <StatTile icon={UserPlus} label="New users" value={data.period.new_users} />
            <StatTile icon={MousePointerClick} label="Actions" value={data.period.actions} sub={`${fmtNum(data.period.logins)} logins`} />
            <StatTile icon={Sparkles} label="AI requests" value={data.period.ai_requests} />
            <StatTile icon={Download} label="Exports" value={data.period.exports} sub="PDF + Word" />
            <StatTile icon={Send} label="Emails sent" value={data.period.emails_sent} />
          </div>

          <section className="dashboard-section">
            <div className="section-header">
              <h2>Traffic over time</h2>
              <div className="segmented" role="group" aria-label="Metric">
                {METRICS.map(([k, l]) => (
                  <button key={k} type="button" className={k === metric ? 'is-active' : ''} aria-pressed={k === metric} onClick={() => setMetric(k)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <TrendChart
              label={METRICS.find(m => m[0] === metric)[1]}
              data={data.series.map(d => ({ date: d.date, value: d[metric] }))}
            />
          </section>

          <h2 className="admin-subhead">All-time totals</h2>
          <div className="stat-grid">
            <StatTile icon={Users} label="Users" value={data.totals.users}
              sub={`${fmtNum(data.totals.google_users)} Google · ${fmtNum(data.totals.password_users)} password`} />
            <StatTile icon={FileText} label="CVs" value={data.totals.cvs} sub={`${fmtNum(data.totals.shared_cvs)} shared publicly`} />
            <StatTile icon={Mail} label="Letters" value={data.totals.letters} />
            <StatTile icon={Briefcase} label="Applications" value={data.totals.applications} />
          </div>

          {data.period.failed_requests > 0 && (
            <p className="admin-note">
              <AlertTriangle size={16} aria-hidden /> {fmtNum(data.period.failed_requests)} actions failed in this period
              (e.g. wrong passwords, AI errors). <Link to="/admin/activity?failed=1">See failed requests</Link>
            </p>
          )}

          <div className="admin-grid">
            <section className="dashboard-section">
              <div className="section-header"><h2>Top pages</h2></div>
              <BarList items={data.top_pages} formatLabel={pageLabel} />
            </section>
            <section className="dashboard-section">
              <div className="section-header"><h2>What users do</h2></div>
              <BarList
                items={data.top_events}
                formatLabel={eventLabel}
                onSelect={i => navigate(`/admin/activity?event=${encodeURIComponent(i.label)}`)}
              />
            </section>
            <section className="dashboard-section">
              <div className="section-header"><h2>Most active users</h2></div>
              <BarList
                items={data.top_users.map(u => ({ label: u.email, count: u.count, id: u.id }))}
                onSelect={i => navigate(`/admin/users/${i.id}`)}
                empty="No signed-in activity yet."
              />
            </section>
            <section className="dashboard-section">
              <div className="section-header"><h2>Traffic sources</h2></div>
              <BarList items={data.referrers} empty="No external referrers yet (direct visits only)." />
            </section>
            <section className="dashboard-section">
              <div className="section-header"><h2>Devices</h2></div>
              <BarList items={data.devices.filter(d => d.count > 0)} />
            </section>
            <section className="dashboard-section">
              <div className="section-header"><h2>CV templates</h2></div>
              <BarList items={data.cv_templates} formatLabel={humanize} />
            </section>
            <section className="dashboard-section">
              <div className="section-header"><h2>Letter types</h2></div>
              <BarList items={data.letter_types} formatLabel={humanize} />
            </section>
            <section className="dashboard-section">
              <div className="section-header"><h2>Application statuses</h2></div>
              <BarList items={data.application_statuses} formatLabel={humanize} />
            </section>
          </div>

          <section className="dashboard-section">
            <div className="section-header">
              <h2>Latest activity</h2>
              <Link to="/admin/activity" className="btn btn-ghost btn-sm">View all</Link>
            </div>
            <ul className="feed">
              {data.recent.map(e => (
                <li key={e.id} className="feed__item">
                  <span className="feed__what">
                    {e.user ? <Link to={`/admin/users/${e.user.id}`}>{e.user.email}</Link> : <span className="muted">Visitor</span>}
                    {' '}{eventLabel(e.event).toLowerCase()}
                    {e.event === 'page.view' && <code className="feed__path">{e.path}</code>}
                  </span>
                  <time className="feed__time" dateTime={e.created_at} title={fmtDateTime(e.created_at)}>{timeAgo(e.created_at)}</time>
                </li>
              ))}
              {!data.recent.length && <li className="empty-state">Nothing recorded yet.</li>}
            </ul>
          </section>
        </div>
      )}
    </>
  )
}
