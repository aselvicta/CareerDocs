import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Mail, Send, Paperclip, FileText, Sparkles, Wand2, X } from 'lucide-react'
import { useShell } from '../shell/shellContext'
import { api } from '../api'
import { useToast } from '../ToastContext'
import { useEmailDraft } from '../EmailDraftContext'
import { useSenders, rememberFrom, lastFrom } from '../shell/useSenders'

const asList = d => (Array.isArray(d) ? d : d?.results || [])

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
  const senders = useSenders()
  const [fromId, setFromId] = useState(lastFrom)
  const [apps, setApps] = useState([])
  const [appId, setAppId] = useState('')
  const [params, setParams] = useSearchParams()

  useEffect(() => {
    Promise.all([api.get('/cvs/?limit=50'), api.get('/letters/?limit=50'), api.get('/applications/?limit=100')]).then(([cvsData, lettersData, appsData]) => {
      const cvList = asList(cvsData)
      const letterList = asList(lettersData)
      const appList = asList(appsData)
      setCvs(cvList)
      setLetters(letterList)
      setApps(appList)
      // Deep links: /compose?application=ID, ?cv=ID, ?letter=ID
      const pre = []
      const cvId = Number(params.get('cv'))
      const letterId = Number(params.get('letter'))
      const cv = cvList.find(c => c.id === cvId)
      const letter = letterList.find(l => l.id === letterId)
      if (cv) pre.push({ type: 'cv', id: cv.id, title: cv.title })
      if (letter) pre.push({ type: 'letter', id: letter.id, title: letter.title || letter.letter_type_display })
      if (pre.length) setSelectedDocs(pre)
      const app = appList.find(a => a.id === Number(params.get('application')))
      if (app) pickApplication(app, cvList, letterList)
      if (params.toString()) setParams({}, { replace: true })
    }).catch(() => {})
  }, [])

  // Fall back to a valid sender once accounts load (the remembered one may have been disconnected).
  const usable = senders.accounts.filter(a => !a.needs_reconnect)
  const fromValid = fromId === 'default' || usable.some(a => String(a.id) === fromId)
  const effectiveFrom = fromValid ? fromId : (usable[0] ? String(usable[0].id) : 'default')

  function pickApplication(app, cvList = cvs, letterList = letters) {
    setAppId(app ? String(app.id) : '')
    if (!app) return
    setSubject(s => s.trim() ? s : `Application for ${app.job_title}${app.company ? ` at ${app.company}` : ''}`)
    setSelectedDocs(prev => {
      const next = [...prev]
      const add = (type, id, title) => { if (id && !next.some(d => d.type === type && d.id === id)) next.push({ type, id, title }) }
      const cv = cvList.find(c => c.id === app.cv)
      const letter = letterList.find(l => l.id === app.letter)
      if (cv) add('cv', cv.id, cv.title)
      if (letter) add('letter', letter.id, letter.title || letter.letter_type_display)
      return next
    })
  }
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
    if (effectiveFrom !== 'default') form.append('from_account', effectiveFrom)
    if (appId) form.append('application', appId)
    try {
      const res = await api.postMultipart('/compose-email/', form)
      rememberFrom(effectiveFrom)
      const where = res.via === 'gmail' ? `Sent from ${res.sent_from}. It is in your Gmail Sent folder.` : 'Email sent.'
      addToast(res.application ? `${where} Saved to ${res.application.job_title}.` : where, 'success')
      setToEmail('')
      setSubject('')
      setBody('')
      setSelectedDocs([])
      setFiles([])
      setAppId('')
      if (res.via === 'gmail') senders.reload()
    } catch (e) {
      addToast(e?.message || 'Failed to send.', 'error')
      if (e?.data?.reconnect) senders.reload()
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
          <p className="pg-sub">Send your CV and cover letter to an employer from your own Gmail, attached as PDFs.</p>
        </div>
        <div className="pg-actions">
          <button type="button" className="btn btn-secondary" onClick={openEmailWriter}><Wand2 size={16} /> Write it with AI</button>
        </div>
      </div>
      <div className="em-grid">
        <section className="em-compose">
          <label className="em-line">
            <span>From</span>
            <select className="em-select" value={effectiveFrom} onChange={e => setFromId(e.target.value)}>
              {senders.accounts.map(a => (
                <option key={a.id} value={String(a.id)} disabled={a.needs_reconnect}>
                  {a.email}{a.needs_reconnect ? ' (reconnect in Settings)' : ''}
                </option>
              ))}
              <option value="default">CareerDocs{senders.replyTo ? ` (replies go to ${senders.replyTo})` : ''}</option>
            </select>
            {!senders.loading && senders.available && !senders.accounts.length && (
              <button type="button" className="em-ai em-connect" onClick={() => senders.connect().catch(e => addToast(e?.message || 'Could not start Gmail connection.', 'error'))}>
                <Mail size={14} /> Connect Gmail
              </button>
            )}
            {senders.accounts.length > 0 && <Link to="/profile#email" className="em-ai">Manage</Link>}
          </label>
          <label className="em-line">
            <span>To</span>
            <input type="email" value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="recruiter@company.com" />
          </label>
          <label className="em-line">
            <span>For job</span>
            <select className="em-select" value={appId} onChange={e => pickApplication(apps.find(a => String(a.id) === e.target.value) || null)}>
              <option value="">Not linked to a job</option>
              {apps.map(a => <option key={a.id} value={String(a.id)}>{a.job_title}{a.company ? `, ${a.company}` : ''}</option>)}
            </select>
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
