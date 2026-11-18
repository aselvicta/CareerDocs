import { CONTENT_PAGES, GUIDES, GUIDES_INDEX, TOOL_PAGES, getContentPage } from './content'

/** Canonical origin. The apex domain redirects here (vercel.json). */
export const SITE_URL = 'https://www.getcareerdocs.co.tz'
export const SITE_NAME = 'CareerDocs'
export const OG_IMAGE = `${SITE_URL}/og-image.png`

const HOME = {
  path: '/',
  title: 'Free CV Maker & Cover Letter Generator | CareerDocs Tanzania',
  description: 'Create a professional CV for free. 16 ATS-friendly templates, AI writing help, cover and application letters, an ATS keyword check, and PDF or Word download.',
}

/** Indexable routes that are not content pages. */
const STATIC_PAGES = [
  HOME,
  {
    path: '/templates',
    title: 'Free CV Templates & Matching Cover Letters (PDF & Word) | CareerDocs',
    description: 'Browse 16 free CV templates, from ATS-friendly one-column formats to modern two-column designs, each with a matching cover letter. Download as PDF or Word.',
  },
  { path: '/privacy', title: 'Privacy Policy | CareerDocs', description: 'How CareerDocs collects, uses and protects your personal information.' },
  { path: '/terms', title: 'Terms of Service | CareerDocs', description: 'The terms that apply when you use CareerDocs.' },
]

/** Every public, indexable path: prerendered at build time and listed in sitemap.xml. */
export const PUBLIC_PATHS = [...STATIC_PAGES.map(p => p.path), GUIDES_INDEX.path, ...CONTENT_PAGES.map(p => p.path)]

const ORG_ID = `${SITE_URL}/#organization`

function organization() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/apple-touch-icon.png`,
    areaServed: ['TZ', 'KE', 'UG', 'RW'],
  }
}

function breadcrumbs(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
  }
}

function faqPage(faqs) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
}

/** FAQ shown on the landing page; shared with Landing.jsx so markup and visible text match. */
export const HOME_FAQS = [
  { q: 'Is CareerDocs free to use?', a: 'Yes. You can create an account and build your CVs, letters and application tracker for free.' },
  { q: 'Can I download my CV as a Word document?', a: 'Yes. Every CV and letter can be exported as a PDF or as an editable Word (.docx) file.' },
  { q: 'What does the AI actually do?', a: 'It rewrites bullet points and summaries, suggests alternative wording, drafts cover letters and emails, tailors your CV to a job description and runs an ATS keyword check. You stay in control of every change.' },
  { q: 'Who can see my documents?', a: 'Your documents are private to your account and are not visible to other users. A CV only becomes public if you create a share link, and you can turn that link off at any time.' },
  { q: 'Do I need a Google account?', a: 'No. Sign up with any email and password, or use Google for one-click sign in.' },
]

/**
 * Head metadata for a path: title, description, canonical, robots, Open Graph type and JSON-LD.
 * Returns null for paths that are not public pages (the app shell's defaults apply, with noindex).
 */
export function getRouteMeta(path) {
  const clean = path !== '/' ? path.replace(/\/+$/, '') : '/'
  const canonical = `${SITE_URL}${clean === '/' ? '/' : clean}`
  const base = { canonical, robots: 'index, follow', ogType: 'website', image: OG_IMAGE }

  if (clean === '/') {
    return {
      ...base,
      ...HOME,
      jsonLd: [
        organization(),
        { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, url: `${SITE_URL}/`, publisher: { '@id': ORG_ID }, inLanguage: 'en' },
        {
          '@type': 'WebApplication',
          name: SITE_NAME,
          url: `${SITE_URL}/`,
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Any (web browser)',
          description: HOME.description,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'TZS' },
          featureList: [
            'CV builder with 16 templates',
            'AI cover letter and application letter generator',
            'ATS keyword check against a job description',
            'PDF and Word export',
            'Job application tracker',
          ],
          publisher: { '@id': ORG_ID },
        },
        faqPage(HOME_FAQS),
      ],
    }
  }

  const stat = STATIC_PAGES.find(p => p.path === clean)
  if (stat) {
    return { ...base, ...stat, jsonLd: [breadcrumbs([{ name: 'Home', path: '/' }, { name: stat.title.split(' | ')[0], path: clean }])] }
  }

  if (clean === GUIDES_INDEX.path) {
    return {
      ...base,
      title: GUIDES_INDEX.title,
      description: GUIDES_INDEX.description,
      jsonLd: [
        breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Guides', path: '/guides' }]),
        {
          '@type': 'ItemList',
          itemListElement: GUIDES.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}${g.path}`, name: g.h1 })),
        },
      ],
    }
  }

  const page = getContentPage(clean)
  if (!page) return null
  const isGuide = GUIDES.includes(page)
  const crumbs = isGuide
    ? [{ name: 'Home', path: '/' }, { name: 'Guides', path: '/guides' }, { name: page.h1, path: page.path }]
    : [{ name: 'Home', path: '/' }, { name: page.h1, path: page.path }]
  const jsonLd = [breadcrumbs(crumbs)]
  if (isGuide) {
    jsonLd.push({
      '@type': 'Article',
      headline: page.h1,
      description: page.description,
      datePublished: page.published,
      dateModified: page.updated || page.published,
      mainEntityOfPage: canonical,
      image: OG_IMAGE,
      author: { '@id': ORG_ID, '@type': 'Organization', name: SITE_NAME },
      publisher: organization(),
      inLanguage: 'en',
    })
  }
  if (page.faqs?.length) jsonLd.push(faqPage(page.faqs))
  return {
    ...base,
    title: page.title,
    description: page.description,
    ogType: isGuide ? 'article' : 'website',
    published: isGuide ? page.published : undefined,
    jsonLd,
  }
}

/** Wrap JSON-LD nodes into one @graph document. */
export function jsonLdDocument(nodes) {
  return { '@context': 'https://schema.org', '@graph': nodes }
}

export { TOOL_PAGES, GUIDES }
