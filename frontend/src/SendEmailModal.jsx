import { useState } from 'react'
import { X } from 'lucide-react'
import { downloadExport } from './api'
import { useToast } from './ToastContext'

function safeFilename(name, fallback) {
  const base = (name || fallback).replace(/[^\w\-.\s]/g, '_').trim() || fallback
  return base.replace(/\s+/g, '_')
}

function buildMailto(to, subject, body) {
  const maxTotal = 1900
  let bodyEnc = body
  let qs = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyEnc)}`
  while (`mailto:${encodeURIComponent(to)}?${qs}`.length > maxTotal && bodyEnc.length > 80) {
    bodyEnc = bodyEnc.slice(0, Math.floor(bodyEnc.length * 0.85)).trimEnd() + '…'
    qs = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyEnc)}`
  }
  return `mailto:${encodeURIComponent(to)}?${qs}`
}

export function SendEmailModal({ open, onClose, type, id, title }) {
  const [toEmail, setToEmail] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const { addToast } = useToast()

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()
    const to = toEmail.trim()
    if (!to || !to.includes('@')) {
      addToast('Please enter a valid email address.', 'error')
      return
    }
    setBusy(true)
    try {
      const pdfPath = type === 'cv' ? `/cvs/${id}/export/pdf/` : `/letters/${id}/export/pdf/`
      const fileStem = type === 'cv' ? `${safeFilename(title, 'CV')}_CV` : `${safeFilename(title, 'Letter')}`
      await downloadExport(pdfPath, `${fileStem}.pdf`)

      const subject = type === 'cv' ? `Your CV: ${title}` : `${title}`
      const defaultBody =
        type === 'cv'
          ? 'Please find my CV attached as a PDF.'
          : 'Please find my letter attached as a PDF.'
      let body = message.trim() ? `${message.trim()}\n\n${defaultBody}` : defaultBody
      body +=
        '\n\n(A PDF was saved to your device — attach it here before sending if your email app did not add it automatically.)'

      window.location.href = buildMailto(to, subject, body)
      addToast('PDF saved. Your email app should open next.', 'success')
      setToEmail('')
      setMessage('')
      onClose()
    } catch (err) {
      addToast(err?.message || 'Could not prepare email.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3>Send by email</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <p className="modal__sub">
          Downloads &quot;{title}&quot; as a PDF, then opens your email app with the recipient and message filled in so you can attach the file and send.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Recipient email</label>
            <input
              type="email"
              value={toEmail}
              onChange={e => setToEmail(e.target.value)}
              placeholder="recipient@example.com"
              className="form-control"
              required
            />
          </div>
          <div className="form-group">
            <label>Message (optional)</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Optional text at the top of the email…"
              className="form-control"
              rows={3}
            />
          </div>
          <div className="modal__actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Preparing…' : 'Send email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
