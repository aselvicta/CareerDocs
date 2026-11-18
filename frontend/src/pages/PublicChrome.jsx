import { Link } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { AppLogo, Wordmark } from '../AppLogo'
import { useTheme } from '../ThemeContext'
import { TOOL_PAGES, GUIDES } from '../seo/content'

const TOOL_LABELS = {
  '/cv-maker': 'Free CV maker',
  '/cover-letter-generator': 'Cover letter generator',
  '/application-letter': 'Application letter',
  '/ats-cv-checker': 'ATS CV checker',
  '/graduate-cv': 'CV for graduates',
}

/** Sticky header for signed-out pages. `links` are in-page or site links shown on wide screens. */
export function PublicHeader({ links }) {
  const { theme, toggleTheme } = useTheme()
  const navLinks = links || [
    { to: '/cv-maker', label: 'CV maker' },
    { to: '/templates', label: 'Templates' },
    { to: '/cover-letter-generator', label: 'Cover letters' },
    { to: '/guides', label: 'Guides' },
  ]
  return (
    <header className="lp-nav">
      <div className="lp-wrap lp-nav__inner">
        <Link to="/" className="lp-brand" aria-label="CareerDocs home">
          <AppLogo className="lp-brand__mark" alt="" /> <Wordmark />
        </Link>
        <nav className="lp-nav__links" aria-label="Main">
          {navLinks.map(l => (l.href
            ? <a key={l.href} href={l.href}>{l.label}</a>
            : <Link key={l.to} to={l.to}>{l.label}</Link>))}
        </nav>
        <div className="lp-nav__actions">
          <button type="button" className="lp-icon-btn" onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <Link to="/login" className="lp-link">Log in</Link>
          <Link to="/register" className="lp-btn lp-btn--primary">Build my CV</Link>
        </div>
      </div>
    </header>
  )
}

/** Site footer with links to every tool page and guide, so each public page is reachable by crawlers. */
export function PublicFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap lp-footer__grid">
        <div>
          <span className="lp-brand"><AppLogo className="lp-brand__mark" alt="" /> <Wordmark /></span>
          <p className="lp-footer__about">Free CV maker and cover letter generator with AI writing, ATS checks and application tracking. Built for job seekers in Tanzania and beyond.</p>
        </div>
        <nav aria-label="Tools">
          <h4>Tools</h4>
          {TOOL_PAGES.map(p => <Link key={p.path} to={p.path}>{TOOL_LABELS[p.path] || p.overline}</Link>)}
          <Link to="/templates">CV templates</Link>
        </nav>
        <nav aria-label="Guides">
          <h4>Guides</h4>
          {GUIDES.map(g => <Link key={g.path} to={g.path}>{g.h1.replace(/ \(with a sample\)$/, '')}</Link>)}
          <Link to="/guides">All guides</Link>
        </nav>
        <nav aria-label="Account and legal">
          <h4>CareerDocs</h4>
          <Link to="/login">Log in</Link>
          <Link to="/register">Create account</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
        </nav>
      </div>
      <div className="lp-wrap lp-footer__copy">
        © {new Date().getFullYear()} CareerDocs. All rights reserved. · <Link to="/privacy">Privacy Policy</Link> · <Link to="/terms">Terms of Service</Link>
      </div>
    </footer>
  )
}
