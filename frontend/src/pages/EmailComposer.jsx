import { useState, useEffect, useRef } from 'react'
import { Mail, Send, Paperclip, FileText, Sparkles, Wand2, X } from 'lucide-react'
import { useShell } from '../shell/shellContext'
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
  const { openEmailWriter } = useShell()

  useEffect(() => {
    Promise.all([api.get('/cvs/?limit=50'), api.get('/letters/?limit=50')]).then(([cvsData, lettersData]) => {
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
    form.append('subject', subject.trim() || 'Message from CareerDocs')
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

  const attachCount = selectedDocs.length + files.length

  return (
    <div className="em">
      <div className="pg-head">
        <div>
          <h1 className="pg-title">Email</h1>
          <p className="pg-sub">Send your CV and cover letter straight to an employer, attached as PDFs.</p>
        </div>
        <div className="pg-actions">
          <button type="button" className="btn btn-secondary" onClick={openEmailWriter}><Wand2 size={16} /> Write it with AI</button>
        </div>
      </div>
      <div className="em-grid">
        <section className="em-compose">
          <label className="em-line">
            <span>To</span>
            <input type="email" value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="recruiter@company.com" />
          </label>
          <label className="em-line">
            <span>Subject</span>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Application for Graduate Data Analyst" />
            <button type="button" className="em-ai" onClick={() => enhanceWithAI('subject')} disabled={!!aiField} title="Improve subject with AI">
              <Sparkles size={14} /> {aiField === 'subject' ? 'Improving...' : 'Improve'}
            </button>
          </label>
          <textarea className="em-body" value={body} onChange={e => setBody(e.target.value)} rows={14}
            placeholder={'Dear Hiring Manager,\n\nPlease find attached my CV and cover letter for...'} />
          <div className="em-foot">
            <button type="button" className="btn btn-ghost btn--sm" onClick={() => enhanceWithAI('body')} disabled={!!aiField}>
              <Sparkles size={14} /> {aiField === 'body' ? 'Improving...' : 'Improve body with AI'}
            </button>
            <span className="em-foot__count">{attachCount ? `${attachCount} attachment${attachCount === 1 ? '' : 's'}` : 'No attachments'}</span>
            <button type="button" className="btn btn-primary" onClick={handleSend} disabled={sending}>
              <Send size={16} /> {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </section>

        <aside className="em-side">
          <section className="home-card">
            <div className="home-card__head"><h2>Attach your documents</h2></div>
            <p className="home-card__empty" style={{ marginBottom: '0.6rem' }}>Sent as PDFs in their template design.</p>
            <div className="em-docs">
              {cvs.map(cv => {
                const on = selectedDocs.some(d => d.type === 'cv' && d.id === cv.id)
                return (
                  <button key={`cv-${cv.id}`} type="button" className={`em-doc ${on ? 'is-on' : ''}`} onClick={() => toggleDoc('cv', cv.id, cv.title)} aria-pressed={on}>
                    <FileText size={16} /><span>{cv.title}</span><small>CV</small>
                  </button>
                )
              })}
              {letters.map(l => {
                const on = selectedDocs.some(d => d.type === 'letter' && d.id === l.id)
                const t = l.title || l.letter_type_display
                return (
                  <button key={`letter-${l.id}`} type="button" className={`em-doc ${on ? 'is-on' : ''}`} onClick={() => toggleDoc('letter', l.id, t)} aria-pressed={on}>
                    <Mail size={16} /><span>{t}</span><small>Letter</small>
                  </button>
                )
              })}
              {!cvs.length && !letters.length && <p className="home-card__empty">No CVs or letters yet.</p>}
            </div>
          </section>
          <section className="home-card">
            <div className="home-card__head"><h2>From your device</h2></div>
            <button type="button" className="ed-add" onClick={() => fileInputRef.current?.click()}><Paperclip size={15} /> Add files</button>
            <input ref={fileInputRef} type="file" multiple onChange={onFileChange} hidden />
            {files.length > 0 && (
              <ul className="em-files">
                {files.map((f, i) => (
                  <li key={i}><Paperclip size={13} /><span>{f.name || `File ${i + 1}`}</span><button type="button" onClick={() => removeFile(i)} aria-label="Remove file"><X size={14} /></button></li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
