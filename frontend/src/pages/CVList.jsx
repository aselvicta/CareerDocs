import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Copy, Eye, FileDown, FileText, FileUp, Mail, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, downloadExport } from '../api'
import { useToast } from '../ToastContext'
import { CVDocument } from '../cv/CVDocument'
import { ScaledDoc } from '../cv/ScaledDoc'
import { getTemplate } from '../cv/templates'
import { CardMenu, LibraryPager, LibraryToolbar } from '../shell/Library'
import { useLibrary } from '../shell/useLibrary'
import { ConfirmDialog } from '../shell/Modal'
import { useShell } from '../shell/shellContext'
import { relativeTime } from '../shell/format'
import '../cv/studio.css'

export function CVList() {
  const lib = useLibrary('/cvs/')
  const { openImport } = useShell()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)

  async function duplicate(cv) {
    try {
      const data = await api.post(`/cvs/${cv.id}/duplicate/`)
      addToast('Copy created. Rename it for the job you are applying to.', 'success')
      navigate(`/cv/${data.id}/edit`)
    } catch (e) { addToast(e?.message || 'Could not duplicate.', 'error') }
  }
  async function remove() {
    setBusy(true)
    try {
      await api.delete(`/cvs/${toDelete.id}/`)
      addToast('CV deleted.', 'success')
      setToDelete(null)
      lib.reload()
    } catch (e) { addToast(e?.message || 'Delete failed.', 'error') } finally { setBusy(false) }
  }
  async function word(cv) {
    try { await downloadExport(`/cvs/${cv.id}/export/docx/`, `${(cv.full_name || cv.title).replace(/\s+/g, '_')}_CV.docx`) } catch (e) { addToast(e?.message || 'Download failed.', 'error') }
  }

  const empty = !lib.initialLoading && lib.total === 0 && !lib.q

  return (
    <div>
      <div className="pg-head">
        <div>
          <h1 className="pg-title">CVs</h1>
          <p className="pg-sub">Keep one CV per kind of role. Duplicate it, tailor it to each advert and track where you sent it.</p>
        </div>
        <div className="pg-actions">
          <button type="button" className="btn btn-secondary" onClick={openImport}><FileUp size={16} /> Import</button>
          <Link to="/cv/templates" className="btn btn-primary"><Plus size={16} /> New CV</Link>
        </div>
      </div>

      {empty ? (
        <div className="empty">
          <div className="empty__art" aria-hidden />
          <h2>Build your first CV</h2>
          <p>Choose a design and fill it in with a live preview, or import the CV you already have from Word or PDF.</p>
          <div className="empty__actions">
            <Link to="/cv/templates" className="btn btn-primary"><Plus size={16} /> Choose a template</Link>
            <button type="button" className="btn btn-secondary" onClick={openImport}><FileUp size={16} /> Import Word or PDF</button>
          </div>
        </div>
      ) : (
        <>
          <LibraryToolbar lib={lib} placeholder="Search CVs by name or title" noun="CV" />
          {lib.initialLoading ? (
            <div className="doc-grid">{[0, 1, 2, 3].map(i => <div key={i} className="skel" style={{ aspectRatio: '794 / 1000' }} />)}</div>
          ) : lib.items.length === 0 ? (
            <p className="pg-sub">No CVs match "{lib.q}".</p>
          ) : (
            <div className="doc-grid" style={{ opacity: lib.loading ? 0.6 : 1 }}>
              {!lib.q && lib.page === 1 && (
                <div className="doc-card doc-card--new">
                  <Link to="/cv/templates" className="doc-card__thumb"><Plus size={22} /> New CV<small>Pick a template</small></Link>
                </div>
              )}
              {lib.items.map(cv => (
                <div key={cv.id} className="doc-card">
                  {cv.share_url && <span className="doc-card__badge">Shared</span>}
                  <Link to={`/cv/${cv.id}/edit`} className="doc-card__thumb" aria-label={`Edit ${cv.title}`}>
                    <div className="doc-card__page"><ScaledDoc clip><CVDocument cv={cv} /></ScaledDoc></div>
                  </Link>
                  <div className="doc-card__meta">
                    <div className="doc-card__text">
                      <Link to={`/cv/${cv.id}`} className="doc-card__title">{cv.title}</Link>
                      <div className="doc-card__sub">{getTemplate(cv.template).name} · edited {relativeTime(cv.updated_at)}</div>
                    </div>
                    <CardMenu items={[
                      { icon: Pencil, label: 'Edit', to: `/cv/${cv.id}/edit` },
                      { icon: Eye, label: 'Open', to: `/cv/${cv.id}` },
                      { icon: FileDown, label: 'Download PDF', to: `/print/cv/${cv.id}` },
                      { icon: FileText, label: 'Download Word', onClick: () => word(cv) },
                      { icon: Copy, label: 'Duplicate', onClick: () => duplicate(cv) },
                      { icon: Mail, label: 'Matching cover letter', to: `/letters/new?template=${cv.template}&cv=${cv.id}${cv.design?.accent ? `&accent=${encodeURIComponent(cv.design.accent)}` : ''}` },
                      { icon: Trash2, label: 'Delete', onClick: () => setToDelete(cv), danger: true },
                    ]} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <LibraryPager lib={lib} noun="CVs" />
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this CV?"
        body={<>"{toDelete?.title}" and its version history will be deleted. Applications that used it will keep their other details. This cannot be undone.</>}
        busy={busy}
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </div>
  )
}
