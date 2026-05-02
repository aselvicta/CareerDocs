import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Plus, Pencil, FileDown, Trash2, Send } from 'lucide-react'
import { api, downloadExport } from '../api'
import { useToast } from '../ToastContext'
import { SendEmailModal } from '../SendEmailModal'

export function LetterList() {
  const [letters, setLetters] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(null)
  const [emailModal, setEmailModal] = useState({ open: false, id: null, title: '' })
  const { addToast } = useToast()

  useEffect(() => {
    api.get('/letters/').then(data => setLetters(Array.isArray(data) ? data : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function handleExport(id, format, filename) {
    const key = `${id}-${format}`
    setDownloading(key)
    try {
      await downloadExport(`/letters/${id}/export/${format}/`, filename)
      addToast('Download started.', 'success')
    } catch (e) {
      addToast(e?.message || 'Download failed.', 'error')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) return <div className="page"><div className="loading-state"><p>Loading...</p></div></div>

  return (
    <div className="page">
      <div className="page-header page-header--row">
        <h1>My Letters</h1>
        <Link to="/letters/new" className="btn btn-primary"><Plus size={18} /> New letter</Link>
      </div>
      {letters.length ? (
        <div className="card-list">
          {letters.map(l => (
            <article key={l.id} className="card card--hover">
              <div className="card__main">
                <h2 className="card__title">
                  <Link to={`/letters/${l.id}`}><Mail size={20} /> {l.letter_type_display}{l.title ? ` — ${l.title}` : ''}</Link>
                </h2>
                <p className="card__meta">To: {l.recipient_name || '—'} · {l.company || ''} · {new Date(l.updated_at).toLocaleDateString()}</p>
              </div>
              <div className="card__actions">
                <Link to={`/letters/${l.id}/edit`} className="btn btn-ghost btn-sm"><Pencil size={14} /> Edit</Link>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleExport(l.id, 'pdf', `${l.letter_type_display.replace(/\s/g, '_')}_${l.id}.pdf`)} disabled={downloading === `${l.id}-pdf`}>
                  <FileDown size={14} /> {downloading === `${l.id}-pdf` ? '…' : 'PDF'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleExport(l.id, 'docx', `${l.letter_type_display.replace(/\s/g, '_')}_${l.id}.docx`)} disabled={downloading === `${l.id}-docx`}>
                  <FileDown size={14} /> {downloading === `${l.id}-docx` ? '…' : 'Word'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEmailModal({ open: true, id: l.id, title: l.letter_type_display + (l.title ? ` — ${l.title}` : '') })}>
                  <Send size={14} /> Send email
                </button>
                <Link to={`/letters/${l.id}/delete`} className="btn btn-ghost btn-sm btn-danger"><Trash2 size={14} /> Delete</Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-block">
          <Mail size={48} className="empty-block__icon" />
          <p>No letters yet.</p>
          <Link to="/letters/new" className="btn btn-primary">Create a letter</Link>
        </div>
      )}
      <SendEmailModal
        open={emailModal.open}
        onClose={() => setEmailModal({ open: false, id: null, title: '' })}
        type="letter"
        id={emailModal.id}
        title={emailModal.title || 'Letter'}
      />
    </div>
  )
}
