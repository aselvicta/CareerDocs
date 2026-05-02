import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, LogIn } from 'lucide-react'
import { AppLogo } from '../AppLogo'
import { useAuth } from '../AuthContext'
import { useToast } from '../ToastContext'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      addToast('Signed in.', 'success')
      navigate(from, { replace: true })
    } catch (err) {
      const msg = err?.message || 'Login failed'
      setError(msg)
      addToast(msg, 'error')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <div className="auth-layout__brand">
          <div className="auth-brand-logo">
            <AppLogo className="app-logo--auth" alt="Career Docs" />
          </div>
          <p className="tagline">Create CVs and professional letters with AI. Export to PDF or Word.</p>
        </div>
        <div className="auth-layout__form-wrap">
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 600 }}>Sign in</h2>
          <button
            type="button"
            className="btn btn-google btn--full"
            onClick={() => { window.location.href = '/api/auth/google/' }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
              <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
            </svg>
            Continue with Google
          </button>
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
              />
            </div>
            <button type="submit" className="btn btn-primary btn--full">
              <LogIn size={18} /> Sign in
            </button>
          </form>
          <p className="auth-footer">Don&apos;t have an account? <Link to="/register">Create one</Link></p>
        </div>
      </div>
    </div>
  )
}
