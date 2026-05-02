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

  async function login(email, password) {
    const data = await api.post('/auth/login/', { email, password })
    setToken(data.token)
    setUser(data.user)
    return data
  }

  async function register(email, password, username = '') {
    const data = await api.post('/auth/register/', { email, password, username: username || email })
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
