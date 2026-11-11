import { createContext, useContext, useState, useEffect } from 'react'
import { api, getToken, setToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadUser() {
    if (!getToken()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const data = await api.get('/auth/me/')
      setUser(data.user)
    } catch {
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

  async function login(email, password, { requireStaff = false } = {}) {
    const data = await api.post('/auth/login/', { email, password })
    setToken(data.token)
    if (requireStaff && !data.user?.is_staff) {
      // Valid credentials but not an admin: don't leave them half signed in.
      await api.post('/auth/logout/').catch(() => {})
      setToken(null)
      throw new Error('This account does not have admin access.')
    }
    setUser(data.user)
    return data
  }

  async function register(fields) {
    const data = await api.post('/auth/register/', fields)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  function logout() {
    setToken(null)
    setUser(null)
    api.post('/auth/logout/').catch(() => {})
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, loadUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
