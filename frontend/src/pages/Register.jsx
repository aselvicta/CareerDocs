import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, UserPlus, Sparkles } from 'lucide-react'
import { AppLogo, Wordmark } from '../AppLogo'
import { GoogleAuthButton } from '../GoogleAuthButton'
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
            <AppLogo className="app-logo--auth" alt="" />
            <Wordmark className="wordmark--auth" />
          </div>
          <p className="tagline">Build CVs and letters. Use AI to improve wording. Export or send by email.</p>
        </div>
        <div className="auth-layout__form-wrap">
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 600 }}>Create account</h2>
          <GoogleAuthButton disabled={submitting} label="Sign up with Google" />
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
          <p className="auth-footer"><Link to="/">← Back to home</Link></p>
        </div>
      </div>
    </div>
  )
}
