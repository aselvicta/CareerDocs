import { useEffect, useState } from 'react'
import { AlertTriangle, LogOut, Mail, Monitor, Moon, Plus, Sun, Trash2 } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { useTheme } from '../ThemeContext'
import { useToast } from '../ToastContext'
import { useSenders, GMAIL_ERRORS } from '../shell/useSenders'
import { relativeTime } from '../shell/format'

const EMPTY_REF = { name: '', title: '', company: '', email: '', phone: '' }
const SECTIONS = [
  { id: 'details', label: 'Personal details' },
  { id: 'summary', label: 'Default profile' },
  { id: 'references', label: 'References' },
  { id: 'email', label: 'Email sending' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'account', label: 'Account' },
]

export function Profile() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { addToast } = useToast()
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(null)
  const [saving, setSaving] = useState(false)
  const senders = useSenders()
  const [connecting, setConnecting] = useState(false)
  const [removing, setRemoving] = useState(null)

  // Result of the Gmail connect redirect: /profile?gmail=connected#email or ?gmail_error=code#email
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.get('gmail') === 'connected') addToast('Gmail connected. Pick it in From when you send an email.', 'success')
    const err = q.get('gmail_error')
    if (err) addToast(GMAIL_ERRORS[err] || 'Gmail could not be connected. Please try again.', 'error')
    if (q.has('gmail') || err) window.history.replaceState(null, '', window.location.pathname + window.location.hash)
  }, [addToast])

  // The page renders a skeleton first, so jump to #section once the form exists.
  const loaded = !!form
  useEffect(() => {
    if (!loaded || !window.location.hash) return
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [loaded])

  async function connectGmail() {
    setConnecting(true)
    try { await senders.connect() } catch (e) { addToast(e?.message || 'Could not start Gmail connection.', 'error'); setConnecting(false) }
  }
  async function disconnectGmail(acct) {
    setRemoving(acct.id)
    try { await senders.disconnect(acct.id); addToast(`${acct.email} disconnected.`, 'success') } catch (e) { addToast(e?.message || 'Could not disconnect.', 'error') } finally { setRemoving(null) }
  }

  useEffect(() => {
    api.get('/profile/').then(d => {
      const f = {
        full_name: d.full_name ?? '', email: d.email ?? '', phone: d.phone ?? '', location: d.location ?? '', summary: d.summary ?? '',
        references: Array.isArray(d.references) ? d.references.map(r => ({ ...EMPTY_REF, ...r })) : [],
      }
      setForm(f)
      setSaved(JSON.stringify(f))
    }).catch(() => addToast('Could not load your profile.', 'error'))
  }, [addToast])

  const dirty = form && JSON.stringify(form) !== saved
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const updateRef = (i, k, v) => setForm(p => ({ ...p, references: p.references.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }))

  async function save(e) {
    e?.preventDefault()
    setSaving(true)
    try {
      const references = form.references.filter(r => Object.values(r).some(v => String(v).trim()))
      await api.patch('/profile/', { ...form, references })
      const next = { ...form, references }
      setForm(next)
      setSaved(JSON.stringify(next))
      addToast('Settings saved.', 'success')
    } catch (err) { addToast(err?.message || 'Save failed.', 'error') } finally { setSaving(false) }
  }

  if (!form) return <div className="skel" style={{ height: 480, maxWidth: 980 }} />

  return (
    <div className="st">
      <div className="pg-head">
        <div>
          <h1 className="pg-title">Settings</h1>
          <p className="pg-sub">Details you save here fill in every new CV and letter automatically.</p>
        </div>
      </div>
      <div className="st-grid">
        <nav className="st-nav" aria-label="Settings sections">
          {SECTIONS.filter(s => s.id !== 'email' || senders.available || senders.accounts.length > 0).map(s => <a key={s.id} href={`#${s.id}`}>{s.label}</a>)}
        </nav>

        <form className="st-main" onSubmit={save}>
          <section id="details" className="st-card">
            <header><h2>Personal details</h2><p>Used as the header of new CVs and as the sender of new letters.</p></header>
            <div className="ed-grid">
              <label className="ed-field"><span className="ed-field__label">Full name</span><input className="form-control" value={form.full_name} onChange={e => update('full_name', e.target.value)} autoComplete="name" /></label>
              <label className="ed-field"><span className="ed-field__label">Email on documents</span><input className="form-control" type="email" value={form.email} onChange={e => update('email', e.target.value)} autoComplete="email" /></label>
              <label className="ed-field"><span className="ed-field__label">Phone</span><input className="form-control" value={form.phone} onChange={e => update('phone', e.target.value)} autoComplete="tel" /></label>
              <label className="ed-field"><span className="ed-field__label">City, Country</span><input className="form-control" value={form.location} onChange={e => update('location', e.target.value)} placeholder="Nairobi, Kenya" /></label>
            </div>
          </section>

          <section id="summary" className="st-card">
            <header><h2>Default profile</h2><p>A short paragraph about you. New CVs start with it, and you can tailor it per CV.</p></header>
            <textarea className="form-control" rows={5} value={form.summary} onChange={e => update('summary', e.target.value)} placeholder="Recent Statistics graduate with..." />
          </section>

          <section id="references" className="st-card">
            <header><h2>References</h2><p>Saved once, added to every new CV.</p></header>
            <div className="ed-entries">
              {form.references.map((r, i) => (
                <div key={i} className="ed-entry">
                  <div className="ed-entry__head">
                    <span className="ed-entry__title">{r.name || <em>New referee</em>}</span>
                    <div className="ed-entry__tools"><button type="button" className="is-danger" onClick={() => update('references', form.references.filter((_, j) => j !== i))} aria-label="Remove referee"><Trash2 size={15} /></button></div>
                  </div>
                  <div className="ed-grid">
                    <label className="ed-field"><span className="ed-field__label">Name</span><input className="form-control" value={r.name} onChange={e => updateRef(i, 'name', e.target.value)} /></label>
                    <label className="ed-field"><span className="ed-field__label">Job title</span><input className="form-control" value={r.title} onChange={e => updateRef(i, 'title', e.target.value)} /></label>
                    <label className="ed-field ed-field--wide"><span className="ed-field__label">Organisation</span><input className="form-control" value={r.company} onChange={e => updateRef(i, 'company', e.target.value)} /></label>
                    <label className="ed-field"><span className="ed-field__label">Email</span><input className="form-control" type="email" value={r.email} onChange={e => updateRef(i, 'email', e.target.value)} /></label>
                    <label className="ed-field"><span className="ed-field__label">Phone</span><input className="form-control" value={r.phone} onChange={e => updateRef(i, 'phone', e.target.value)} /></label>
                  </div>
                </div>
              ))}
              <button type="button" className="ed-add" onClick={() => update('references', [...form.references, { ...EMPTY_REF }])}><Plus size={16} /> Add a referee</button>
            </div>
          </section>

          {(senders.available || senders.accounts.length > 0) && <section id="email" className="st-card">
            <header>
              <h2>Email sending</h2>
              <p>Connect Gmail to send applications from your own address. They appear in your Gmail Sent folder and recruiters reply straight to your inbox.</p>
            </header>
            {senders.accounts.length > 0 && (
              <ul className="st-senders">
                {senders.accounts.map(a => (
                  <li key={a.id} className="st-sender">
                    <span className="st-sender__icon">{a.needs_reconnect ? <AlertTriangle size={17} /> : <Mail size={17} />}</span>
                    <span className="st-sender__text">
                      <strong>{a.email}</strong>
                      {a.needs_reconnect
                        ? <small className="is-warn">Google stopped access. Reconnect to keep sending.</small>
                        : <small>{a.last_used_at ? `Last used ${relativeTime(a.last_used_at)}` : `Connected ${relativeTime(a.connected_at)}`}</small>}
                    </span>
                    {a.needs_reconnect && <button type="button" className="btn btn-secondary btn--sm" onClick={connectGmail} disabled={connecting}>Reconnect</button>}
                    <button type="button" className="btn btn-ghost btn--sm" onClick={() => disconnectGmail(a)} disabled={removing === a.id}>{removing === a.id ? 'Removing...' : 'Disconnect'}</button>
                  </li>
                ))}
              </ul>
            )}
            {senders.available ? (
              <button type="button" className={`btn ${senders.accounts.length ? 'btn-secondary' : 'btn-primary'}`} onClick={connectGmail} disabled={connecting}>
                <Mail size={16} /> {connecting ? 'Opening Google...' : senders.accounts.length ? 'Connect another Gmail' : 'Connect Gmail'}
              </button>
            ) : !senders.loading && <p className="home-card__empty">Gmail sending is not set up on this server yet.</p>}
            <p className="st-note">
              CareerDocs only asks for permission to send. It cannot read your inbox. Without Gmail, emails go from CareerDocs
              with replies directed to {senders.replyTo || 'your email'}.
            </p>
          </section>}

          <section id="appearance" className="st-card">
            <header><h2>Appearance</h2><p>Choose how CareerDocs looks on this device. Your documents always print in their own colours.</p></header>
            <div className="st-theme">
              <button type="button" className={theme === 'light' ? 'is-active' : ''} onClick={() => theme !== 'light' && toggleTheme()}><Sun size={18} /> Light</button>
              <button type="button" className={theme === 'dark' ? 'is-active' : ''} onClick={() => theme !== 'dark' && toggleTheme()}><Moon size={18} /> Dark</button>
              <span className="st-theme__hint"><Monitor size={14} /> Saved on this browser</span>
            </div>
          </section>

          <section id="account" className="st-card">
            <header><h2>Account</h2><p>Signed in as <strong>{user?.email}</strong>.</p></header>
            <button type="button" className="btn btn-secondary" onClick={logout}><LogOut size={16} /> Log out</button>
          </section>

          <div className={`st-savebar ${dirty ? 'is-visible' : ''}`} aria-hidden={!dirty}>
            <span>You have unsaved changes</span>
            <button type="button" className="btn btn-ghost" onClick={() => setForm(JSON.parse(saved))} disabled={saving}>Discard</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
