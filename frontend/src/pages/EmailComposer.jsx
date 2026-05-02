import { useState, useEffect, useRef } from 'react'
import { Mail, Send, Paperclip, FileText, Sparkles } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../ToastContext'
import { useEmailDraft } from '../EmailDraftContext'

export function EmailComposer() {
  const { draft, clearDraft } = useEmailDraft()
  const [toEmail, setToEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [cvs, setCvs] = useState([])
  const [letters, setLetters] = useState([])
  const [selectedDocs, setSelectedDocs] = useState([]) // [{ type: 'cv', id, title }]
  const [files, setFiles] = useState([])
  const [sending, setSending] = useState(false)
  const [aiField, setAiField] = useState(null)
  const fileInputRef = useRef(null)
  const { addToast } = useToast()

  useEffect(() => {
    Promise.all([api.get('/cvs/'), api.get('/letters/')]).then(([cvsData, lettersData]) => {
      setCvs(Array.isArray(cvsData) ? cvsData : [])
      setLetters(Array.isArray(lettersData) ? lettersData : [])
    }).catch(() => {})
  }, [])
  useEffect(() => {
    if (draft.subject || draft.body) {
      setSubject(draft.subject)
      setBody(draft.body)
      clearDraft()
    }
  }, [])

  function toggleDoc(type, id, title) {
    setSelectedDocs(prev => {
      const key = `${type}-${id}`
      if (prev.some(d => `${d.type}-${d.id}` === key)) return prev.filter(d => `${d.type}-${d.id}` !== key)
      return [...prev, { type, id, title }]
    })
  }

  function onFileChange(e) {
    const list = e.target.files ? Array.from(e.target.files) : []
    setFiles(prev => [...prev, ...list])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeFile(i) {
    setFiles(prev => prev.filter((_, idx) => idx !== i))
  }

  async function enhanceWithAI(field) {
    const text = field === 'subject' ? subject : body
    if (!text.trim()) { addToast('Enter some text first.', 'error'); return }
    setAiField(field)
    try {
      const data = await api.post('/ai/enhance/', {
        context: 'Email',
        text,
        field_hint: field,
      })
      if (data.enhanced) {
        if (field === 'subject') setSubject(data.enhanced)
        else setBody(data.enhanced)
        addToast('Text improved.', 'success')
      }
    } catch (e) {
      addToast(e?.message || 'Failed', 'error')
    } finally {
      setAiField(null)
    }
  }

  async function handleSend() {
    if (!toEmail.trim() || !toEmail.includes('@')) {
      addToast('Enter a valid recipient email.', 'error')
      return
    }
    setSending(true)
    const form = new FormData()
    form.append('to_email', toEmail.trim())
    form.append('subject', subject.trim() || 'Message from Career Docs')
    form.append('body', body.trim() || 'Please see the attached documents.')
    form.append('attachments', JSON.stringify(selectedDocs.map(d => ({ type: d.type, id: d.id }))))
    files.forEach((f, i) => form.append('files', f, f.name || `file_${i}`))
    try {
      await api.postMultipart('/compose-email/', form)
      addToast('Email sent.', 'success')
      setToEmail('')
      setSubject('')
      setBody('')
      setSelectedDocs([])
      setFiles([])
    } catch (e) {
      addToast(e?.message || 'Failed to send.', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1><Mail size={24} /> Compose email</h1>
        <p className="subtitle">Write your email, attach documents from your account or from your device, then send.</p>
      </div>
      <div className="card card--detail">
        <div className="form-group">
          <label>To</label>
          <input
            type="email"
            value={toEmail}
            onChange={e => setToEmail(e.target.value)}
            placeholder="recipient@example.com"
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label>Subject</label>
          <div className="form-row-with-btn">
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Email subject"
              className="form-control"
            />
            <button type="button" className="btn btn-secondary" onClick={() => enhanceWithAI('subject')} disabled={aiField === 'subject'}>
              <Sparkles size={14} /> {aiField === 'subject' ? '…' : 'Improve with AI'}
            </button>
          </div>
        </div>
        <div className="form-group">
          <label>Body</label>
          <div className="form-row-with-btn">
            <textarea value={body} onChange={e => setBody(e.target.value)} className="form-control" rows={8} placeholder="Write your email..." />
            <button type="button" className="btn btn-secondary" onClick={() => enhanceWithAI('body')} disabled={aiField === 'body'}>
              <Sparkles size={14} /> {aiField === 'body' ? '…' : 'Improve with AI'}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label><FileText size={16} /> Attach from my docs</label>
          <p className="muted" style={{ marginBottom: '0.5rem' }}>Select CVs or letters to attach as PDF.</p>
          <div className="attach-docs">
            {cvs.map(cv => (
              <label key={`cv-${cv.id}`} className="attach-chip">
                <input
                  type="checkbox"
                  checked={selectedDocs.some(d => d.type === 'cv' && d.id === cv.id)}
                  onChange={() => toggleDoc('cv', cv.id, cv.title)}
                />
                <span>CV: {cv.title}</span>
              </label>
            ))}
            {letters.map(l => (
              <label key={`letter-${l.id}`} className="attach-chip">
                <input
                  type="checkbox"
                  checked={selectedDocs.some(d => d.type === 'letter' && d.id === l.id)}
                  onChange={() => toggleDoc('letter', l.id, l.letter_type_display + (l.title ? ` — ${l.title}` : ''))}
                />
                <span>{l.letter_type_display}{l.title ? `: ${l.title}` : ''}</span>
              </label>
            ))}
            {!cvs.length && !letters.length && <span className="muted">No CVs or letters yet.</span>}
          </div>
        </div>

        <div className="form-group">
          <label><Paperclip size={16} /> Attach from device</label>
          <input ref={fileInputRef} type="file" multiple onChange={onFileChange} className="form-control" style={{ padding: '0.35rem' }} />
          {files.length > 0 && (
            <ul className="file-list">
              {files.map((f, i) => (
                <li key={i}>
                  {f.name || `File ${i + 1}`}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeFile(i)}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="btn-group" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={handleSend} disabled={sending}>
            <Send size={18} /> {sending ? 'Sending…' : 'Send email'}
          </button>
        </div>
      </div>
    </div>
  )
}
