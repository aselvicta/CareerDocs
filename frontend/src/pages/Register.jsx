import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, UserPlus, Sparkles } from 'lucide-react'
import { AppLogo } from '../AppLogo'
import { getApiBase } from '../api'
import { useAuth } from '../AuthContext'
import { useToast } from '../ToastContext'


export function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password1, setPassword1] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { register } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password1 !== password2) {
      setError('Passwords do not match.')
      addToast('Passwords do not match.', 'error')
      return
    }
    try {
      setSubmitting(true)
      await register({
        email,
        username: username || email,
        password: password1,
      })
      addToast('Account created.', 'success')
      navigate('/')
    } catch (err) {
      const msg = err?.message || 'Registration failed'
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
            <AppLogo className="app-logo--auth" alt="Career Docs" />
          </div>
          <p className="tagline">Build CVs and letters. Use AI to improve wording. Export or send by email.</p>
        </div>
        <div className="auth-layout__form-wrap">
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 600 }}>Create account</h2>
          <button
            type="button"
            className="btn btn-google btn--full"
            disabled={submitting}
            onClick={() => { window.location.href = `${getApiBase()}/auth/google/` }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
              <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
            </svg>
            {submitting ? (
              <>
                <Sparkles size={18} className="spin-slow" /> Loading...
              </>
            ) : (
              'Continue with Google'
            )}
          </button>
          <p className="auth-divider">or</p>
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <p className="error">{error}</p>}
            <div className="form-group">
              <label><User size={14} /> Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Optional"
                className="form-control"
                disabled={submitting}
              />
            </div>
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
                value={password1}
                onChange={e => setPassword1(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="form-control"
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label><Lock size={14} /> Confirm Password</label>
              <input
                type="password"
                value={password2}
                onChange={e => setPassword2(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="form-control"
                disabled={submitting}
              />
            </div>
            <button type="submit" className="btn btn-primary btn--full" disabled={submitting}>
              {submitting ? (
                <>
                  <Sparkles size={18} className="spin-slow" /> Creating account...
                </>
              ) : (
                <>
                  <UserPlus size={18} /> Create account
                </>
              )}
            </button>
          </form>
          <p className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  )
}
