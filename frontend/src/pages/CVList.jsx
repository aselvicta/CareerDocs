import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Plus, Pencil, FileDown, Trash2, LayoutTemplate, Mail } from 'lucide-react'
import { api, downloadExport } from '../api'
import { useToast } from '../ToastContext'
import { SendEmailModal } from '../SendEmailModal'

export function CVList() {
  const [cvs, setCvs] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(null)
  const [emailModal, setEmailModal] = useState({ open: false, id: null, title: '' })
  const { addToast } = useToast()

  useEffect(() => {
    api.get('/cvs/').then(data => setCvs(Array.isArray(data) ? data : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function handleExport(id, format, filename) {
    const key = `${id}-${format}`
    setDownloading(key)
    try {
      await downloadExport(`/cvs/${id}/export/${format}/`, filename)
      addToast('Download started.', 'success')
    } catch (e) {
      addToast(e?.message || 'Download failed.', 'error')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-state"><p>Loading...</p></div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header page-header--row">
        <h1>My CVs</h1>
        <Link to="/cv/templates" className="btn btn-primary">
          <Plus size={18} /> New CV
        </Link>
      </div>
      {cvs.length ? (
        <div className="card-list">
          {cvs.map(cv => (
            <article key={cv.id} className="card card--hover">
              <div className="card__main">
                <h2 className="card__title">
                  <Link to={`/cv/${cv.id}`}><FileText size={20} /> {cv.title}</Link>
                </h2>
                <p className="card__meta">Template: {cv.template_display} · Updated {new Date(cv.updated_at).toLocaleDateString()}</p>
              </div>
              <div className="card__actions">
                <Link to={`/cv/${cv.id}/edit`} className="btn btn-ghost btn-sm"><Pencil size={14} /> Edit</Link>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleExport(cv.id, 'pdf', `${cv.title.replace(/\s/g, '_')}_CV.pdf`)}
                  disabled={downloading === `${cv.id}-pdf`}
                >
                  <FileDown size={14} /> {downloading === `${cv.id}-pdf` ? '…' : 'PDF'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleExport(cv.id, 'docx', `${cv.title.replace(/\s/g, '_')}_CV.docx`)}
                  disabled={downloading === `${cv.id}-docx`}
                >
                  <FileDown size={14} /> {downloading === `${cv.id}-docx` ? '…' : 'Word'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEmailModal({ open: true, id: cv.id, title: cv.title })}>
                  <Mail size={14} /> Send email
                </button>
                <Link to={`/cv/${cv.id}/delete`} className="btn btn-ghost btn-sm btn-danger"><Trash2 size={14} /> Delete</Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-block">
          <LayoutTemplate size={48} className="empty-block__icon" />
          <p>No CVs yet.</p>
          <Link to="/cv/templates" className="btn btn-primary">Choose a template to get started</Link>
        </div>
      )}
      <SendEmailModal
        open={emailModal.open}
        onClose={() => setEmailModal({ open: false, id: null, title: '' })}
        type="cv"
        id={emailModal.id}
        title={emailModal.title || 'CV'}
      />
    </div>
  )
}
