import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Trash2, Link2Off, ExternalLink } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../ToastContext'
import { fmtDateTime, humanize } from './format'

const HIDDEN = new Set(['id', '_owner', 'share_token', 'user'])
const KIND_NAME = { cvs: 'CV', letters: 'letter', applications: 'application' }

function Value({ v }) {
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return <span className="muted">Not set</span>
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (Array.isArray(v)) {
    return (
      <ul className="admin-value-list">
        {v.map((item, i) => (
          <li key={i}>
            {item && typeof item === 'object'
              ? Object.entries(item).filter(([, x]) => x !== '' && x != null && !(Array.isArray(x) && !x.length))
                .map(([k, x]) => <div key={k}><span className="muted">{humanize(k)}:</span> {Array.isArray(x) ? x.join(' • ') : String(x)}</div>)
              : String(item)}
          </li>
        ))}
      </ul>
    )
  }
  if (typeof v === 'object') return <pre className="admin-pre">{JSON.stringify(v, null, 2)}</pre>
  if (/^\d{4}-\d{2}-\d{2}T/.test(String(v))) return fmtDateTime(v)
  return <span className="admin-pre-wrap">{String(v)}</span>
}

/** Read-only view of any CV / letter / application, with admin delete + revoke-share. */
export function ContentModal({ kind, id, onClose, onChanged }) {
  const { addToast } = useToast()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get(`/admin/content/${kind}/${id}/`).then(setData).catch(e => setError(e.message))
  }, [kind, id])

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function remove() {
    if (!window.confirm(`Delete this ${KIND_NAME[kind]} permanently? The owner will lose it.`)) return
    setBusy(true)
    try {
      await api.delete(`/admin/content/${kind}/${id}/`)
      addToast('Deleted.', 'success')
      onChanged?.()
      onClose()
    } catch (e) {
      addToast(e.message, 'error')
      setBusy(false)
    }
  }

  async function revoke() {
    setBusy(true)
    try {
      await api.post(`/admin/cvs/${id}/revoke-share/`)
      setData(d => ({ ...d, share_url: null, share_token: null }))
      addToast('Public link revoked.', 'success')
      onChanged?.()
    } catch (e) {
      addToast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const title = data ? data.title || data.job_title || humanize(data.letter_type) : 'Loading…'
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal admin-modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3>{title}</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="admin-modal__body">
          {error && <p className="error">{error}</p>}
          {!data && !error && <p className="muted">Loading…</p>}
          {data && (
            <>
              <p className="muted">
                {humanize(KIND_NAME[kind])} #{data.id} owned by{' '}
                <Link to={`/admin/users/${data._owner.id}`} onClick={onClose}>{data._owner.email}</Link>
              </p>
              <div className="btn-group admin-modal__actions">
                {data.share_url && (
                  <>
                    <a className="btn btn-secondary btn-sm" href={data.share_url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open public link</a>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={revoke}><Link2Off size={14} /> Revoke link</button>
                  </>
                )}
                <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={remove}><Trash2 size={14} /> Delete</button>
              </div>
              <table className="detail-table admin-detail">
                <tbody>
                  {Object.entries(data).filter(([k]) => !HIDDEN.has(k)).map(([k, v]) => (
                    <tr key={k}><td className="detail-table__label">{humanize(k)}</td><td><Value v={v} /></td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
