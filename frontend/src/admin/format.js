const EVENT_LABELS = {
  'page.view': 'Viewed page',
  'auth.signup': 'Signed up',
  'auth.login': 'Logged in',
  'auth.logout': 'Logged out',
  'auth.google_signup': 'Signed up with Google',
  'auth.google_login': 'Logged in with Google',
  'profile.update': 'Updated profile',
  'cv.create': 'Created CV',
  'cv.update': 'Edited CV',
  'cv.delete': 'Deleted CV',
  'cv.duplicate': 'Duplicated CV',
  'cv.revert': 'Restored CV version',
  'cv.export_pdf': 'Exported CV (PDF)',
  'cv.export_docx': 'Exported CV (Word)',
  'cv.share': 'Shared CV link',
  'cv.unshare': 'Stopped sharing CV',
  'cv.email': 'Emailed CV',
  'cv.public_view': 'Viewed a shared CV',
  'letter.create': 'Created letter',
  'letter.update': 'Edited letter',
  'letter.delete': 'Deleted letter',
  'letter.duplicate': 'Duplicated letter',
  'letter.revert': 'Restored letter version',
  'letter.export_pdf': 'Exported letter (PDF)',
  'letter.export_docx': 'Exported letter (Word)',
  'letter.email': 'Emailed letter',
  'ai.enhance': 'AI: improve text',
  'ai.suggest': 'AI: suggest alternatives',
  'ai.generate_letter': 'AI: generate letter',
  'ai.write_email': 'AI: write email',
  'ai.help': 'AI: help chat',
  'ai.tailor_cv': 'AI: tailor CV',
  'ai.tailor_letter': 'AI: tailor letter',
  'ai.ats': 'AI: ATS check',
  'application.create': 'Added application',
  'application.update': 'Updated application',
  'application.delete': 'Deleted application',
  'email.compose': 'Sent email',
  'admin.user_update': 'Admin: changed user',
  'admin.user_delete': 'Admin: deleted user',
  'admin.cvs_delete': 'Admin: deleted CV',
  'admin.letters_delete': 'Admin: deleted letter',
  'admin.applications_delete': 'Admin: deleted application',
  'admin.cv_revoke_share': 'Admin: revoked CV link',
}

export function eventLabel(event) {
  if (EVENT_LABELS[event]) return EVENT_LABELS[event]
  const s = String(event || '').replace(/[._]/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const EVENT_GROUPS = [
  ['auth.*', 'Sign-ins & sign-ups'],
  ['cv.*', 'CVs'],
  ['letter.*', 'Letters'],
  ['application.*', 'Applications'],
  ['ai.*', 'AI features'],
  ['admin.*', 'Admin actions'],
]

export const PAGE_LABELS = {
  '/': 'Dashboard',
  '/login': 'Login',
  '/register': 'Register',
  '/cv': 'CV list',
  '/cv/templates': 'CV templates',
  '/cv/new': 'New CV',
  '/cv/:id': 'View CV',
  '/cv/:id/edit': 'Edit CV',
  '/letters': 'Letter list',
  '/letters/new': 'New letter',
  '/letters/:id': 'View letter',
  '/letters/:id/edit': 'Edit letter',
  '/compose': 'Compose email',
  '/profile': 'Profile',
  '/applications': 'Applications',
  '/applications/new': 'New application',
  '/applications/:id': 'View application',
  '/view/cv/:id': 'Public shared CV',
}

export const pageLabel = path => (PAGE_LABELS[path] ? `${PAGE_LABELS[path]} (${path})` : path)

const nf = new Intl.NumberFormat()
export const fmtNum = n => (n == null ? '0' : nf.format(n))

export function fmtDate(iso) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function fmtDateTime(iso) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function timeAgo(iso) {
  if (!iso) return 'never'
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d} d ago`
  return fmtDate(iso)
}

export function parseUA(ua) {
  if (!ua) return ''
  const browser =
    /Edg\//.test(ua) ? 'Edge'
      : /OPR\/|Opera/.test(ua) ? 'Opera'
        : /Firefox\//.test(ua) ? 'Firefox'
          : /Chrome\//.test(ua) ? 'Chrome'
            : /Safari\//.test(ua) ? 'Safari'
              : /curl|python|bot|spider|crawl/i.test(ua) ? 'Bot/script' : 'Other'
  const os =
    /Android/.test(ua) ? 'Android'
      : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
        : /Windows/.test(ua) ? 'Windows'
          : /Mac OS X/.test(ua) ? 'macOS'
            : /Linux/.test(ua) ? 'Linux' : ''
  const mobile = /Mobi|Android/.test(ua)
  return [browser, os, mobile ? 'mobile' : ''].filter(Boolean).join(' · ')
}

export const humanize = s => String(s || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())
