import { useState, useRef, useEffect } from 'react'
import { HelpCircle, X, Send } from 'lucide-react'
import { api } from './api'
import { useToast } from './ToastContext'

/** Render inline **bold** as <strong> */
function withBold(str) {
  if (!str || typeof str !== 'string') return str
  return str.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
    seg.startsWith('**') && seg.endsWith('**')
      ? <strong key={j}>{seg.slice(2, -2)}</strong>
      : seg
  )
}

/** Format help bot reply: paragraphs, **bold**, numbered lists */
function formatHelpMessage(text) {
  if (!text || typeof text !== 'string') return text
  const parts = []
  const paragraphs = text.split(/\n\n+/)
  paragraphs.forEach((para, pIdx) => {
    const block = para.trim()
    if (!block) return
    const lines = block.split(/\n/).map(s => s.trim()).filter(Boolean)
    const allNumbered = lines.length > 0 && lines.every(l => /^\d+[.)]\s/.test(l))
    if (allNumbered && lines.length >= 1) {
      const listItems = lines.map((item, i) => {
        const m = item.match(/^\d+[.)]\s*(.*)$/)
        const content = (m ? m[1] : item)
        return <li key={i}>{withBold(content)}</li>
      })
      parts.push(<ul key={pIdx} className="help-msg__list">{listItems}</ul>)
      return
    }
    parts.push(<p key={pIdx} className="help-msg__p">{withBold(block)}</p>)
  })
  return parts.length ? parts : text
}

export function HelpChat() {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const { addToast } = useToast()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleAsk() {
    const q = question.trim()
    if (!q) { addToast('Type a question.', 'error'); return }
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setQuestion('')
    setLoading(true)
    try {
      const data = await api.post('/ai/help/', { question: q })
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || 'No answer.' }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: e?.message || 'Sorry, I could not get an answer. Try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="fab fab--left"
        onClick={() => setOpen(!open)}
        aria-label="Help"
        title="Help & how to use the app"
      >
        <HelpCircle size={24} />
      </button>
      {open && (
        <div className="fab-panel fab-panel--left">
          <div className="fab-panel__header">
            <h3>Help</h3>
            <button type="button" className="fab-panel__close" onClick={() => setOpen(false)} aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <p className="fab-panel__hint">Ask anything about this app: how to create a CV, export PDF, send email, etc.</p>
          <div className="help-messages">
            {messages.length === 0 && (
              <p className="muted">e.g. &quot;How do I export my CV as PDF?&quot; or &quot;How do I send an email with attachments?&quot;</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`help-msg help-msg--${m.role}`}>
                {m.role === 'assistant' ? formatHelpMessage(m.content) : m.content}
              </div>
            ))}
            {loading && <div className="help-msg help-msg--assistant">Thinking…</div>}
            <div ref={bottomRef} />
          </div>
          <div className="help-input">
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAsk()}
              placeholder="Ask a question..."
              className="form-control"
            />
            <button type="button" className="btn btn-primary" onClick={handleAsk} disabled={loading}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
