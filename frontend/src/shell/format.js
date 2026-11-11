export const STATUS_LABEL = {
  draft: 'Saved', applied: 'Applied', interview: 'Interview', offer: 'Offer', rejected: 'Rejected', withdrawn: 'Withdrawn',
}

/** "just now", "5 min ago", "yesterday", "3 days ago", or a short date. */
export function relativeTime(value) {
  if (!value) return ''
  const d = new Date(value)
  const s = Math.round((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  const days = Math.floor(s / 86400)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
}

export function shortDate(value) {
  if (!value) return ''
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
}
