import { createContext, useContext, useState } from 'react'

const EmailDraftContext = createContext(null)

export function EmailDraftProvider({ children }) {
  const [draft, setDraft] = useState({ subject: '', body: '' })

  const setEmailDraft = (subject, body) => setDraft({ subject: subject || '', body: body || '' })
  const clearDraft = () => setDraft({ subject: '', body: '' })

  return (
    <EmailDraftContext.Provider value={{ draft, setEmailDraft, clearDraft }}>
      {children}
    </EmailDraftContext.Provider>
  )
}

export function useEmailDraft() {
  const ctx = useContext(EmailDraftContext)
  if (!ctx) return { draft: { subject: '', body: '' }, setEmailDraft: () => {}, clearDraft: () => {} }
  return ctx
}
