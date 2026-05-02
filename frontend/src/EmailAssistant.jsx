import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, X, Send, Copy, FileEdit } from 'lucide-react'
import { api } from './api'
import { useToast } from './ToastContext'
import { useEmailDraft } from './EmailDraftContext'

export function EmailAssistant() {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const { addToast } = useToast()
  const { setEmailDraft } = useEmailDraft()
  const navigate = useNavigate()

  async function handleWrite() {
    if (!prompt.trim()) { addToast('Describe your situation first.', 'error'); return }
    setLoading(true)
    setResult(null)
    try {
      const data = await api.post('/ai/write-email/', { situation: prompt.trim() })
      setResult({ subject: data.subject || '', body: data.body || '' })
      addToast('Email draft ready.', 'success')
    } catch (e) {
      addToast(e?.message || 'Failed to generate.', 'error')
    } finally {
      setLoading(false)
    }
  }

  function useInComposer() {
    if (result) {
      setEmailDraft(result.subject, result.body)
      navigate('/compose')
      setOpen(false)
      setResult(null)
      setPrompt('')
      addToast('Draft added to composer.', 'success')
    }
  }

  function copyToClipboard() {
    if (!result) return
    const text = `Subject: ${result.subject}\n\n${result.body}`
    navigator.clipboard.writeText(text).then(() => addToast('Copied to clipboard.', 'success')).catch(() => addToast('Copy failed.', 'error'))
  }

  return (
    <>
      <button
        type="button"
        className="fab fab--right"
        onClick={() => setOpen(!open)}
        aria-label="Email assistant"
        title="AI email assistant"
      >
        <Mail size={24} />
      </button>
      {open && (
        <div className="fab-panel fab-panel--right">
          <div className="fab-panel__header">
            <h3>Email assistant</h3>
            <button type="button" className="fab-panel__close" onClick={() => setOpen(false)} aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <p className="fab-panel__hint">Describe your situation and the assistant will write a full email (subject + body).</p>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. I am applying for a software engineer role at Company X. I have 3 years of experience..."
            className="form-control"
            rows={4}
          />
          <button type="button" className="btn btn-primary btn--full" onClick={handleWrite} disabled={loading}>
            <Send size={16} /> {loading ? 'Writing…' : 'Write email'}
          </button>
          {result && (
            <div className="fab-panel__result">
              <div className="form-group">
                <label>Subject</label>
                <input type="text" value={result.subject} readOnly className="form-control" />
              </div>
              <div className="form-group">
                <label>Body</label>
                <textarea value={result.body} readOnly className="form-control" rows={6} />
              </div>
              <div className="btn-row">
                <button type="button" className="btn btn-primary" onClick={useInComposer}>
                  <FileEdit size={16} /> Use in composer
                </button>
                <button type="button" className="btn btn-secondary" onClick={copyToClipboard}>
                  <Copy size={16} /> Copy
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
