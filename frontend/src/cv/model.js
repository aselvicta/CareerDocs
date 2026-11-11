/**
 * Turns a stored CV (structured JSON plus legacy free text fields) into one
 * clean shape that every template renders from.
 */

const BULLET_PREFIX = /^\s*(?:[-*•·▪◦–—]|\d+[.)])\s*/

export function splitLines(text) {
  return String(text || '')
    .split('\n')
    .map(l => l.replace(BULLET_PREFIX, '').trim())
    .filter(Boolean)
}

function splitList(text) {
  return String(text || '')
    .split(/[,;\n]/)
    .map(s => s.replace(BULLET_PREFIX, '').trim())
    .filter(Boolean)
}

const has = v => String(v ?? '').trim() !== ''

export function dateRange(start, end, current) {
  const s = String(start || '').trim()
  const e = current ? 'Present' : String(end || '').trim()
  if (s && e) return `${s} – ${e}`
  return s || e
}

export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return ''
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function prettyUrl(url) {
  return String(url || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
}

export function toModel(cv = {}) {
  const experience = (cv.experience_structured || [])
    .filter(e => has(e.role) || has(e.company) || has(e.bullets))
    .map(e => ({
      title: (e.role || '').trim(),
      org: (e.company || '').trim(),
      location: (e.location || '').trim(),
      dates: dateRange(e.start_date, e.end_date, e.current),
      bullets: splitLines(e.bullets),
    }))
  const education = (cv.education_structured || [])
    .filter(e => has(e.degree) || has(e.institution))
    .map(e => ({
      title: (e.degree || '').trim(),
      org: (e.institution || '').trim(),
      location: (e.location || '').trim(),
      dates: dateRange(e.start_date, e.end_date, false),
      bullets: splitLines(e.honors),
    }))
  let skills = (cv.skills_structured || [])
    .filter(s => has(s.items))
    .map(s => ({ category: (s.category || '').trim(), items: splitList(s.items) }))
  if (!skills.length && has(cv.skills)) skills = [{ category: '', items: splitList(cv.skills) }]

  const projects = (cv.projects || []).filter(p => has(p.name)).map(p => ({
    title: p.name.trim(),
    tech: (p.tech || '').trim(),
    url: (p.url || '').trim(),
    bullets: splitLines(p.description),
  }))
  const certifications = (cv.certifications || []).filter(c => has(c.name)).map(c => ({
    title: c.name.trim(), org: (c.issuer || '').trim(), dates: (c.date || '').trim(),
  }))
  const languages = (cv.languages || []).filter(l => has(l.language)).map(l => ({
    name: l.language.trim(), level: (l.proficiency || '').trim(),
  }))
  const awards = (cv.awards || []).filter(a => has(a.name)).map(a => ({
    title: a.name.trim(), org: (a.issuer || '').trim(), dates: (a.date || '').trim(),
    bullets: splitLines(a.description),
  }))
  const references = (cv.references || []).filter(r => has(r.name)).map(r => ({
    name: r.name.trim(),
    role: [r.title, r.company].map(x => (x || '').trim()).filter(Boolean).join(', '),
    contact: [r.email, r.phone].map(x => (x || '').trim()).filter(Boolean),
  }))
  const links = (cv.links || []).filter(l => has(l.url)).map(l => ({ label: (l.label || '').trim(), url: l.url.trim() }))

  return {
    name: (cv.full_name || '').trim(),
    headline: (cv.headline || '').trim(),
    photo: cv.photo || '',
    contact: {
      email: (cv.email || '').trim(),
      phone: (cv.phone || '').trim(),
      location: (cv.location || '').trim(),
      links,
    },
    summary: (cv.summary || '').trim(),
    experience,
    experienceText: experience.length ? '' : (cv.experience || '').trim(),
    education,
    educationText: education.length ? '' : (cv.education || '').trim(),
    skills,
    projects,
    certifications,
    languages,
    awards,
    references,
  }
}

/** Which sections have something to show. */
export function sectionHasContent(m, key) {
  switch (key) {
    case 'summary': return !!m.summary
    case 'experience': return m.experience.length > 0 || !!m.experienceText
    case 'education': return m.education.length > 0 || !!m.educationText
    case 'skills': return m.skills.length > 0
    default: return (m[key] || []).length > 0
  }
}
