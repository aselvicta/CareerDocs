import { useEffect } from 'react'
import { SITE_NAME, getRouteMeta, jsonLdDocument } from './site'

export const DEFAULT_TITLE = 'CareerDocs: build CVs and cover letters with AI'

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** The <meta>/<link> tags for a route, as [tag, attrs] pairs. */
function tagList(meta) {
  const tags = [
    ['meta', { name: 'description', content: meta.description }],
    ['meta', { name: 'robots', content: meta.robots }],
    ['link', { rel: 'canonical', href: meta.canonical }],
    ['meta', { property: 'og:site_name', content: SITE_NAME }],
    ['meta', { property: 'og:type', content: meta.ogType }],
    ['meta', { property: 'og:title', content: meta.title }],
    ['meta', { property: 'og:description', content: meta.description }],
    ['meta', { property: 'og:url', content: meta.canonical }],
    ['meta', { property: 'og:image', content: meta.image }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: 'CareerDocs: free CV maker and cover letter generator' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: meta.title }],
    ['meta', { name: 'twitter:description', content: meta.description }],
    ['meta', { name: 'twitter:image', content: meta.image }],
  ]
  if (meta.published) tags.push(['meta', { property: 'article:published_time', content: meta.published }])
  return tags
}

/** Head HTML for a public route, used by the build-time prerender. */
export function renderHeadHtml(path) {
  const meta = getRouteMeta(path)
  if (!meta) return null
  const lines = [`<title>${esc(meta.title)}</title>`]
  for (const [tag, attrs] of tagList(meta)) {
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')
    lines.push(`<${tag} ${a} data-seo />`)
  }
  const json = JSON.stringify(jsonLdDocument(meta.jsonLd)).replace(/</g, '\\u003c')
  lines.push(`<script type="application/ld+json" data-seo>${json}</script>`)
  return lines.join('\n    ')
}

/**
 * Keeps <head> in step with client-side navigation: title, description, canonical, robots,
 * Open Graph and JSON-LD for public pages; the app defaults plus noindex for everything else.
 */
export function useSeo(path) {
  useEffect(() => {
    const meta = getRouteMeta(path)
    document.head.querySelectorAll('[data-seo]').forEach(el => el.remove())
    const add = (tag, attrs, text) => {
      const el = document.createElement(tag)
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      el.setAttribute('data-seo', '')
      if (text) el.textContent = text
      document.head.appendChild(el)
    }
    if (!meta) {
      document.title = DEFAULT_TITLE
      add('meta', { name: 'robots', content: 'noindex' })
      return
    }
    document.title = meta.title
    for (const [tag, attrs] of tagList(meta)) add(tag, attrs)
    add('script', { type: 'application/ld+json' }, JSON.stringify(jsonLdDocument(meta.jsonLd)))
  }, [path])
}
