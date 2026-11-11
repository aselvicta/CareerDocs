import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, LogIn, Sparkles } from 'lucide-react'
import { AppLogo, Wordmark } from '../AppLogo'
import { GoogleAuthButton } from '../GoogleAuthButton'
import { useAuth } from '../AuthContext'
import { useToast } from '../ToastContext'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      setSubmitting(true)
      await login(email, password)
      addToast('Signed in.', 'success')
      navigate(from, { replace: true })
    } catch (err) {
      const msg = err?.message || 'Login failed'
      setError(msg)
      addToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <div className="auth-layout__brand">
          <div className="auth-brand-logo">
            <AppLogo className="app-logo--auth" alt="" />
            <Wordmark className="wordmark--auth" />
          </div>
          <p className="tagline">Create CVs and professional letters with AI. Export to PDF or Word.</p>
        </div>
        <div className="auth-layout__form-wrap">
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 600 }}>Sign in</h2>
          <GoogleAuthButton disabled={submitting} label="Sign in with Google" />
          <p className="auth-divider">or</p>
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <p className="error">{error}</p>}
            <div className="form-group">
              <label><Mail size={14} /> Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="form-control"
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label><Lock size={14} /> Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="form-control"
                disabled={submitting}
              />
            </div>
            <button type="submit" className="btn btn-primary btn--full" disabled={submitting}>
              {submitting ? (
                <>
                  <Sparkles size={18} className="spin-slow" /> Signing in...
                </>
              ) : (
                <>
                  <LogIn size={18} /> Sign in
                </>
              )}
            </button>
          </form>
          <p className="auth-footer">Don&apos;t have an account? <Link to="/register">Create one</Link></p>
          <p className="auth-footer"><Link to="/">← Back to home</Link></p>
        </div>
      </div>
    </div>
  )
}
