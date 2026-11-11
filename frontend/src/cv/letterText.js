const HAS_GREETING = /^\s*(dear|to whom|hello|hi)\b/i
const HAS_CLOSING = /(sincerely|regards|yours (truly|faithfully)|best wishes|respectfully|kind regards)[,.]?\s*\n?[^\n]*$/i

export function letterParts(letter) {
  const body = String(letter.body || '').trim()
  const paragraphs = body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  const greeting = HAS_GREETING.test(body) ? null : `Dear ${(letter.recipient_name || '').trim() || 'Hiring Manager'},`
  const closing = HAS_CLOSING.test(body.slice(-160)) ? null : 'Yours sincerely,'
  return { paragraphs, greeting, closing }
}

export function formatLetterDate(value) {
  const d = value ? new Date(value) : new Date()
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

