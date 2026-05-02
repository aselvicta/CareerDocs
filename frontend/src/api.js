const API = '/api'
const TOKEN_KEY = 'docs_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

function headers(includeAuth = true, body) {
  const h = { 'Content-Type': 'application/json' }
  if (includeAuth) {
    const t = getToken()
    if (t) h['Authorization'] = `Token ${t}`
  }
  return h
}

async function handleResponse(r) {
  const isJson = r.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await r.json().catch(() => ({})) : await r.blob()
  if (!r.ok) {
    if (r.status === 401) setToken(null)
    throw new Error(data?.error || data?.detail || `Request failed ${r.status}`)
  }
  return data
}

export const api = {
  async get(path, options = {}) {
    const skipAuth = options.public === true
    const r = await fetch(API + path, { credentials: 'include', headers: headers(!skipAuth) })
    return handleResponse(r)
  },
  async post(path, body) {
    const r = await fetch(API + path, {
      method: 'POST',
      credentials: 'include',
      headers: headers(true, body),
      body: body ? JSON.stringify(body) : undefined,
    })
    return handleResponse(r)
  },
  async put(path, body) {
    const r = await fetch(API + path, {
      method: 'PUT',
      credentials: 'include',
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
    })
    return handleResponse(r)
  },
  async patch(path, body) {
    const r = await fetch(API + path, {
      method: 'PATCH',
      credentials: 'include',
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
    })
    return handleResponse(r)
  },
  async delete(path) {
    const r = await fetch(API + path, { method: 'DELETE', credentials: 'include', headers: headers() })
    if (r.status === 204) return
    return handleResponse(r)
  },
  async postMultipart(path, formData) {
    const h = {}
    const t = getToken()
    if (t) h['Authorization'] = `Token ${t}`
    const r = await fetch(API + path, {
      method: 'POST',
      credentials: 'include',
      headers: h,
      body: formData,
    })
    return handleResponse(r)
  },
  async getBlob(path) {
    const h = {}
    const t = getToken()
    if (t) h['Authorization'] = `Token ${t}`
    const r = await fetch(API + path, { method: 'GET', credentials: 'include', headers: h })
    if (!r.ok) {
      const text = await r.text()
      let msg = `Download failed (${r.status})`
      if (text) {
        try {
          const j = JSON.parse(text)
          msg = j.error || j.detail || msg
        } catch {
          msg = text.slice(0, 100)
        }
      }
      throw new Error(msg)
    }
    return r.blob()
  },
}

export async function downloadExport(path, filename) {
  try {
    const blob = await api.getBlob(path)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (filename || 'download').replace(/[^\w\-.\s]/g, '_') || 'download'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 200)
  } catch (e) {
    console.error('Export failed:', e)
    throw e
  }
}
