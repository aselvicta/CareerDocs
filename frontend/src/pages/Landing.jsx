import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles, LayoutTemplate, Mail, FileDown, Briefcase, ArrowRight, CheckCircle2, Gauge,
  PenLine, Send, Sun, Moon,
} from 'lucide-react'
import { AppLogo } from '../AppLogo'
import { getApiBase } from '../api'
import { useTheme } from '../ThemeContext'
import photo480 from '../assets/landing-students-480.webp'
import photo736 from '../assets/landing-students-736.webp'
import photoJpg from '../assets/landing-students-736.jpg'
import './landing.css'

const FEATURES = [
  { icon: Sparkles, title: 'AI writing assistant', text: 'Turn rough notes into strong, results-focused bullet points and summaries in seconds.' },
  { icon: LayoutTemplate, title: 'Professional templates', text: 'Clean, recruiter-friendly CV designs you can switch between at any time.' },
  { icon: Mail, title: 'Cover & application letters', text: 'Generate tailored letters for jobs, internships and attachments, then fine-tune them.' },
  { icon: Gauge, title: 'ATS check & tailoring', text: 'See how your CV matches a job description and tailor it to pass applicant tracking systems.' },
  { icon: FileDown, title: 'PDF & Word export', text: 'Download polished documents ready to upload, print or attach.' },
  { icon: Briefcase, title: 'Application tracker', text: 'Keep every job, deadline, status and the documents you sent in one place.' },
]

const STEPS = [
  { icon: PenLine, title: 'Create your account', text: 'Sign up free with email or Google — it takes under a minute.' },
  { icon: LayoutTemplate, title: 'Build with a template', text: 'Pick a design, fill in your details and let AI polish the wording.' },
  { icon: Send, title: 'Export, share & apply', text: 'Download as PDF or Word, share a link, or email it straight to employers.' },
]

/** Wake the backend (free hosting sleeps when idle) while the visitor reads, so sign-in is fast. */
function useWarmBackend() {
  useEffect(() => {
    const api = getApiBase()
    if (!/^https?:\/\//.test(api)) return // local dev: Vite proxies /api, backend already running
    const origin = api.replace(/\/api$/, '')
    fetch(`${origin}/health/`, { mode: 'no-cors', cache: 'no-store' }).catch(() => {})
  }, [])
}

export function Landing() {
  useWarmBackend()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-wrap landing-nav__inner">
          <Link to="/" className="landing-nav__brand">
            <AppLogo className="app-logo--nav" alt="" /> <span>Career Docs</span>
          </Link>
          <nav className="landing-nav__links" aria-label="Sections">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
          </nav>
          <div className="landing-nav__actions">
            <button type="button" className="nav__theme" onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <Link to="/login" className="btn btn-ghost">Sign in</Link>
            <Link to="/register" className="btn btn-primary landing-nav__cta">Get started</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-wrap landing-hero__grid">
            <div className="landing-hero__copy">
              <p className="landing-pill"><Sparkles size={14} aria-hidden /> AI-powered career documents</p>
              <h1>
                Land your next role with a CV that <span className="landing-accent">gets noticed</span>
              </h1>
              <p className="landing-lead">
                Build professional CVs and cover letters, polish them with AI, check them against job
                descriptions, and track every application — all in one place.
              </p>
              <div className="landing-ctas">
                <Link to="/register" className="btn btn-primary landing-btn-lg">
                  Get started free <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="btn btn-secondary landing-btn-lg">I have an account</Link>
              </div>
              <ul className="landing-trust">
                <li><CheckCircle2 size={16} aria-hidden /> Free to use</li>
                <li><CheckCircle2 size={16} aria-hidden /> PDF &amp; Word export</li>
                <li><CheckCircle2 size={16} aria-hidden /> Sign in with Google</li>
              </ul>
            </div>

            <div className="landing-hero__art">
              <div className="landing-blob" aria-hidden />
              <picture>
                <source type="image/webp" srcSet={`${photo480} 480w, ${photo736} 736w`} sizes="(max-width: 900px) 80vw, 460px" />
                <img
                  className="landing-photo"
                  src={photoJpg}
                  width="736"
                  height="736"
                  alt="Smiling students holding notebooks, celebrating together"
                  fetchPriority="high"
                  decoding="async"
                />
              </picture>
              <div className="landing-float landing-float--ats" aria-hidden>
                <span className="landing-float__icon"><Gauge size={16} /></span>
                <span>
                  <strong>ATS match</strong>
                  <span className="landing-meter"><span style={{ width: '92%' }} /></span>
                </span>
                <b>92%</b>
              </div>
              <div className="landing-float landing-float--export" aria-hidden>
                <span className="landing-float__icon landing-float__icon--ok"><FileDown size={16} /></span>
                <span><strong>CV exported</strong><small>Ready to send · PDF</small></span>
              </div>
              <div className="landing-float landing-float--status" aria-hidden>
                <span className="landing-float__icon"><Briefcase size={16} /></span>
                <span><strong>Interview</strong><small>Graduate Analyst</small></span>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="landing-section">
          <div className="landing-wrap">
            <div className="landing-section__head">
              <p className="landing-eyebrow">Everything you need</p>
              <h2>From first draft to job offer</h2>
              <p className="landing-sub">Tools that take the stress out of writing and organising your applications.</p>
            </div>
            <div className="landing-features">
              {FEATURES.map(f => {
                const Icon = f.icon
                return (
                  <article key={f.title} className="landing-card">
                    <span className="landing-card__icon"><Icon size={20} aria-hidden /></span>
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section id="how" className="landing-section landing-section--alt">
          <div className="landing-wrap">
            <div className="landing-section__head">
              <p className="landing-eyebrow">How it works</p>
              <h2>Three steps to a standout application</h2>
            </div>
            <ol className="landing-steps">
              {STEPS.map((s, i) => {
                const Icon = s.icon
                return (
                  <li key={s.title} className="landing-step">
                    <span className="landing-step__num">{i + 1}</span>
                    <Icon size={22} className="landing-step__icon" aria-hidden />
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </li>
                )
              })}
            </ol>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-wrap">
            <div className="landing-cta">
              <div>
                <h2>Ready to build your CV?</h2>
                <p>Join students and graduates creating professional documents in minutes.</p>
              </div>
              <div className="landing-cta__actions">
                <Link to="/register" className="btn landing-btn-light landing-btn-lg">
                  Create free account <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="landing-cta__link">Sign in <ArrowRight size={14} aria-hidden /></Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-wrap landing-footer__inner">
          <span className="landing-nav__brand"><AppLogo className="app-logo--nav" alt="" /> Career Docs</span>
          <span className="muted">© {new Date().getFullYear()} Career Docs. Build CVs and letters with AI.</span>
        </div>
      </footer>
    </div>
  )
}
