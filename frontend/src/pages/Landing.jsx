import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sun, Moon, ChevronDown } from 'lucide-react'
import { AppLogo, Wordmark } from '../AppLogo'
import { getApiBase } from '../api'
import { useTheme } from '../ThemeContext'
import photo480 from '../assets/landing-students-480.webp'
import photo736 from '../assets/landing-students-736.webp'
import photoJpg from '../assets/landing-students-736.jpg'
import './landing.css'

// Real product numbers (CV templates, letter types, AI endpoints, export formats in the backend).
const STATS = [
  { value: '4', label: 'CV templates' },
  { value: '5', label: 'Letter types' },
  { value: '8', label: 'AI writing tools' },
  { value: '2', label: 'Export formats' },
]

const FEATURES = [
  { title: 'AI writing assistant', text: 'Turn rough notes into strong, results-focused bullet points and summaries in seconds.' },
  { title: 'Professional templates', text: 'Clean, recruiter-friendly CV designs you can switch between at any time.' },
  { title: 'Cover & application letters', text: 'Generate tailored letters for jobs and internships, then fine-tune every line.' },
  { title: 'ATS check & tailoring', text: 'Match your CV to a job description and fix the gaps applicant tracking systems look for.' },
  { title: 'PDF & Word export', text: 'Download polished documents ready to upload, print or attach.' },
  { title: 'Application tracker', text: 'Keep every job, deadline, status and the documents you sent in one place.' },
]

const STEPS = [
  { title: 'Create your account', text: 'Sign up free with email or Google in under a minute.' },
  { title: 'Build with a template', text: 'Pick a design, fill in your details and let AI polish the wording.' },
  { title: 'Export, share & apply', text: 'Download as PDF or Word, share a link, or email it straight to employers.' },
]

const FAQS = [
  { q: 'Is CareerDocs free to use?', a: 'Yes. You can create an account and build your CVs, letters and application tracker for free.' },
  { q: 'Can I download my CV as a Word document?', a: 'Yes. Every CV and letter can be exported as a PDF or as an editable Word (.docx) file.' },
  { q: 'What can the AI do for me?', a: 'It rewrites bullet points and summaries, suggests alternative wording, drafts cover letters and emails, tailors your CV to a job description and runs an ATS keyword check.' },
  { q: 'Who can see my documents?', a: 'Your documents are private to your account and are not visible to other users. A CV only becomes public if you create a share link, and you can turn that link off at any time.' },
  { q: 'Do I need a Google account?', a: 'No. Sign up with any email and password, or use Google for one-click sign in.' },
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
          <Link to="/" className="landing-brand" aria-label="CareerDocs home">
            <AppLogo className="landing-brand__mark" alt="" /> <Wordmark />
          </Link>
          <nav className="landing-nav__links" aria-label="Sections">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="landing-nav__actions">
            <button type="button" className="landing-icon-btn" onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <Link to="/login" className="landing-pill-btn landing-pill-btn--dark">Login</Link>
            <Link to="/register" className="landing-pill-btn landing-pill-btn--outline">Register</Link>
          </div>
        </div>
      </header>

      <main>
        {/* ---------- Hero ---------- */}
        <section className="landing-hero">
          <div className="landing-wrap landing-hero__grid">
            <div className="landing-hero__copy">
              <h1>
                Land your next role with a CV that{' '}
                <span className="landing-underline">
                  gets noticed
                  <svg viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden>
                    <path d="M4 16 C 60 6, 140 4, 296 12" />
                  </svg>
                </span>
              </h1>
              <p className="landing-lead">
                Build professional CVs and cover letters, polish them with AI, check them against job
                descriptions and track every application, all in one place.
              </p>
              <div className="landing-ctas">
                <Link to="/register" className="landing-pill-btn landing-pill-btn--dark landing-pill-btn--lg">
                  Get started free
                </Link>
                <Link to="/login" className="landing-textlink">I already have an account</Link>
              </div>
            </div>

            <div className="landing-hero__art">
              <div className="landing-backdrop" aria-hidden />
              <picture>
                <source type="image/webp" srcSet={`${photo480} 480w, ${photo736} 736w`} sizes="(max-width: 900px) 84vw, 42vw" />
                <img className="landing-photo" src={photoJpg} width="736" height="736"
                  alt="Smiling students holding notebooks, celebrating together" fetchPriority="high" decoding="async" />
              </picture>
              <div className="landing-float landing-float--ats" aria-hidden>
                <span>
                  <strong>ATS match</strong>
                  <span className="landing-meter"><span style={{ width: '92%' }} /></span>
                </span>
                <b>92%</b>
              </div>
              <div className="landing-float landing-float--status" aria-hidden>
                <span><strong>Interview invite</strong><small>Graduate Analyst</small></span>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Stats band ---------- */}
        <section className="landing-stats" aria-label="CareerDocs at a glance">
          <div className="landing-wrap landing-stats__row">
            {STATS.map(s => (
              <div key={s.label} className="landing-stat">
                <span className="landing-stat__value">{s.value}</span>
                <span className="landing-stat__label">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section id="features" className="landing-section">
          <div className="landing-wrap landing-features-layout">
            <div className="landing-features-intro">
              <p className="landing-eyebrow">Everything you need</p>
              <h2>From first draft <span className="landing-nowrap">to job offer</span></h2>
              <p className="landing-sub">Tools that take the stress out of writing and organising your applications.</p>
              <Link to="/register" className="landing-pill-btn landing-pill-btn--dark">Start building</Link>
            </div>
            <div className="landing-features">
              {FEATURES.map(f => (
                <article key={f.title} className="landing-card">
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section id="how" className="landing-section landing-section--alt">
          <div className="landing-wrap">
            <div className="landing-section__head">
              <p className="landing-eyebrow">How it works</p>
              <h2>Three steps to a standout application</h2>
            </div>
            <ol className="landing-steps">
              {STEPS.map((s, i) => (
                <li key={s.title} className="landing-step">
                  <span className="landing-step__num">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section id="faq" className="landing-section">
          <div className="landing-wrap landing-faq-layout">
            <div>
              <p className="landing-eyebrow">FAQ</p>
              <h2>Questions, answered</h2>
              <p className="landing-sub">Everything you need to know before you start.</p>
            </div>
            <div className="landing-faq">
              {FAQS.map(f => (
                <details key={f.q} className="landing-faq__item">
                  <summary>{f.q}<ChevronDown size={18} className="landing-faq__chev" aria-hidden /></summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Call to action ---------- */}
        <section className="landing-section landing-section--tight">
          <div className="landing-wrap">
            <div className="landing-cta">
              <div>
                <h2>Ready to build your CV?</h2>
                <p>Create professional documents in minutes and keep every application on track.</p>
              </div>
              <Link to="/register" className="landing-pill-btn landing-pill-btn--light landing-pill-btn--lg">
                Create free account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-wrap">
          <div className="landing-footer__grid">
            <div className="landing-footer__about">
              <span className="landing-brand landing-brand--footer"><AppLogo className="landing-brand__mark" alt="" /> <Wordmark /></span>
              <p>Build CVs and professional letters with AI. Export to PDF or Word and track every application.</p>
            </div>
            <div>
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how">How it works</a>
              <a href="#faq">FAQ</a>
            </div>
            <div>
              <h4>Account</h4>
              <Link to="/login">Login</Link>
              <Link to="/register">Create account</Link>
            </div>
          </div>
          <p className="landing-footer__copy">© {new Date().getFullYear()} CareerDocs. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
