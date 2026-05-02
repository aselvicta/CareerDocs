import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FileText, Pencil, FileDown, Trash2, Mail, Copy, Eye, History, RotateCcw, Share2, Link2 } from 'lucide-react'
import { api, downloadExport } from '../api'
import { useToast } from '../ToastContext'
import { SendEmailModal } from '../SendEmailModal'
import { PdfPreviewModal } from '../PdfPreviewModal'

export function CVDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cv, setCv] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(null)
  const [duplicating, setDuplicating] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
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

  return (
    <div className="page">
      <div className="page-header page-header--row">
        <h1>{cv.title}</h1>
        <div className="btn-group">
          <Link to={`/cv/${id}/edit`} className="btn btn-primary"><Pencil size={18} /> Edit</Link>
          <button type="button" className="btn btn-secondary" onClick={() => setPreviewOpen(true)} title="Preview PDF">
            <Eye size={18} /> Preview
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleDuplicate} disabled={duplicating} title="Duplicate this CV">
            <Copy size={18} /> {duplicating ? '…' : 'Duplicate'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => handleExport('pdf', `${cv.title.replace(/\s/g, '_')}_CV.pdf`)} disabled={!!downloading}>
            <FileDown size={18} /> {downloading === 'pdf' ? '…' : 'PDF'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => handleExport('docx', `${cv.title.replace(/\s/g, '_')}_CV.docx`)} disabled={!!downloading}>
            <FileDown size={18} /> {downloading === 'docx' ? '…' : 'Word'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setEmailModalOpen(true)}><Mail size={18} /> Send email</button>
          <button type="button" className="btn btn-secondary" onClick={handleShare} disabled={sharing} title={cv.share_token ? 'Copy link or disable sharing' : 'Enable public sharing'}>
            <Share2 size={18} /> {cv.share_token ? 'Shared' : 'Share'}
          </button>
          <Link to={`/cv/${id}/delete`} className="btn btn-danger"><Trash2 size={18} /> Delete</Link>
        </div>
      </div>
      <SendEmailModal open={emailModalOpen} onClose={() => setEmailModalOpen(false)} type="cv" id={id} title={cv?.title || 'CV'} />
      <PdfPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} pdfPath={`/cvs/${id}/export/pdf/`} title={`Preview: ${cv?.title || 'CV'}`} />
      <p className="meta">Template: {cv.template_display} · Updated {new Date(cv.updated_at).toLocaleDateString()}{cv.share_url && ' · '}<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>{cv.share_url && (<><Link2 size={12} /><button type="button" className="btn btn-ghost" style={{ padding: '0 0.25rem', fontSize: '0.85rem' }} onClick={copyShareUrl}>Copy share link</button></>)}</span></p>
      <div className="card card--detail">
        <h2 className="cv-name">{cv.full_name || 'Name'}</h2>
        <p className="cv-contact">{[cv.email, cv.phone, cv.location].filter(Boolean).join(' · ')}</p>
        {cv.summary && (<><h3>Summary</h3><p className="whitespace">{cv.summary}</p></>)}
        {(cv.experience_structured && cv.experience_structured.length > 0) ? (
          <><h3>Experience</h3>{cv.experience_structured.map((e, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <strong>{e.role}{e.company ? ` at ${e.company}` : ''}</strong>
              {(e.start_date || e.end_date) && <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}> ({e.start_date || ''}–{e.current ? 'Present' : (e.end_date || '')})</span>}
              {e.location && <span style={{ color: 'var(--text-muted)' }}> · {e.location}</span>}
              {e.bullets && <p className="whitespace" style={{ margin: '0.25rem 0 0 0', paddingLeft: '1rem' }}>{e.bullets.split('\n').map((b, j) => b.trim() && <span key={j}>• {b}<br /></span>)}</p>}
            </div>
          ))}</>
        ) : cv.experience && (<><h3>Experience</h3><p className="whitespace">{cv.experience}</p></>)}
        {(cv.education_structured && cv.education_structured.length > 0) ? (
          <><h3>Education</h3>{cv.education_structured.map((e, i) => (
            <div key={i} style={{ marginBottom: '0.5rem' }}>
              <strong>{e.degree}{e.institution ? `, ${e.institution}` : ''}</strong>
              {(e.start_date || e.end_date) && <span style={{ color: 'var(--text-muted)' }}> ({e.start_date}–{e.end_date})</span>}
              {e.honors && <p className="whitespace" style={{ margin: 0 }}>{e.honors}</p>}
            </div>
          ))}</>
        ) : cv.education && (<><h3>Education</h3><p className="whitespace">{cv.education}</p></>)}
        {(cv.skills_structured && cv.skills_structured.length > 0) ? (
          <><h3>Skills</h3><p>{cv.skills_structured.map(s => s.category && s.items ? `${s.category}: ${s.items}` : s.items).filter(Boolean).join(' · ')}</p></>
        ) : cv.skills && (<><h3>Skills</h3><p className="whitespace">{cv.skills}</p></>)}
        {cv.certifications?.length > 0 && (<><h3>Certifications</h3><p>{cv.certifications.map(c => `${c.name}${c.issuer ? ` – ${c.issuer}` : ''}${c.date ? ` (${c.date})` : ''}`).join(' · ')}</p></>)}
        {cv.projects?.length > 0 && (<><h3>Projects</h3>{cv.projects.map((p, i) => <p key={i} className="whitespace">{p.name}{p.description ? ` – ${p.description}` : ''}{p.tech ? ` [${p.tech}]` : ''}</p>)}</>)}
        {cv.languages?.length > 0 && (<><h3>Languages</h3><p>{cv.languages.map(l => `${l.language} (${l.proficiency || '-'})`).join(', ')}</p></>)}
        {cv.awards?.length > 0 && (<><h3>Awards</h3><p>{cv.awards.map(a => `${a.name}${a.issuer ? ` – ${a.issuer}` : ''}`).join(' · ')}</p></>)}
        {cv.references?.length > 0 && (<><h3>References</h3>{cv.references.map((r, i) => <p key={i}>{r.name}, {r.title} at {r.company}{r.email ? ` · ${r.email}` : ''}</p>)}</>)}
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
