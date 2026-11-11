import { fontCss } from './templates'

/** Readable text colour (dark or white) for a given background hex. */
export function onColor(hex) {
  const h = (hex || '#000000').replace('#', '')
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.4 ? '#111827' : '#ffffff'
}

/** CSS custom properties shared by CV and letter documents. */
export function docStyle(d) {
  const head = d.font === 'mono' ? fontCss('mono') : fontCss(d.font)
  const body = d.font === 'mono' ? fontCss('sans') : fontCss(d.font)
  return {
    '--cv-accent': d.accent,
    '--cv-on-accent': onColor(d.accent),
    '--cv-font': body,
    '--cv-head': head,
  }
}

export function docClass(d, kind = 'cv') {
  const t = d.template
  return [
    'cvd', `cvd--${kind}`, `cvt-${t.id}`,
    `cvd--aside-${t.aside || 'none'}`,
    `cvd--header-${t.header}`,
    `cvd--h-${t.heading}`,
    `cvd--dates-${t.dates}`,
    `cvd--${d.density}`,
    t.tint ? 'cvd--tint' : '',
  ].filter(Boolean).join(' ')
}

