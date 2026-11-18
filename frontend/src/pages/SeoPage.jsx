import { Fragment, useEffect } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ChevronDown, Clock } from 'lucide-react'
import { PublicHeader, PublicFooter } from './PublicChrome'
import { GUIDES, GUIDES_INDEX, getContentPage } from '../seo/content'
import './landing.css'
import './seo.css'

/** Inline **bold** and [text](/path) in content strings. */
function Rich({ text }) {
  const parts = []
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[1]) parts.push(<strong key={m.index}>{m[1]}</strong>)
    else parts.push(m[3].startsWith('/')
      ? <Link key={m.index} to={m[3]}>{m[2]}</Link>
      : <a key={m.index} href={m[3]} rel="noopener">{m[2]}</a>)
    last = re.lastIndex
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

function Block({ block }) {
  const [kind, a, b] = block
  switch (kind) {
    case 'h2': return <h2>{a}</h2>
    case 'h3': return <h3>{a}</h3>
    case 'p': return <p><Rich text={a} /></p>
    case 'ul': return <ul>{a.map((t, i) => <li key={i}><Rich text={t} /></li>)}</ul>
    case 'ol': return <ol>{a.map((t, i) => <li key={i}><Rich text={t} /></li>)}</ol>
    case 'tip': return <p className="sp-tip"><strong>Tip:</strong> <Rich text={a} /></p>
    case 'example': return (
      <figure className="sp-example">
        <figcaption>{a}</figcaption>
        <div className="sp-example__doc">{b.split('\n').map((line, i) => <Fragment key={i}>{line}<br /></Fragment>)}</div>
      </figure>
    )
    default: return null
  }
}

function Faqs({ faqs }) {
  if (!faqs?.length) return null
  return (
    <section className="sp-faq" aria-labelledby="sp-faq-h">
      <h2 id="sp-faq-h">Frequently asked questions</h2>
      <div className="lp-faq">
        {faqs.map(f => (
          <details key={f.q} className="lp-faq__item">
            <summary>{f.q}<ChevronDown size={18} className="lp-faq__chev" aria-hidden /></summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function Related({ paths }) {
  const pages = (paths || []).map(getContentPage).filter(Boolean)
  if (!pages.length) return null
  return (
    <aside className="sp-related" aria-labelledby="sp-related-h">
      <h2 id="sp-related-h">Keep reading</h2>
      <ul>
        {pages.map(p => (
          <li key={p.path}>
            <Link to={p.path}>
              <span className="sp-related__title">{p.h1}</span>
              <span className="sp-related__desc">{p.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}

function Crumbs({ items }) {
  return (
    <nav className="sp-crumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((it, i) => (
          <li key={it.to}>{i < items.length - 1 ? <Link to={it.to}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}</li>
        ))}
      </ol>
    </nav>
  )
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${d} ${months[m - 1]} ${y}`
}

function Shell({ children }) {
  return (
    <div className="lp">
      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  )
}

function ToolPage({ page }) {
  return (
    <Shell>
      <main>
        <section className="sp-hero">
          <div className="lp-wrap sp-narrow">
            <Crumbs items={[{ to: '/', label: 'Home' }, { to: page.path, label: page.overline }]} />
            <p className="lp-overline">{page.overline}</p>
            <h1>{page.h1}</h1>
            <p className="lp-lead">{page.lead}</p>
            <div className="lp-hero__ctas">
              <Link to={page.cta.to} className="lp-btn lp-btn--primary lp-btn--lg">{page.cta.label}</Link>
              <Link to="/templates" className="lp-btn lp-btn--ghost lp-btn--lg">See templates</Link>
            </div>
            <p className="lp-hero__note">Free to use. Download as PDF or Word.</p>
          </div>
        </section>
        <div className="lp-wrap sp-narrow sp-body">
          {page.body.map((b, i) => <Block key={i} block={b} />)}
          <Faqs faqs={page.faqs} />
          <Related paths={page.related} />
        </div>
        <Closing text="Your next application deserves a better CV." cta={page.cta} />
      </main>
    </Shell>
  )
}

function GuidePage({ page }) {
  return (
    <Shell>
      <main>
        <article>
          <header className="sp-hero sp-hero--guide">
            <div className="lp-wrap sp-narrow">
              <Crumbs items={[{ to: '/', label: 'Home' }, { to: '/guides', label: 'Guides' }, { to: page.path, label: page.h1 }]} />
              <h1>{page.h1}</h1>
              <p className="lp-lead">{page.lead}</p>
              <p className="sp-meta">
                <span>By the CareerDocs team</span>
                <span>Updated <time dateTime={page.updated || page.published}>{formatDate(page.updated || page.published)}</time></span>
                <span><Clock size={14} aria-hidden /> {page.readMinutes} min read</span>
              </p>
            </div>
          </header>
          <div className="lp-wrap sp-narrow sp-body">
            {page.body.map((b, i) => <Block key={i} block={b} />)}
            {page.cta && (
              <div className="sp-cta">
                <p>{page.cta.text}</p>
                <Link to={page.cta.to} className="lp-btn lp-btn--primary">{page.cta.label}</Link>
              </div>
            )}
            <Faqs faqs={page.faqs} />
            <Related paths={page.related} />
          </div>
        </article>
      </main>
    </Shell>
  )
}

function GuidesIndex() {
  return (
    <Shell>
      <main>
        <section className="sp-hero">
          <div className="lp-wrap sp-narrow">
            <Crumbs items={[{ to: '/', label: 'Home' }, { to: '/guides', label: 'Guides' }]} />
            <h1>{GUIDES_INDEX.h1}</h1>
            <p className="lp-lead">{GUIDES_INDEX.lead}</p>
          </div>
        </section>
        <div className="lp-wrap sp-narrow sp-body">
          <ul className="sp-guides">
            {GUIDES.map(g => (
              <li key={g.path}>
                <Link to={g.path}>
                  <h2>{g.h1}</h2>
                  <p>{g.description}</p>
                  <span className="sp-guides__meta">{g.readMinutes} min read</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <Closing text="Put the advice to work: build your CV for free." cta={{ to: '/register', label: 'Build my CV' }} />
      </main>
    </Shell>
  )
}

function Closing({ text, cta }) {
  return (
    <section className="lp-closing">
      <div className="lp-wrap lp-closing__inner">
        <h2>{text}</h2>
        <Link to={cta.to} className="lp-btn lp-btn--light lp-btn--lg">{cta.label}</Link>
      </div>
    </section>
  )
}

/** Renders the public content page for the current path (feature pages, guides, guide index). */
export function SeoPage() {
  const { pathname } = useLocation()
  const path = pathname.replace(/\/+$/, '') || '/'
  useEffect(() => { if (typeof window !== 'undefined') window.scrollTo(0, 0) }, [path])
  if (path === GUIDES_INDEX.path) return <GuidesIndex />
  const page = getContentPage(path)
  if (!page) return <Navigate to="/guides" replace />
  return GUIDES.includes(page) ? <GuidePage page={page} /> : <ToolPage page={page} />
}
