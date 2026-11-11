import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Copy, Eye, FileDown, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, downloadExport } from '../api'
import { useToast } from '../ToastContext'
import { LetterDocument } from '../cv/LetterDocument'
import { ScaledDoc } from '../cv/ScaledDoc'
import { CardMenu, LibraryPager, LibraryToolbar } from '../shell/Library'
import { useLibrary } from '../shell/useLibrary'
import { ConfirmDialog } from '../shell/Modal'
import { relativeTime } from '../shell/format'
import '../cv/studio.css'

export function LetterList() {
  const lib = useLibrary('/letters/')
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)

  async function duplicate(l) {
    try {
      const data = await api.post(`/letters/${l.id}/duplicate/`)
      addToast('Copy created.', 'success')
      navigate(`/letters/${data.id}/edit`)
    } catch (e) { addToast(e?.message || 'Could not duplicate.', 'error') }
  }
  async function remove() {
    setBusy(true)
    try {
      await api.delete(`/letters/${toDelete.id}/`)
      addToast('Letter deleted.', 'success')
      setToDelete(null)
      lib.reload()
    } catch (e) { addToast(e?.message || 'Delete failed.', 'error') } finally { setBusy(false) }
  }
  async function word(l) {
    try { await downloadExport(`/letters/${l.id}/export/docx/`, `${(l.title || 'Letter').replace(/\s+/g, '_')}.docx`) } catch (e) { addToast(e?.message || 'Download failed.', 'error') }
  }

  const empty = !lib.initialLoading && lib.total === 0 && !lib.q

  return (
    <div>
      <div className="pg-head">
        <div>
          <h1 className="pg-title">Cover letters</h1>
          <p className="pg-sub">Cover letters, internship and job application letters, references and resignations, designed to match your CV.</p>
        </div>
        <div className="pg-actions">
          <Link to="/letters/templates" className="btn btn-primary"><Plus size={16} /> New letter</Link>
        </div>
      </div>

      {empty ? (
        <div className="empty">
          <div className="empty__art" aria-hidden />
          <h2>No letters yet</h2>
          <p>Pick the design that matches your CV, add the employer, and let AI draft a letter tailored to the advert.</p>
          <div className="empty__actions"><Link to="/letters/templates" className="btn btn-primary"><Plus size={16} /> Write a cover letter</Link></div>
        </div>
      ) : (
        <>
          <LibraryToolbar lib={lib} placeholder="Search by title, company or recipient" noun="letter" />
          {lib.initialLoading ? (
            <div className="doc-grid">{[0, 1, 2, 3].map(i => <div key={i} className="skel" style={{ aspectRatio: '794 / 1000' }} />)}</div>
          ) : lib.items.length === 0 ? (
            <p className="pg-sub">No letters match "{lib.q}".</p>
          ) : (
            <div className="doc-grid" style={{ opacity: lib.loading ? 0.6 : 1 }}>
              {!lib.q && lib.page === 1 && (
                <div className="doc-card doc-card--new">
                  <Link to="/letters/templates" className="doc-card__thumb"><Plus size={22} /> New letter<small>Matches your CV</small></Link>
                </div>
              )}
              {lib.items.map(l => (
                <div key={l.id} className="doc-card">
                  <Link to={`/letters/${l.id}/edit`} className="doc-card__thumb" aria-label={`Edit ${l.title || 'letter'}`}>
                    <div className="doc-card__page"><ScaledDoc clip><LetterDocument letter={l} date={l.updated_at} /></ScaledDoc></div>
                  </Link>
                  <div className="doc-card__meta">
                    <div className="doc-card__text">
                      <Link to={`/letters/${l.id}`} className="doc-card__title">{l.title || l.letter_type_display}</Link>
                      <div className="doc-card__sub">{[l.company, l.letter_type_display].filter(Boolean).join(' · ')} · {relativeTime(l.updated_at)}</div>
                    </div>
                    <CardMenu items={[
                      { icon: Pencil, label: 'Edit', to: `/letters/${l.id}/edit` },
                      { icon: Eye, label: 'Open', to: `/letters/${l.id}` },
                      { icon: FileDown, label: 'Download PDF', to: `/print/letter/${l.id}` },
                      { icon: FileText, label: 'Download Word', onClick: () => word(l) },
                      { icon: Copy, label: 'Duplicate', onClick: () => duplicate(l) },
                      { icon: Trash2, label: 'Delete', onClick: () => setToDelete(l), danger: true },
                    ]} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <LibraryPager lib={lib} noun="letters" />
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this letter?"
        body={<>"{toDelete?.title || toDelete?.letter_type_display}" will be deleted. This cannot be undone.</>}
        busy={busy}
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </div>
  )
}
