import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { setToken } from '../api'
import { useAuth } from '../AuthContext'
import { useToast } from '../ToastContext'

const ERROR_MESSAGES = {
  access_denied: 'Google sign-in was cancelled.',
  not_configured: 'Google sign-in is not available right now.',
  invalid_state: 'Your Google sign-in session expired. Please try again.',
  email_not_verified: 'Your Google email address is not verified.',
}

export function OAuthCallback() {
  const navigate = useNavigate()
  const { loadUser } = useAuth()
  const { addToast } = useToast()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true

    const query = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const error = query.get('error')
    // Token arrives in the URL fragment (never sent to servers); keep query fallback for older backends.
    const token = hash.get('token') || query.get('token')

    // Strip the token from the address bar / history right away.
    window.history.replaceState(null, '', window.location.pathname)

    if (error) {
      addToast(ERROR_MESSAGES[error] || 'Google sign-in failed. Please try again.', 'error')
      navigate('/login', { replace: true })
      return
    }
    if (token) {
      setToken(token)
      loadUser()
        .then(() => {
          addToast('Signed in with Google.', 'success')
          navigate('/', { replace: true })
        })
        .catch(() => {
          setToken(null)
          addToast('Could not complete sign-in.', 'error')
          navigate('/login', { replace: true })
        })
      return
    }
    navigate('/login', { replace: true })
  }, [navigate, loadUser, addToast])

  return <div className="app-loading">Signing in...</div>
}
