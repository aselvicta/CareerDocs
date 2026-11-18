/* eslint-disable react-refresh/only-export-components -- build-time entry, never hot-reloaded */
/**
 * Build-time renderer for public pages (see scripts/prerender.mjs). Renders the same route tree as
 * the browser app, signed out, so crawlers and link previews get real HTML instead of an empty div.
 */
import { prerenderToNodeStream } from 'react-dom/static'
import { StaticRouter } from 'react-router-dom'
import { AppTree } from './App'
import { renderHeadHtml } from './seo/head'
import { PUBLIC_PATHS, SITE_URL } from './seo/site'
import { GUIDES } from './seo/content'

export { PUBLIC_PATHS, SITE_URL }

/** Real last-modified dates where we have them (guides); other pages omit <lastmod>. */
export const LASTMOD = Object.fromEntries(GUIDES.map(g => [g.path, g.updated || g.published]))

export async function render(url) {
  const { prelude } = await prerenderToNodeStream(
    <StaticRouter location={url}>
      <AppTree />
    </StaticRouter>,
  )
  let html = ''
  for await (const chunk of prelude) html += chunk
  return { html, head: renderHeadHtml(url) }
}
