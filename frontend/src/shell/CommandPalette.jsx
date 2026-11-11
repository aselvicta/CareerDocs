import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase, FileText, FileUp, Home, LayoutTemplate, Mail, Moon, PenLine, Plus, Search, Send, Settings, ShieldCheck,
} from 'lucide-react'
import { api } from '../api'

/**
 * Ctrl/Cmd+K palette: jump to any page, run an action, or find a CV, letter or application.
 */
export function CommandPalette({ open, onClose, actions, isStaff }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [results, setResults] = useState({ query: '', cvs: [], letters: [], applications: [] })
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const t = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(t)
  }, [open])

  // Debounced server search; results are tagged with their query so stale ones are ignored.
  useEffect(() => {
    const term = q.trim()
    if (!open || term.length < 2) return undefined
    const t = setTimeout(() => {
      api.get(`/search/?q=${encodeURIComponent(term)}`)
        .then(d => setResults({ query: term, ...d }))
        .catch(() => {})
    }, 180)
    return () => clearTimeout(t)
  }, [q, open])

  const items = useMemo(() => {
    const term = q.trim().toLowerCase()
    const base = [
      { group: 'Create', icon: Plus, label: 'New CV from a template', run: () => navigate('/cv/templates'), keys: 'create new cv resume' },
      { group: 'Create', icon: FileUp, label: 'Import a CV from Word or PDF', run: actions.openImport, keys: 'import upload docx pdf word' },
      { group: 'Create', icon: PenLine, label: 'New cover letter', run: () => navigate('/letters/templates'), keys: 'letter cover new' },
      { group: 'Create', icon: Briefcase, label: 'Track a job application', run: () => navigate('/applications/new'), keys: 'job application track add' },
      { group: 'Create', icon: Send, label: 'Write an email with AI', run: actions.openEmailWriter, keys: 'email ai write' },
      { group: 'Go to', icon: Home, label: 'Home', run: () => navigate('/'), keys: 'home dashboard' },
      { group: 'Go to', icon: FileText, label: 'CVs', run: () => navigate('/cv'), keys: 'cvs resumes' },
      { group: 'Go to', icon: Mail, label: 'Cover letters', run: () => navigate('/letters'), keys: 'letters' },
      { group: 'Go to', icon: Briefcase, label: 'Applications', run: () => navigate('/applications'), keys: 'applications jobs board' },
      { group: 'Go to', icon: Send, label: 'Email', run: () => navigate('/compose'), keys: 'email compose send' },
      { group: 'Go to', icon: LayoutTemplate, label: 'Templates', run: () => navigate('/cv/templates'), keys: 'templates designs' },
      { group: 'Go to', icon: Settings, label: 'Profile and settings', run: () => navigate('/profile'), keys: 'profile settings account' },
      { group: 'Preferences', icon: Moon, label: 'Toggle dark mode', run: actions.toggleTheme, keys: 'theme dark light mode' },
    ]
    if (isStaff) base.push({ group: 'Go to', icon: ShieldCheck, label: 'Admin console', run: () => navigate('/admin'), keys: 'admin' })
    const filtered = term ? base.filter(i => `${i.label} ${i.keys}`.toLowerCase().includes(term)) : base
    const found = results.query === q.trim() && q.trim().length >= 2 ? [
      ...results.cvs.map(c => ({ group: 'CVs', icon: FileText, label: c.title, hint: 'CV', run: () => navigate(`/cv/${c.id}`) })),
      ...results.letters.map(l => ({ group: 'Letters', icon: Mail, label: l.title || l.company || 'Letter', hint: l.company, run: () => navigate(`/letters/${l.id}`) })),
      ...results.applications.map(a => ({ group: 'Applications', icon: Briefcase, label: a.job_title, hint: a.company, run: () => navigate(`/applications/${a.id}`) })),
    ] : []
    return [...found, ...filtered]
  }, [q, results, actions, isStaff, navigate])

  useEffect(() => {
    listRef.current?.querySelector('.cp-item.is-active')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function close() {
    setQ('')
    setActive(0)
    onClose()
  }
  function run(item) {
    close()
    item?.run?.()
  }
  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); run(items[active]) }
    else if (e.key === 'Escape') close()
  }

  if (!open) return null
  let lastGroup = null
  return createPortal(
    <div className="md-overlay md-overlay--top" onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
      <div className="cp" role="dialog" aria-modal="true" aria-label="Search and commands">
        <div className="cp-search">
          <Search size={18} aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); setActive(0) }}
            onKeyDown={onKey}
            placeholder="Search your documents or type a command..."
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="cp-list"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="cp-list" id="cp-list" ref={listRef} role="listbox">
          {items.length === 0 && <p className="cp-empty">Nothing matches "{q}".</p>}
          {items.map((item, i) => {
            const Icon = item.icon
            const header = item.group !== lastGroup ? <div className="cp-group" key={`g-${item.group}-${i}`}>{item.group}</div> : null
            lastGroup = item.group
            return [
              header,
              <button
                key={`${item.group}-${item.label}-${i}`}
                type="button"
                role="option"
                aria-selected={i === active}
                className={`cp-item ${i === active ? 'is-active' : ''}`}
                onMouseMove={() => setActive(i)}
                onClick={() => run(item)}
              >
                <Icon size={16} aria-hidden />
                <span className="cp-item__label">{item.label}</span>
                {item.hint && <span className="cp-item__hint">{item.hint}</span>}
              </button>,
            ]
          })}
        </div>
        <div className="cp-foot"><span><kbd>↑</kbd><kbd>↓</kbd> to move</span><span><kbd>Enter</kbd> to open</span></div>
      </div>
    </div>,
    document.body,
  )
}
