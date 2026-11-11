import { getApiBase, getToken } from './api'

const VISITOR_KEY = 'cd_visitor_id'
let firstView = true
let last = { path: '', at: 0 }

function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
      id = crypto.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
      localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}

/** Record a page view for the admin dashboard. Never throws; admin pages are not tracked. */
export function trackPageView(path) {
  if (!path || path.startsWith('/admin') || path === '/oauth/callback') return
  const now = Date.now()
  if (last.path === path && now - last.at < 1500) return // StrictMode double-mount / rapid repeats
  last = { path, at: now }

  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Token ${token}`
  const body = { path, visitor_id: visitorId() }
  if (firstView) {
    body.referrer = document.referrer || ''
    firstView = false
  }
  fetch(`${getApiBase()}/track/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {})
}
