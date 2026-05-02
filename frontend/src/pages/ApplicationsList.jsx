import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, Plus, Pencil, Trash2, ExternalLink, FileText, Mail } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../ToastContext'

const STATUS_COLORS = { draft: 'var(--text-muted)', applied: 'var(--primary)', interview: 'var(--primary)', offer: 'var(--success)', rejected: 'var(--danger)', withdrawn: 'var(--text-muted)' }

export function ApplicationsList() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const { addToast } = useToast()

  useEffect(() => {
    api.get('/applications/').then(data => setApps(Array.isArray(data) ? data : [])).catch(() => setApps([])).finally(() => setLoading(false))
  }, [])

  async function handleDelete(id, e) {
    e.preventDefault()
    e.stopPropagation()
    setDeleting(id)
    try {
      await api.delete(`/applications/${id}/`)
      setApps(prev => prev.filter(a => a.id !== id))
      addToast('Application removed.', 'success')
    } catch (err) {
      addToast(err?.message || 'Delete failed.', 'error')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <div className="page"><div className="loading-state"><p>Loading...</p></div></div>

  return (
    <div className="page">
      <div className="page-header page-header--row">
        <h1><Briefcase size={28} /> Job Applications</h1>
        <Link to="/applications/new" className="btn btn-primary"><Plus size={18} /> Add application</Link>
      </div>
      <p className="muted">Track your applications with job title, company, linked CV and cover letter, status, and notes.</p>
      {apps.length ? (
        <div className="card-list" style={{ marginTop: '1rem' }}>
          {apps.map(a => (
            <article key={a.id} className="card card--hover">
              <div className="card__main">
                <h2 className="card__title">
                  <Link to={`/applications/${a.id}`}>
                    <Briefcase size={20} /> {a.job_title}{a.company ? ` at ${a.company}` : ''}
                  </Link>
                </h2>
                <p className="card__meta">
                  <span style={{ color: STATUS_COLORS[a.status] || 'inherit', fontWeight: 500 }}>{a.status_display}</span>
                  {a.deadline && ` · Deadline ${new Date(a.deadline).toLocaleDateString()}`}
                  · Updated {new Date(a.updated_at).toLocaleDateString()}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                  {a.cv && <span className="badge"><FileText size={12} /> {a.cv_title || 'CV'}</span>}
                  {a.letter && <span className="badge"><Mail size={12} /> {a.letter_title || 'Letter'}</span>}
                </div>
              </div>
              <div className="card__actions">
                {a.job_url && (
                  <a href={a.job_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                    <ExternalLink size={14} /> Job link
                  </a>
                )}
                <Link to={`/applications/${a.id}/edit`} className="btn btn-ghost btn-sm"><Pencil size={14} /> Edit</Link>
                <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={e => handleDelete(a.id, e)} disabled={deleting === a.id}>
                  <Trash2 size={14} /> {deleting === a.id ? '…' : 'Delete'}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-block" style={{ marginTop: '1.5rem' }}>
          <Briefcase size={48} className="empty-block__icon" />
          <p>No applications yet.</p>
          <Link to="/applications/new" className="btn btn-primary">Add your first application</Link>
        </div>
      )}
    </div>
  )
}
