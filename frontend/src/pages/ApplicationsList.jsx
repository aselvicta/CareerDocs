import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarClock, Columns3, ExternalLink, FileText, List, Mail, Plus, Search } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../ToastContext'
import { STATUS_LABEL, shortDate, relativeTime } from '../shell/format'

const COLUMNS = [
  { id: 'draft', label: 'Saved', hint: 'Jobs you plan to apply for', statuses: ['draft'] },
  { id: 'applied', label: 'Applied', hint: 'Waiting to hear back', statuses: ['applied'] },
  { id: 'interview', label: 'Interview', hint: 'In the process', statuses: ['interview'] },
  { id: 'offer', label: 'Offer', hint: 'Congratulations', statuses: ['offer'] },
  { id: 'closed', label: 'Closed', hint: 'Rejected or withdrawn', statuses: ['rejected', 'withdrawn'], dropAs: 'rejected' },
]

function deadlineInfo(deadline) {
  if (!deadline) return null
  const d = new Date(`${deadline}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((d - today) / 86400000)
  const label = days < 0 ? `Closed ${shortDate(deadline)}` : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : days <= 14 ? `${days} days left` : `Due ${shortDate(deadline)}`
  return { label, tone: days < 0 ? 'past' : days <= 3 ? 'soon' : 'ok' }
}

function AppCard({ a, onDragStart, dragging }) {
  const dl = deadlineInfo(a.deadline)
  return (
    <Link
      to={`/applications/${a.id}`}
      className={`jb-card ${dragging ? 'is-dragging' : ''}`}
      draggable
      onDragStart={e => { e.dataTransfer.setData('text/plain', String(a.id)); e.dataTransfer.effectAllowed = 'move'; onDragStart(a.id) }}
    >
      <span className="jb-card__title">{a.job_title}</span>
      {a.company && <span className="jb-card__org">{a.company}</span>}
      <span className="jb-card__foot">
        {dl && <span className={`jb-dl jb-dl--${dl.tone}`}><CalendarClock size={12} /> {dl.label}</span>}
        <span className="jb-card__docs">
          {a.cv && <FileText size={13} aria-label="CV attached" />}
          {a.letter && <Mail size={13} aria-label="Letter attached" />}
        </span>
      </span>
    </Link>
  )
}

export function ApplicationsList() {
  const [sp, setSp] = useSearchParams()
  const statusFilter = sp.get('status')
  const view = sp.get('view') || (statusFilter ? 'list' : 'board')
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [apps, setApps] = useState(null)
  const [q, setQ] = useState('')
  const [dragId, setDragId] = useState(null)
  const [over, setOver] = useState(null)

  useEffect(() => {
    api.get('/applications/?page=1&page_size=100').then(d => setApps(d.results || [])).catch(() => setApps([]))
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (apps || []).filter(a => (!term || `${a.job_title} ${a.company} ${a.notes}`.toLowerCase().includes(term))
      && (!statusFilter || a.status === statusFilter || (statusFilter === 'closed' && ['rejected', 'withdrawn'].includes(a.status))))
  }, [apps, q, statusFilter])

  async function move(id, status) {
    const app = apps.find(a => a.id === id)
    if (!app || app.status === status) return
    const prev = apps
    setApps(list => list.map(a => (a.id === id ? { ...a, status, status_display: STATUS_LABEL[status] } : a)))
    try {
      await api.patch(`/applications/${id}/`, { status })
      addToast(`Moved to ${STATUS_LABEL[status]}.`, 'success')
    } catch (e) {
      setApps(prev)
      addToast(e?.message || 'Could not update.', 'error')
    }
  }

  function setView(v) {
    const next = new URLSearchParams(sp)
    next.set('view', v)
    setSp(next, { replace: true })
  }

  const total = apps?.length || 0

  return (
    <div className="jb">
      <div className="pg-head">
        <div>
          <h1 className="pg-title">Applications</h1>
          <p className="pg-sub">Every job you are going for, from saved to offer. Drag a card to update its stage.</p>
        </div>
        <div className="pg-actions">
          <Link to="/applications/new" className="btn btn-primary"><Plus size={16} /> Add job</Link>
        </div>
      </div>

      {apps && total === 0 ? (
        <div className="empty">
          <div className="empty__art" aria-hidden />
          <h2>Track your job search</h2>
          <p>Add jobs you are interested in, attach the CV and letter you sent, set deadlines and move them along as you hear back.</p>
          <div className="empty__actions"><Link to="/applications/new" className="btn btn-primary"><Plus size={16} /> Add your first job</Link></div>
        </div>
      ) : (
        <>
          <div className="pg-toolbar">
            <label className="pg-searchbox">
              <Search size={16} />
              <input className="form-control" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search jobs or companies" aria-label="Search applications" />
            </label>
            {statusFilter && (
              <button type="button" className="btn btn-ghost btn--sm" onClick={() => { const n = new URLSearchParams(sp); n.delete('status'); setSp(n, { replace: true }) }}>
                Showing {STATUS_LABEL[statusFilter] || 'Closed'} only. Clear
              </button>
            )}
            <div className="seg" style={{ marginLeft: 'auto' }}>
              <button type="button" className={view === 'board' ? 'is-active' : ''} onClick={() => setView('board')}><Columns3 size={15} /> Board</button>
              <button type="button" className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')}><List size={15} /> List</button>
            </div>
          </div>

          {!apps ? (
            <div className="jb-board">{COLUMNS.map(c => <div key={c.id} className="skel" style={{ height: 260 }} />)}</div>
          ) : view === 'board' ? (
            <div className="jb-board">
              {COLUMNS.map(col => {
                const cards = filtered.filter(a => col.statuses.includes(a.status))
                return (
                  <section
                    key={col.id}
                    className={`jb-col ${over === col.id ? 'is-over' : ''}`}
                    onDragOver={e => { e.preventDefault(); setOver(col.id) }}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null) }}
                    onDrop={e => {
                      e.preventDefault()
                      setOver(null)
                      const id = Number(e.dataTransfer.getData('text/plain'))
                      const target = col.dropAs || col.id
                      const app = apps.find(a => a.id === id)
                      if (app && !col.statuses.includes(app.status)) move(id, target)
                      setDragId(null)
                    }}
                  >
                    <header className="jb-col__head">
                      <span className={`jb-col__dot jb-col__dot--${col.id}`} />
                      <h2>{col.label}</h2>
                      <span className="jb-col__count">{cards.length}</span>
                      <button type="button" className="jb-col__add" onClick={() => navigate(`/applications/new?status=${col.dropAs || col.id}`)} aria-label={`Add job to ${col.label}`}><Plus size={15} /></button>
                    </header>
                    <div className="jb-col__body">
                      {cards.map(a => <AppCard key={a.id} a={a} dragging={dragId === a.id} onDragStart={setDragId} />)}
                      {cards.length === 0 && <p className="jb-col__empty">{col.hint}</p>}
                    </div>
                  </section>
                )
              })}
            </div>
          ) : (
            <div className="jb-table-wrap">
              <table className="jb-table">
                <thead>
                  <tr><th>Job</th><th>Stage</th><th>Deadline</th><th>Documents</th><th>Updated</th><th aria-label="Link" /></tr>
                </thead>
                <tbody>
                  {filtered.map(a => {
                    const dl = deadlineInfo(a.deadline)
                    return (
                      <tr key={a.id} onClick={() => navigate(`/applications/${a.id}`)}>
                        <td><Link to={`/applications/${a.id}`} className="jb-table__title" onClick={e => e.stopPropagation()}>{a.job_title}</Link><span className="jb-table__org">{a.company}</span></td>
                        <td onClick={e => e.stopPropagation()}>
                          <select className={`jb-status jb-status--${a.status}`} value={a.status} onChange={e => move(a.id, e.target.value)} aria-label="Stage">
                            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </td>
                        <td>{dl ? <span className={`jb-dl jb-dl--${dl.tone}`}>{dl.label}</span> : <span className="muted">None</span>}</td>
                        <td className="jb-table__docs">{a.cv_title && <span><FileText size={13} /> {a.cv_title}</span>}{a.letter_title && <span><Mail size={13} /> {a.letter_title}</span>}</td>
                        <td className="muted">{relativeTime(a.updated_at)}</td>
                        <td>{a.job_url && <a href={a.job_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} aria-label="Open job advert"><ExternalLink size={15} /></a>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && <p className="pg-sub" style={{ padding: '1rem' }}>No jobs match.</p>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
