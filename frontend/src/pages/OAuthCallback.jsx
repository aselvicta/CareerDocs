import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { setToken } from '../api'
import { useAuth } from '../AuthContext'
import { useToast } from '../ToastContext'

export function OAuthCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { loadUser } = useAuth()
  const { addToast } = useToast()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true

    const error = params.get('error')
    const token = params.get('token')
    if (error) {
      addToast(error === 'access_denied' ? 'Google sign-in was cancelled.' : 'Google sign-in failed.', 'error')
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
          addToast('Could not complete sign-in.', 'error')
          navigate('/login', { replace: true })
        })
      return
    }
    navigate('/login', { replace: true })
  }, [params, navigate, loadUser, addToast])

  return <div className="app-loading">Signing in...</div>
}
