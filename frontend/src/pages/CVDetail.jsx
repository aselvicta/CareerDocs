import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FileText, Pencil, FileDown, Trash2, Mail, Copy, History, RotateCcw, Share2, Link2, Palette } from 'lucide-react'
import { api, downloadExport } from '../api'
import { useToast } from '../ToastContext'
import { SendEmailModal } from '../SendEmailModal'
import { CVDocument } from '../cv/CVDocument'
import { ScaledDoc } from '../cv/ScaledDoc'
import { getTemplate } from '../cv/templates'
import '../cv/studio.css'

export function CVDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cv, setCv] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(null)
  const [duplicating, setDuplicating] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [revisions, setRevisions] = useState([])
  const [revisionsOpen, setRevisionsOpen] = useState(false)
  const [reverting, setReverting] = useState(null)
  const [sharing, setSharing] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    api.get(`/cvs/${id}/`).then(setCv).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (revisionsOpen && id) {
      api.get(`/cvs/${id}/revisions/`).then(setRevisions).catch(() => setRevisions([]))
    }
  }, [revisionsOpen, id])

  async function handleRevert(revId) {
    setReverting(revId)
    try {
      const data = await api.post(`/cvs/${id}/revert/${revId}/`)
      setCv(data)
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
      await downloadExport(`/cvs/${id}/export/${format}/`, filename)
      addToast('Download started.', 'success')
    } catch (e) {
      addToast(e?.message || 'Download failed.', 'error')
    } finally {
      setDownloading(null)
    }
  }

  async function handleShare() {
    setSharing(true)
    try {
      const data = cv.share_token ? await api.delete(`/cvs/${id}/share/`) : await api.post(`/cvs/${id}/share/`)
      setCv(data)
      if (data.share_url) {
        navigator.clipboard?.writeText(data.share_url)
        addToast('Share link copied to clipboard.', 'success')
      } else {
        addToast('Sharing disabled.', 'success')
      }
    } catch (e) {
      addToast(e?.message || 'Failed.', 'error')
    } finally {
      setSharing(false)
    }
  }

  function copyShareUrl() {
    if (cv?.share_url) {
      navigator.clipboard?.writeText(cv.share_url)
      addToast('Copied.', 'success')
    }
  }

  async function handleDuplicate() {
    setDuplicating(true)
    try {
      const data = await api.post(`/cvs/${id}/duplicate/`)
      addToast('CV duplicated.', 'success')
      navigate(`/cv/${data.id}`)
    } catch (e) {
      addToast(e?.message || 'Duplicate failed.', 'error')
    } finally {
      setDuplicating(false)
    }
  }

  if (loading) return <div className="page"><div className="loading-state"><p>Loading...</p></div></div>
  if (!cv) return <div className="page"><p>CV not found.</p></div>

  const t = getTemplate(cv.template)
  const fileBase = (cv.full_name || cv.title || 'CV').replace(/[^\p{L}\p{N}]+/gu, '_')

  return (
    <div className="dv">
      <div className="dv-head">
        <div className="dv-head__text">
          <Link to="/cv" className="dv-crumb">My CVs</Link>
          <h1>{cv.title}</h1>
          <p className="dv-meta">{t.name} template · Updated {new Date(cv.updated_at).toLocaleDateString()}</p>
        </div>
        <div className="dv-actions">
          <Link to={`/cv/${id}/edit`} className="btn btn-secondary"><Pencil size={16} /> Edit</Link>
          <Link to={`/print/cv/${id}`} className="btn btn-primary"><FileDown size={16} /> Download PDF</Link>
        </div>
      </div>
      <SendEmailModal open={emailModalOpen} onClose={() => setEmailModalOpen(false)} type="cv" id={id} title={cv?.title || 'CV'} />

      <div className="dv-split">
        <div className="dv-doc">
          <ScaledDoc markers><CVDocument cv={cv} /></ScaledDoc>
        </div>
        <aside className="dv-side">
          <section className="dv-card">
            <h2>Export</h2>
            <Link to={`/print/cv/${id}`} className="dv-item"><FileDown size={17} /><span><strong>PDF</strong><small>Pixel exact, selectable text</small></span></Link>
            <button type="button" className="dv-item" onClick={() => handleExport('docx', `${fileBase}_CV.docx`)} disabled={!!downloading}>
              <FileText size={17} /><span><strong>{downloading === 'docx' ? 'Preparing...' : 'Word (.docx)'}</strong><small>Editable in Word or Google Docs</small></span>
            </button>
            <button type="button" className="dv-item" onClick={() => setEmailModalOpen(true)}>
              <Mail size={17} /><span><strong>Send by email</strong><small>Attach it to a message</small></span>
            </button>
          </section>

          <section className="dv-card">
            <h2>Share link</h2>
            {cv.share_url ? (
              <>
                <div className="dv-share">
                  <input readOnly value={cv.share_url} onFocus={e => e.target.select()} aria-label="Share link" />
                  <button type="button" className="btn btn-secondary btn--sm" onClick={copyShareUrl}><Link2 size={14} /> Copy</button>
                </div>
                <button type="button" className="dv-link" onClick={handleShare} disabled={sharing}>Turn off sharing</button>
              </>
            ) : (
              <>
                <p className="dv-note">Anyone with the link can view this CV. You can turn it off any time.</p>
                <button type="button" className="btn btn-secondary btn--sm" onClick={handleShare} disabled={sharing}><Share2 size={14} /> Create share link</button>
              </>
            )}
          </section>

          <section className="dv-card">
            <h2>More</h2>
            <Link to={`/cv/${id}/edit`} state={{ tab: 'design' }} className="dv-item dv-item--plain"><Palette size={17} /><span>Change template or colours</span></Link>
            <Link to={`/letters/new?template=${cv.template}${cv.design?.accent ? `&accent=${encodeURIComponent(cv.design.accent)}` : ''}&cv=${id}`} className="dv-item dv-item--plain"><Mail size={17} /><span>Write a matching cover letter</span></Link>
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
            <Link to={`/cv/${id}/delete`} className="dv-item dv-item--plain dv-item--danger"><Trash2 size={17} /><span>Delete CV</span></Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
