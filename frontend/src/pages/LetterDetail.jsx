import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FileText, Pencil, FileDown, Trash2, Send, Copy, History, RotateCcw, Palette } from 'lucide-react'
import { api, downloadExport } from '../api'
import { useToast } from '../ToastContext'
import { SendEmailModal } from '../SendEmailModal'
import { LetterDocument } from '../cv/LetterDocument'
import { ScaledDoc } from '../cv/ScaledDoc'
import { getTemplate } from '../cv/templates'
import '../cv/studio.css'

export function LetterDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [letter, setLetter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(null)
  const [duplicating, setDuplicating] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
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

  const t = getTemplate(letter.template)
  const fileBase = [letter.sender_name, letter.letter_type === 'cover' ? 'Cover_Letter' : 'Letter'].filter(Boolean).join('_').replace(/[^\p{L}\p{N}]+/gu, '_')

  return (
    <div className="dv">
      <div className="dv-head">
        <div className="dv-head__text">
          <Link to="/letters" className="dv-crumb">My letters</Link>
          <h1>{letter.title || letter.letter_type_display}</h1>
          <p className="dv-meta">{letter.letter_type_display}{letter.company ? ` to ${letter.company}` : ''} · {t.name} design · Updated {new Date(letter.updated_at).toLocaleDateString()}</p>
        </div>
        <div className="dv-actions">
          <Link to={`/letters/${id}/edit`} className="btn btn-secondary"><Pencil size={16} /> Edit</Link>
          <Link to={`/print/letter/${id}`} className="btn btn-primary"><FileDown size={16} /> Download PDF</Link>
        </div>
      </div>
      <SendEmailModal open={emailModalOpen} onClose={() => setEmailModalOpen(false)} type="letter" id={id} title={letter?.letter_type_display + (letter?.title ? `: ${letter.title}` : '') || 'Letter'} />

      <div className="dv-split">
        <div className="dv-doc">
          <ScaledDoc markers><LetterDocument letter={letter} date={letter.updated_at} /></ScaledDoc>
        </div>
        <aside className="dv-side">
          <section className="dv-card">
            <h2>Export</h2>
            <Link to={`/print/letter/${id}`} className="dv-item"><FileDown size={17} /><span><strong>PDF</strong><small>Pixel exact, selectable text</small></span></Link>
            <button type="button" className="dv-item" onClick={() => handleExport('docx', `${fileBase}.docx`)} disabled={!!downloading}>
              <FileText size={17} /><span><strong>{downloading === 'docx' ? 'Preparing...' : 'Word (.docx)'}</strong><small>Editable in Word or Google Docs</small></span>
            </button>
            <button type="button" className="dv-item" onClick={() => setEmailModalOpen(true)}>
              <Send size={17} /><span><strong>Send by email</strong><small>Attach it to a message</small></span>
            </button>
          </section>
          <section className="dv-card">
            <h2>More</h2>
            <Link to={`/letters/${id}/edit`} state={{ tab: 'design' }} className="dv-item dv-item--plain"><Palette size={17} /><span>Change design or colours</span></Link>
            <button type="button" className="dv-item dv-item--plain" onClick={handleDuplicate} disabled={duplicating}><Copy size={17} /><span>{duplicating ? 'Duplicating...' : 'Duplicate for another job'}</span></button>
            <button type="button" className="dv-item dv-item--plain" onClick={() => setRevisionsOpen(!revisionsOpen)}><History size={17} /><span>Version history</span></button>
            {revisionsOpen && (
              <div className="dv-revs">
                {revisions.length === 0 ? <p className="dv-note">No earlier versions yet. One is saved each time you save.</p> : (
                  <ul>
                    {revisions.map(rev => (
                      <li key={rev.id}>
                        <span>{new Date(rev.created_at).toLocaleString()}</span>
                        <button type="button" className="btn btn-ghost btn--sm" onClick={() => handleRevert(rev.id)} disabled={reverting === rev.id}>
                          <RotateCcw size={14} /> {reverting === rev.id ? '...' : 'Restore'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <Link to={`/letters/${id}/delete`} className="dv-item dv-item--plain dv-item--danger"><Trash2 size={17} /><span>Delete letter</span></Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
