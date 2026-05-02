import { useState } from 'react'
import { X } from 'lucide-react'
import { api } from './api'
import { useToast } from './ToastContext'

export function SendEmailModal({ open, onClose, type, id, title }) {
  const [toEmail, setToEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const { addToast } = useToast()

  if (!open) return null

  const endpoint = type === 'cv' ? `/cvs/${id}/send-email/` : `/letters/${id}/send-email/`

  async function handleSubmit(e) {
    e.preventDefault()
    if (!toEmail.trim() || !toEmail.includes('@')) {
      addToast('Please enter a valid email address.', 'error')
      return
    }
    setSending(true)
    try {
      await api.post(endpoint, { to_email: toEmail.trim(), message: message.trim() })
      addToast('Email sent successfully.', 'success')
      setToEmail('')
      setMessage('')
      onClose()
    } catch (err) {
      addToast(err?.message || 'Failed to send email.', 'error')
    } finally {
      setSending(false)
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
        <p className="modal__sub">Send &quot;{title}&quot; as a PDF attachment.</p>
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
              placeholder="Optional message in the email body..."
              className="form-control"
              rows={3}
            />
          </div>
          <div className="modal__actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? 'Sending…' : 'Send email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
