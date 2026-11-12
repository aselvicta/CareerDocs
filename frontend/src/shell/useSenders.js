import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'

/** Connected Gmail accounts the user can send from, plus helpers to connect and disconnect. */
export function useSenders() {
  const [state, setState] = useState({ loading: true, available: false, accounts: [], replyTo: '' })

  const reload = useCallback(() => api.get('/gmail/accounts/')
    .then(d => setState({ loading: false, available: !!d.available, accounts: d.accounts || [], replyTo: d.default_reply_to || '' }))
    .catch(() => setState(s => ({ ...s, loading: false }))), [])

  useEffect(() => { reload() }, [reload])

  const connect = useCallback(async () => {
    const { url } = await api.post('/gmail/connect/')
    window.location.assign(url)
  }, [])

  const disconnect = useCallback(async id => {
    await api.delete(`/gmail/accounts/${id}/`)
    await reload()
  }, [reload])

  return { ...state, reload, connect, disconnect }
}

const FROM_KEY = 'cd-send-from'
export const rememberFrom = id => localStorage.setItem(FROM_KEY, String(id))
export const lastFrom = () => localStorage.getItem(FROM_KEY) || ''

export const GMAIL_ERRORS = {
  access_denied: 'Gmail was not connected because access was cancelled.',
  scope_denied: 'Tick "Send email on your behalf" on the Google screen so CareerDocs can send from Gmail.',
  invalid_state: 'That connection link expired. Please try again.',
  not_configured: 'Gmail sending is not set up on this server yet.',
  too_many: 'You can connect up to 5 Gmail addresses. Disconnect one first.',
  no_refresh_token: 'Google did not grant lasting access. Please try again.',
}

/** Gmail web link to a sent conversation (opens in the right account when signed into several). */
export const gmailThreadUrl = (email, threadId) =>
  `https://mail.google.com/mail/?authuser=${encodeURIComponent(email)}#all/${threadId}`

/** Gmail's web compose window, prefilled. Attachments cannot be passed in a URL. */
export function gmailComposeUrl({ to, subject, body }) {
  const q = new URLSearchParams({ view: 'cm', fs: '1', to: to || '', su: subject || '' })
  // Very long URLs fail in Gmail; keep the body to a safe size.
  const safeBody = (body || '').length > 6000 ? `${body.slice(0, 6000)}...` : (body || '')
  q.set('body', safeBody)
  return `https://mail.google.com/mail/?${q.toString()}`
}
