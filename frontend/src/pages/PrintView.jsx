import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { api } from '../api'
import { CVDocument } from '../cv/CVDocument'
import { LetterDocument } from '../cv/LetterDocument'
import '../cv/studio.css'

function fileTitle(...parts) {
  return parts.filter(Boolean).join(' ').trim().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '') || 'Document'
}

/**
 * Shows only the document and opens the browser's print dialog. "Save as PDF"
 * there gives a vector PDF with selectable text that matches the preview exactly.
 * The tab title becomes the suggested file name.
 */
function PrintShell({ loading, error, back, title, children }) {
  const printed = useRef(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (loading || error) return undefined
    const prev = document.title
    document.title = title
    document.documentElement.classList.add('is-print-view')
    let cancelled = false
    ;(document.fonts?.ready || Promise.resolve()).then(() => {
      if (cancelled) return
      // Stretch the page to whole A4 sheets so sidebars and bands reach the bottom edge.
      const doc = document.querySelector('.pv-page > .cvd')
      if (doc) {
        doc.style.minHeight = ''
        const pages = Math.max(1, Math.ceil((doc.scrollHeight - 2) / 1123))
        doc.style.minHeight = `${pages * 1122}px`
      }
      setReady(true)
      if (!printed.current && !new URLSearchParams(window.location.search).has('noprint')) {
        printed.current = true
        setTimeout(() => window.print(), 250)
      }
    })
    return () => {
      cancelled = true
      document.title = prev
      document.documentElement.classList.remove('is-print-view')
    }
  }, [loading, error, title])

  return (
    <div className="pv">
      <div className="pv-bar">
        <Link to={back} className="btn btn-ghost"><ArrowLeft size={16} /> Back</Link>
        <p className="pv-bar__tip">
          In the print dialog choose <strong>Save as PDF</strong> as the destination. Margins: Default. Background graphics: on.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => window.print()} disabled={!ready}>
          <Printer size={16} /> Save as PDF
        </button>
      </div>
      <div className="pv-page">
        {loading ? <p className="pv-msg">Preparing your document...</p> : error ? <p className="pv-msg">{error}</p> : children}
      </div>
    </div>
  )
}

export function CVPrint() {
  const { id } = useParams()
  const [cv, setCv] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => { api.get(`/cvs/${id}/`).then(setCv).catch(() => setError('CV not found.')) }, [id])
  return (
    <PrintShell loading={!cv && !error} error={error} back={`/cv/${id}`} title={fileTitle(cv?.full_name, 'CV')}>
      {cv && <CVDocument cv={cv} />}
    </PrintShell>
  )
}

export function LetterPrint() {
  const { id } = useParams()
  const [letter, setLetter] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => { api.get(`/letters/${id}/`).then(setLetter).catch(() => setError('Letter not found.')) }, [id])
  return (
    <PrintShell loading={!letter && !error} error={error} back={`/letters/${id}`}
      title={fileTitle(letter?.sender_name, letter?.letter_type === 'cover' ? 'Cover Letter' : 'Letter')}>
      {letter && <LetterDocument letter={letter} date={letter.updated_at} />}
    </PrintShell>
  )
}

export function PublicCVPrint() {
  const { token } = useParams()
  const [cv, setCv] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    api.get(`/view/cv/${token}/`, { public: true }).then(setCv).catch(() => setError('This CV link is invalid or has expired.'))
  }, [token])
  return (
    <PrintShell loading={!cv && !error} error={error} back={`/view/cv/${token}`} title={fileTitle(cv?.full_name, 'CV')}>
      {cv && <CVDocument cv={cv} />}
    </PrintShell>
  )
}
