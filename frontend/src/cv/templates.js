/**
 * CV / cover letter template registry.
 * Ids must match backend/documents/catalog.py.
 *
 * Each template is data, not a component: CVDocument reads these flags and the
 * per-template CSS (cvdoc.css, `.cvt-<id>`) adds the finishing details.
 *   aside:   null | 'left' | 'right'      side column for skills, languages, contact
 *   header:  'center' | 'left' | 'split' | 'banner' | 'aside'
 *   heading: section title treatment (CSS hook)
 *   dates:   'right' | 'left'            where entry dates sit
 *   skills:  'inline' | 'tags' | 'list'
 *   photo:   template has a photo slot (shows initials when there is no photo)
 */
export const CATEGORIES = [
  { id: 'all', label: 'All templates' },
  { id: 'ats', label: 'ATS friendly' },
  { id: 'simple', label: 'Simple' },
  { id: 'professional', label: 'Professional' },
  { id: 'modern', label: 'Modern' },
  { id: 'creative', label: 'Creative' },
]

export const TEMPLATES = [
  {
    id: 'classic', name: 'Classic', category: 'ats', font: 'serif', accent: '#111827',
    aside: null, header: 'center', heading: 'rule', dates: 'right', skills: 'inline',
    desc: 'Centred serif header and ruled sections. Safe for any employer and every applicant tracking system.',
  },
  {
    id: 'harvard', name: 'Harvard', category: 'ats', font: 'classic', accent: '#111827',
    aside: null, header: 'center', heading: 'rule', dates: 'right', skills: 'inline',
    order: ['education', 'experience', 'projects', 'skills'],
    desc: 'The university careers office format. Education first, dense and formal. Ideal for students and graduates.',
  },
  {
    id: 'ats', name: 'Clean ATS', category: 'ats', font: 'sans', accent: '#1f2937',
    aside: null, header: 'left', heading: 'caps', dates: 'right', skills: 'inline',
    desc: 'One column, standard headings, no graphics. Parses perfectly in Workday, Greenhouse and Lever.',
  },
  {
    id: 'minimal', name: 'Minimal', category: 'simple', font: 'sans', accent: '#111827',
    aside: null, header: 'left', heading: 'quiet', dates: 'left', skills: 'inline',
    desc: 'Generous white space and a date column. Lets strong content speak for itself.',
  },
  {
    id: 'elegant', name: 'Elegant', category: 'simple', font: 'serif', accent: '#7c5c3b',
    aside: null, header: 'center', heading: 'centered', dates: 'right', skills: 'inline',
    desc: 'Spaced capitals and fine rules. Suits hospitality, law, education and the arts.',
  },
  {
    id: 'professional', name: 'Professional', category: 'professional', font: 'sans', accent: '#0f4c45',
    aside: 'left', header: 'aside', heading: 'rule', dates: 'right', skills: 'list', photo: true,
    desc: 'Dark sidebar with photo, contact and skills. A confident, polished layout for client facing roles.',
  },
  {
    id: 'executive', name: 'Executive', category: 'professional', font: 'serif', accent: '#1e3a5f',
    aside: null, header: 'left', heading: 'side', dates: 'left', skills: 'inline',
    desc: 'Section titles in a left column, serif name and a strong accent rule. Built for senior profiles.',
  },
  {
    id: 'corporate', name: 'Corporate', category: 'professional', font: 'sans', accent: '#1d4ed8',
    aside: null, header: 'split', heading: 'accent', dates: 'right', skills: 'tags', photo: true,
    desc: 'Accent name, photo on the right and coloured headings. Finance, consulting and operations.',
  },
  {
    id: 'timeline', name: 'Timeline', category: 'professional', font: 'sans', accent: '#0f766e',
    aside: null, header: 'split', heading: 'accent', dates: 'right', skills: 'tags', photo: true, timeline: true,
    desc: 'Experience on a vertical timeline that shows progression at a glance.',
  },
  {
    id: 'modern', name: 'Modern', category: 'modern', font: 'sans', accent: '#1e3a5f',
    aside: 'right', header: 'banner', heading: 'bar', dates: 'right', skills: 'tags', photo: true,
    desc: 'Solid colour header with photo and a two column body. Clear and contemporary.',
  },
  {
    id: 'nova', name: 'Nova', category: 'modern', font: 'sans', accent: '#be123c',
    aside: 'right', header: 'left', heading: 'bar', dates: 'right', skills: 'tags',
    desc: 'Large name, tinted side column and crisp accent marks. Marketing, product and media.',
  },
  {
    id: 'slate', name: 'Slate', category: 'modern', font: 'sans', accent: '#334155',
    aside: 'right', header: 'banner', heading: 'caps', dates: 'right', skills: 'list', photo: true,
    desc: 'Dark header band and a calm grey palette. Works for almost any industry.',
  },
  {
    id: 'metro', name: 'Metro', category: 'modern', font: 'sans', accent: '#2563eb',
    aside: 'left', header: 'aside', heading: 'accent', dates: 'right', skills: 'tags', photo: true, tint: true,
    desc: 'Light tinted sidebar, round photo and accent headings. Friendly and modern.',
  },
  {
    id: 'studio', name: 'Studio', category: 'creative', font: 'sans', accent: '#3f5e66',
    aside: 'left', header: 'left', heading: 'rule', dates: 'right', skills: 'list', photo: true,
    desc: 'Photo topped sidebar with a heavy rule under your name. Retail, hospitality and design.',
  },
  {
    id: 'bold', name: 'Bold', category: 'creative', font: 'sans', accent: '#111827',
    aside: null, header: 'left', heading: 'block', dates: 'right', skills: 'tags',
    desc: 'Oversized name and solid heading labels. Makes an immediate impression.',
  },
  {
    id: 'mono', name: 'Mono', category: 'creative', font: 'mono', accent: '#166534',
    aside: null, header: 'left', heading: 'mono', dates: 'right', skills: 'tags',
    desc: 'Monospace headings and tag style skills. Made for developers and data people.',
  },
]

export const TEMPLATE_IDS = TEMPLATES.map(t => t.id)
const BY_ID = Object.fromEntries(TEMPLATES.map(t => [t.id, t]))
export function getTemplate(id) {
  return BY_ID[id] || BY_ID.classic
}

export const ACCENTS = [
  { hex: '#111827', name: 'Ink' },
  { hex: '#334155', name: 'Slate' },
  { hex: '#1e3a5f', name: 'Navy' },
  { hex: '#1d4ed8', name: 'Blue' },
  { hex: '#0f766e', name: 'Teal' },
  { hex: '#0f4c45', name: 'Forest' },
  { hex: '#166534', name: 'Green' },
  { hex: '#3f5e66', name: 'Steel' },
  { hex: '#7c5c3b', name: 'Bronze' },
  { hex: '#b45309', name: 'Amber' },
  { hex: '#be123c', name: 'Crimson' },
  { hex: '#6b21a8', name: 'Plum' },
]

export const FONTS = [
  { id: 'sans', label: 'Sans', sample: 'Aa', css: "'DM Sans', 'Helvetica Neue', Arial, sans-serif" },
  { id: 'serif', label: 'Serif', sample: 'Aa', css: "'Source Serif 4', Georgia, serif" },
  { id: 'classic', label: 'Times', sample: 'Aa', css: "Georgia, 'Times New Roman', Times, serif" },
  { id: 'mono', label: 'Mono', sample: 'Aa', css: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace" },
]

export const DENSITIES = [
  { id: 'compact', label: 'Compact' },
  { id: 'normal', label: 'Normal' },
  { id: 'airy', label: 'Spacious' },
]

export const SECTIONS = [
  { key: 'summary', label: 'Profile' },
  { key: 'experience', label: 'Experience' },
  { key: 'education', label: 'Education' },
  { key: 'skills', label: 'Skills' },
  { key: 'projects', label: 'Projects' },
  { key: 'certifications', label: 'Certifications' },
  { key: 'languages', label: 'Languages' },
  { key: 'awards', label: 'Awards' },
  { key: 'references', label: 'References' },
]
export const SECTION_LABEL = Object.fromEntries(SECTIONS.map(s => [s.key, s.label]))

/** Sections that move to the side column in two column templates. */
export const ASIDE_SECTIONS = ['skills', 'languages', 'certifications']

/** Merge a stored design with the template's defaults. */
export function resolveDesign(templateId, design = {}) {
  const t = getTemplate(templateId)
  const d = design || {}
  const base = t.order || []
  const stored = (d.section_order || []).filter(k => SECTION_LABEL[k])
  const order = stored.length ? stored : [...base]
  for (const s of SECTIONS) if (!order.includes(s.key)) order.push(s.key)
  // Profile summary always leads unless the user moved it.
  if (!stored.length && order[0] !== 'summary') {
    order.splice(order.indexOf('summary'), 1)
    order.unshift('summary')
  }
  return {
    template: t,
    accent: /^#[0-9a-f]{6}$/i.test(d.accent || '') ? d.accent : t.accent,
    font: FONTS.some(f => f.id === d.font) ? d.font : t.font,
    density: DENSITIES.some(x => x.id === d.density) ? d.density : 'normal',
    order,
    hidden: new Set((d.hidden || []).filter(k => SECTION_LABEL[k])),
    showPhoto: d.show_photo !== false,
  }
}

export function fontCss(id) {
  return (FONTS.find(f => f.id === id) || FONTS[0]).css
}
