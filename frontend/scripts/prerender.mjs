/**
 * After `vite build` (client, into dist/) and `vite build --ssr` (into dist-ssr/):
 *  - writes one static HTML file per public page, with its own <head> tags and real body content
 *  - keeps the bare app shell as dist/app.html (noindex), served for every other URL (vercel.json)
 *  - writes dist/sitemap.xml
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const ssrEntry = path.join(root, 'dist-ssr', 'entry-server.js')

const { render, PUBLIC_PATHS, SITE_URL, LASTMOD } = await import(pathToFileURL(ssrEntry).href)

const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8')
const SEO_BLOCK = /<!--seo:start-->[\s\S]*?<!--seo:end-->/
if (!SEO_BLOCK.test(template) || !template.includes('<div id="root"></div>')) {
  throw new Error('prerender: dist/index.html is missing the <!--seo:start--> block or the empty #root div')
}

// Every non-public URL (the signed-in app, shared CVs, unknown paths) gets the plain shell.
await fs.writeFile(path.join(dist, 'app.html'), template)

for (const url of PUBLIC_PATHS) {
  const { html, head } = await render(url)
  if (!head) throw new Error(`prerender: no metadata for ${url}`)
  if (!html.includes('<h1')) throw new Error(`prerender: ${url} rendered without an <h1>`)
  const page = template
    .replace(SEO_BLOCK, head)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`)
  // /cv-maker -> dist/cv-maker.html, served at /cv-maker via cleanUrls
  const file = url === '/' ? 'index.html' : `${url.slice(1)}.html`
  await fs.mkdir(path.dirname(path.join(dist, file)), { recursive: true })
  await fs.writeFile(path.join(dist, file), page)
  console.log(`prerendered ${url.padEnd(48)} -> ${file}`)
}

const priority = url => (url === '/' ? '1.0' : url.startsWith('/guides/') ? '0.7' : ['/privacy', '/terms'].includes(url) ? '0.2' : '0.8')
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_PATHS.map(u => `  <url>
    <loc>${SITE_URL}${u}</loc>
${LASTMOD[u] ? `    <lastmod>${LASTMOD[u]}</lastmod>\n` : ''}    <priority>${priority(u)}</priority>
  </url>`).join('\n')}
</urlset>
`
await fs.writeFile(path.join(dist, 'sitemap.xml'), sitemap)
console.log(`sitemap.xml: ${PUBLIC_PATHS.length} URLs`)
