import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, UserPlus, FileText } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { useToast } from '../ToastContext'

export function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { register } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await register(email, password, username || email)
      addToast('Account created.', 'success')
      navigate('/')
    } catch (err) {
      const msg = err?.message || 'Registration failed'
      setError(msg)
      addToast(msg, 'error')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <div className="auth-layout__brand">
          <div className="icon-wrap">
            <FileText size={28} />
          </div>
          <h1>Career Docs</h1>
          <p className="tagline">Build CVs and letters. Use AI to improve wording. Export or send by email.</p>
        </div>
        <div className="auth-layout__form-wrap">
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 600 }}>Create account</h2>
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
              />
            </div>
            <div className="form-group">
              <label><Lock size={14} /> Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="form-control"
              />
            </div>
            <button type="submit" className="btn btn-primary btn--full">
              <UserPlus size={18} /> Create account
            </button>
          </form>
          <p className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  )
}
