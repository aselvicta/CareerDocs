import { Link } from 'react-router-dom'
import { eventLabel, fmtDateTime, parseUA, timeAgo } from './format'

export function ActivityTable({ events, showUser = true }) {
  if (!events.length) return <p className="empty-state">No activity recorded.</p>
  return (
    <div className="table-responsive">
      <table className="admin-table">
        <thead>
          <tr>
            <th>When</th>
            {showUser && <th>Who</th>}
            <th>What</th>
            <th>Where</th>
            <th>Device</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {events.map(e => {
            const failed = e.status_code >= 400
            return (
              <tr key={e.id} className={failed ? 'is-failed' : ''}>
                <td className="nowrap" title={fmtDateTime(e.created_at)}>{timeAgo(e.created_at)}</td>
                {showUser && (
                  <td className="truncate">
                    {e.user
                      ? <Link to={`/admin/users/${e.user.id}`}>{e.user.email}</Link>
                      : <span className="muted" title={e.visitor_id}>Visitor {e.visitor_id ? e.visitor_id.slice(0, 6) : ''}</span>}
                  </td>
                )}
                <td>
                  {eventLabel(e.event)}
                  {failed && <span className="pill pill--danger" title={`HTTP ${e.status_code}`}>failed {e.status_code}</span>}
                </td>
                <td className="truncate"><code>{e.path || 'Not set'}</code>{e.referrer && <span className="muted"> from {e.referrer}</span>}</td>
                <td className="nowrap muted">{parseUA(e.user_agent) || 'Not set'}</td>
                <td className="nowrap muted">{e.ip || 'Not set'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
