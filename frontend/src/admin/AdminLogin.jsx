import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Mail, ShieldCheck, ArrowLeft, Sparkles } from 'lucide-react'
import { AppLogo } from '../AppLogo'
import { useAuth } from '../AuthContext'
import { useToast } from '../ToastContext'

/** Shown at /admin/* when nobody is signed in. Only staff accounts get through. */
export function AdminLogin() {
  const { login } = useAuth()
  const { addToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password, { requireStaff: true })
      addToast('Signed in to admin.', 'success')
      // AdminGate re-renders into the dashboard at the current /admin URL.
    } catch (err) {
      setError(err?.message || 'Sign in failed')
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-auth">
      <div className="admin-auth__card">
        <div className="admin-auth__brand">
          <AppLogo className="app-logo--nav" alt="" />
          <div>
            <p className="admin-auth__title">Career Docs</p>
            <p className="admin-auth__badge"><ShieldCheck size={13} aria-hidden /> Admin console</p>
          </div>
        </div>
        <h1 className="admin-auth__heading">Sign in to admin</h1>
        <p className="admin-auth__sub">Restricted to administrator accounts.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <p className="error" role="alert">{error}</p>}
          <div className="form-group">
            <label htmlFor="admin-email"><Mail size={14} /> Email</label>
            <input id="admin-email" type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)}
              required autoComplete="username" autoFocus disabled={submitting} />
          </div>
          <div className="form-group">
            <label htmlFor="admin-password"><Lock size={14} /> Password</label>
            <input id="admin-password" type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete="current-password" disabled={submitting} />
          </div>
          <button type="submit" className="btn btn-primary btn--full" disabled={submitting}>
            {submitting ? <><Sparkles size={18} className="spin-slow" /> Signing in…</> : <><ShieldCheck size={18} /> Sign in</>}
          </button>
        </form>
        <Link to="/login" className="admin-auth__back"><ArrowLeft size={14} /> Back to Career Docs</Link>
      </div>
    </div>
  )
}
