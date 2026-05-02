import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Mail, Pencil, FileDown, Trash2, Send, Copy, Eye, History, RotateCcw } from 'lucide-react'
import { api, downloadExport } from '../api'
import { useToast } from '../ToastContext'
import { SendEmailModal } from '../SendEmailModal'
import { PdfPreviewModal } from '../PdfPreviewModal'

export function LetterDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [letter, setLetter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(null)
  const [duplicating, setDuplicating] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [revisions, setRevisions] = useState([])
  const [revisionsOpen, setRevisionsOpen] = useState(false)
  const [reverting, setReverting] = useState(null)
  const { addToast } = useToast()

  useEffect(() => {
    api.get(`/letters/${id}/`).then(setLetter).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (revisionsOpen && id) {
      api.get(`/letters/${id}/revisions/`).then(setRevisions).catch(() => setRevisions([]))
    }
  }, [revisionsOpen, id])

  async function handleRevert(revId) {
    setReverting(revId)
    try {
      const data = await api.post(`/letters/${id}/revert/${revId}/`)
      setLetter(data)
      addToast('Reverted to previous version.', 'success')
    } catch (e) {
      addToast(e?.message || 'Revert failed.', 'error')
    } finally {
      setReverting(null)
    }
  }

  async function handleExport(format, filename) {
    setDownloading(format)
    try {
      await downloadExport(`/letters/${id}/export/${format}/`, filename)
      addToast('Download started.', 'success')
    } catch (e) {
      addToast(e?.message || 'Download failed.', 'error')
    } finally {
      setDownloading(null)
    }
  }

  async function handleDuplicate() {
    setDuplicating(true)
    try {
      const data = await api.post(`/letters/${id}/duplicate/`)
      addToast('Letter duplicated.', 'success')
      navigate(`/letters/${data.id}`)
    } catch (e) {
      addToast(e?.message || 'Duplicate failed.', 'error')
    } finally {
      setDuplicating(false)
    }
  }

  if (loading) return <div className="page"><div className="loading-state"><p>Loading...</p></div></div>
  if (!letter) return <div className="page"><p>Letter not found.</p></div>

  return (
    <div className="page">
      <div className="page-header page-header--row">
        <h1>{letter.letter_type_display}{letter.title ? ` — ${letter.title}` : ''}</h1>
        <div className="btn-group">
          <Link to={`/letters/${id}/edit`} className="btn btn-primary"><Pencil size={18} /> Edit</Link>
          <button type="button" className="btn btn-secondary" onClick={() => setPreviewOpen(true)} title="Preview PDF">
            <Eye size={18} /> Preview
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleDuplicate} disabled={duplicating} title="Duplicate this letter">
            <Copy size={18} /> {duplicating ? '…' : 'Duplicate'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => handleExport('pdf', `${letter.letter_type_display.replace(/\s/g, '_')}_${id}.pdf`)} disabled={!!downloading}>
            <FileDown size={18} /> {downloading === 'pdf' ? '…' : 'PDF'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => handleExport('docx', `${letter.letter_type_display.replace(/\s/g, '_')}_${id}.docx`)} disabled={!!downloading}>
            <FileDown size={18} /> {downloading === 'docx' ? '…' : 'Word'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setEmailModalOpen(true)}><Send size={18} /> Send email</button>
          <Link to={`/letters/${id}/delete`} className="btn btn-danger"><Trash2 size={18} /> Delete</Link>
        </div>
      </div>
      <SendEmailModal open={emailModalOpen} onClose={() => setEmailModalOpen(false)} type="letter" id={id} title={letter?.letter_type_display + (letter?.title ? ` — ${letter.title}` : '') || 'Letter'} />
      <PdfPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} pdfPath={`/letters/${id}/export/pdf/`} title={`Preview: ${letter?.letter_type_display || 'Letter'}`} />
      <p className="meta">Updated {new Date(letter.updated_at).toLocaleDateString()}</p>
      <div className="card card--detail">
        {(letter.sender_name || letter.sender_email) && (
          <p className="letter-sender">{letter.sender_name} · {letter.sender_email} · {letter.sender_phone}</p>
        )}
        <p><strong>To:</strong> {letter.recipient_name}{letter.recipient_title ? `, ${letter.recipient_title}` : ''}</p>
        {letter.company && <p>{letter.company}</p>}
        <hr />
        <div className="whitespace">{letter.body}</div>
        <hr />
        <p>Sincerely,<br />{letter.sender_name}</p>
      </div>
      <section className="version-history">
        <button type="button" className="btn btn-ghost" onClick={() => setRevisionsOpen(!revisionsOpen)}>
          <History size={16} /> Version history
        </button>
        {revisionsOpen && (
          <div className="revisions-list">
            {revisions.length === 0 ? (
              <p className="muted">No previous versions. Revisions are saved each time you edit.</p>
            ) : (
              <ul>
                {revisions.map(rev => (
                  <li key={rev.id} className="revision-item">
                    <span>{new Date(rev.created_at).toLocaleString()}</span>
                    <button type="button" className="btn btn-secondary btn--sm" onClick={() => handleRevert(rev.id)} disabled={reverting === rev.id}>
                      <RotateCcw size={14} /> {reverting === rev.id ? '…' : 'Revert'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
