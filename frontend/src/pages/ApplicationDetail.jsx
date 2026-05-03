import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Briefcase, Pencil, Trash2, ExternalLink, FileText, Mail } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../ToastContext'

export function ApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    api.get(`/applications/${id}/`).then(setApp).catch(() => setApp(null)).finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!confirm('Remove this application?')) return
    setDeleting(true)
    try {
      await api.delete(`/applications/${id}/`)
      addToast('Application removed.', 'success')
      navigate('/applications')
    } catch (err) {
      addToast(err?.message || 'Delete failed.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="page"><div className="loading-state"><p>Loading...</p></div></div>
  if (!app) return <div className="page"><p>Application not found.</p><Link to="/applications">Back to applications</Link></div>

  return (
    <div className="page">
      <div className="page-header page-header--row">
        <h1><Briefcase size={28} /> {app.job_title}{app.company ? ` at ${app.company}` : ''}</h1>
        <div className="btn-group">
          <Link to={`/applications/${id}/edit`} className="btn btn-primary"><Pencil size={18} /> Edit</Link>
          {app.job_url && (
            <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              <ExternalLink size={18} /> Job posting
            </a>
          )}
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            <Trash2 size={18} /> {deleting ? '…' : 'Delete'}
          </button>
        </div>
      </div>
      <div className="card card--detail" style={{ marginTop: '1rem' }}>
        <div className="table-responsive">
          <table className="detail-table">
            <tbody>
              <tr><td className="detail-table__label">Company</td><td>{app.company || '—'}</td></tr>
              <tr><td className="detail-table__label">Status</td><td><strong>{app.status_display}</strong></td></tr>
              {app.deadline && <tr><td className="detail-table__label">Deadline</td><td>{new Date(app.deadline).toLocaleDateString()}</td></tr>}
              {app.job_url && <tr><td className="detail-table__label">Link</td><td><a href={app.job_url} target="_blank" rel="noopener noreferrer" className="detail-table__break">{app.job_url}</a></td></tr>}
              {app.cv && <tr><td className="detail-table__label">CV</td><td><Link to={`/cv/${app.cv}`}><FileText size={14} /> {app.cv_title || 'CV'}</Link></td></tr>}
              {app.letter && <tr><td className="detail-table__label">Cover letter</td><td><Link to={`/letters/${app.letter}`}><Mail size={14} /> {app.letter_title || 'Letter'}</Link></td></tr>}
            </tbody>
          </table>
        </div>
        {app.notes && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Notes</h3>
            <p className="whitespace">{app.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
