import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Sun, Moon, ChevronDown, MapPin, Phone, Send } from 'lucide-react'
import { AppLogo, Wordmark } from '../AppLogo'
import { getApiBase } from '../api'
import { useTheme } from '../ThemeContext'
import photo480 from '../assets/landing-students-480.webp'
import photo736 from '../assets/landing-students-736.webp'
import photoJpg from '../assets/landing-students-736.jpg'
import heroPhoto from '../assets/hero-photo.webp'
import { CVDocument } from '../cv/CVDocument'
import { ScaledDoc } from '../cv/ScaledDoc'
import { SAMPLE_CV } from '../cv/sample'
import { TEMPLATES as ALL_TEMPLATES, getTemplate } from '../cv/templates'
import '../cv/studio.css'
import './landing.css'

// A few real templates rendered with sample content (the full gallery is at /templates).
const SHOWCASE = ['harvard', 'professional', 'modern', 'studio'].map(getTemplate)

const STEPS = [
  { title: 'Pick a template', text: 'Start from a clean, recruiter-friendly layout. You can switch designs at any time without retyping.' },
  { title: 'Fill it in, AI polishes it', text: 'Add your experience in plain words. The AI turns it into clear, results-focused bullet points.' },
  { title: 'Download and apply', text: 'Export to PDF or Word, share a private link, or email it to an employer straight from CareerDocs.' },
]

const FAQS = [
  { q: 'Is CareerDocs free to use?', a: 'Yes. You can create an account and build your CVs, letters and application tracker for free.' },
  { q: 'Can I download my CV as a Word document?', a: 'Yes. Every CV and letter can be exported as a PDF or as an editable Word (.docx) file.' },
  { q: 'What does the AI actually do?', a: 'It rewrites bullet points and summaries, suggests alternative wording, drafts cover letters and emails, tailors your CV to a job description and runs an ATS keyword check. You stay in control of every change.' },
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

/** The hero document: a two column CV with a photo sidebar, built in HTML so it stays crisp at any size. */
function HeroCV() {
  return (
    <div className="lp-doc" aria-hidden>
      <aside className="lp-doc__side">
        <img className="lp-doc__photo" src={heroPhoto} alt="" width="300" height="334" />
        <p className="lp-doc__sh">Contact</p>
        <ul className="lp-doc__contact">
          <li><MapPin size="1em" /> Westlands, Nairobi</li>
          <li><Phone size="1em" /> +254 712 000 000</li>
          <li><Send size="1em" /> brian.otieno@email.com</li>
        </ul>
        <p className="lp-doc__sh">Skills</p>
        <ul className="lp-doc__skills">
          <li>Account management</li>
          <li>CRM (HubSpot, Zoho)</li>
          <li>Customer onboarding</li>
          <li>Sales reporting in Excel</li>
          <li>Conflict resolution</li>
          <li>Team training</li>
        </ul>
        <p className="lp-doc__sh">Languages</p>
        <ul className="lp-doc__skills">
          <li>English, fluent</li>
          <li>Kiswahili, native</li>
        </ul>
      </aside>
      <div className="lp-doc__main">
        <p className="lp-doc__name">Brian Otieno</p>
        <p className="lp-doc__title">Customer Success Lead</p>
        <p className="lp-doc__h">Profile</p>
        <p className="lp-doc__p">
          Customer success professional with five years in fast growing retail and fintech teams. Known for
          turning unhappy accounts into long term clients and for training new staff to do the same.
        </p>
        <p className="lp-doc__h">Experience</p>
        <div className="lp-doc__job">
          <p className="lp-doc__role"><strong>Customer Success Lead</strong><span>2023 to Present</span></p>
          <p className="lp-doc__org">Pesaflow Payments, Nairobi</p>
          <ul>
            <li className="lp-doc__hl">Cut monthly churn from 6% to 3.5% by introducing 30 day onboarding check-ins.</li>
            <li>Lead a team of 6 handling 180 merchant accounts across East Africa.</li>
          </ul>
        </div>
        <div className="lp-doc__job">
          <p className="lp-doc__role"><strong>Account Executive</strong><span>2021 to 2023</span></p>
          <p className="lp-doc__org">Savanna Home Stores, Nairobi</p>
          <ul>
            <li>Grew corporate orders by 45% in two years through repeat business programmes.</li>
            <li>Built the weekly sales report used by regional managers.</li>
          </ul>
        </div>
        <div className="lp-doc__job">
          <p className="lp-doc__role"><strong>Customer Service Associate</strong><span>2019 to 2021</span></p>
          <p className="lp-doc__org">Kilele Telecom, Kisumu</p>
          <ul>
            <li>Resolved 60+ customer queries a day with a 94% satisfaction score.</li>
          </ul>
        </div>
        <p className="lp-doc__h">Education</p>
        <p className="lp-doc__p"><strong>BCom, Marketing</strong>, 2019</p>
        <p className="lp-doc__p lp-doc__muted">Maseno University, Kisumu</p>
      </div>
    </div>
  )
}

/** Moves the hero layers a few pixels with the cursor (desktop only, off for reduced motion). */
function useHeroParallax() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) return undefined
    const zone = el.closest('.lp-hero') || el
    let frame = 0
    const onMove = e => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)))
        const y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)))
        el.style.setProperty('--mx', x.toFixed(3))
        el.style.setProperty('--my', y.toFixed(3))
      })
    }
    const onLeave = () => { el.style.setProperty('--mx', 0); el.style.setProperty('--my', 0) }
    zone.addEventListener('pointermove', onMove)
    zone.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(frame)
      zone.removeEventListener('pointermove', onMove)
      zone.removeEventListener('pointerleave', onLeave)
    }
  }, [])
  return ref
}

/** Brand pattern beside the CV: small marks in the CareerDocs colours. */
function HeroPattern() {
  const marks = []
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 3; c++) {
      const i = r * 3 + c
      const kind = i % 7 === 3 ? 'sq' : i % 5 === 1 ? 'plus' : 'dot'
      marks.push(<span key={i} className={`lp-pat__m lp-pat__m--${kind}`} style={{ '--d': (r + c) % 4 }} />)
    }
  }
  return <div className="lp-pat" aria-hidden>{marks}</div>
}

/** Miniature CV in each template's style, for the template gallery. */
export function Landing() {
  useWarmBackend()
  const { theme, toggleTheme } = useTheme()
  const heroRef = useHeroParallax()

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-wrap lp-nav__inner">
          <Link to="/" className="lp-brand" aria-label="CareerDocs home">
            <AppLogo className="lp-brand__mark" alt="" /> <Wordmark />
          </Link>
          <nav className="lp-nav__links" aria-label="Sections">
            <a href="#templates">Templates</a>
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#faq">FAQ</a>
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

      <main>
        {/* ---------- Hero ---------- */}
        <section className="lp-hero">
          <div className="lp-wrap lp-hero__grid">
            <div className="lp-hero__copy">
              <p className="lp-overline">CV and cover letter builder</p>
              <h1>Build a CV that gets you <mark>the interview.</mark></h1>
              <p className="lp-lead">
                Choose a recruiter-friendly template, let AI sharpen your wording, check it against the
                job description and download it as PDF or Word.
              </p>
              <div className="lp-hero__ctas">
                <Link to="/register" className="lp-btn lp-btn--primary lp-btn--lg">Build my CV</Link>
                <Link to="/register" className="lp-btn lp-btn--ghost lp-btn--lg">Write a cover letter</Link>
              </div>
              <p className="lp-hero__note">Free to start. Already have an account? <Link to="/login">Log in</Link></p>
            </div>

            <div className="lp-hero__visual" ref={heroRef}>
              <span className="lp-hero__block" aria-hidden />
              <HeroPattern />
              <HeroCV />
              <div className="lp-note lp-note--ats" aria-hidden>
                <span className="lp-note__label">ATS keyword match</span>
                <span className="lp-note__score">14 <small>of 16</small></span>
                <span className="lp-bar"><span style={{ width: '87%' }} /></span>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Facts ---------- */}
        <section className="lp-facts" aria-label="What you get">
          <div className="lp-wrap lp-facts__row">
            <p><strong>{ALL_TEMPLATES.length}</strong> CV templates, each with a matching letter</p>
            <p><strong>5</strong> letter types</p>
            <p><strong>8</strong> AI writing tools</p>
            <p><strong>PDF</strong> and <strong>Word</strong> export</p>
          </div>
        </section>

        {/* ---------- Templates ---------- */}
        <section id="templates" className="lp-section">
          <div className="lp-wrap">
            <div className="lp-section__head">
              <p className="lp-overline">Templates</p>
              <h2>Layouts recruiters actually read</h2>
              <p className="lp-sub">Sixteen designs from strict ATS formats to modern two column layouts, each with a matching cover letter. Switch at any time without retyping.</p>
            </div>
            <div className="lp-templates">
              {SHOWCASE.map(t => (
                <Link key={t.id} to="/templates" className="lp-template">
                  <div className="lp-template__frame">
                    <div className="lp-template__page">
                      <ScaledDoc clip><CVDocument cv={SAMPLE_CV} template={t.id} /></ScaledDoc>
                    </div>
                  </div>
                  <div className="lp-template__meta">
                    <h3>{t.name}</h3>
                    <p>{t.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="lp-templates__more">
              <Link to="/templates" className="lp-btn lp-btn--ghost">See all {ALL_TEMPLATES.length} CV and cover letter templates</Link>
            </div>
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section id="how" className="lp-section lp-section--tint">
          <div className="lp-wrap">
            <div className="lp-section__head lp-section__head--left">
              <p className="lp-overline">How it works</p>
              <h2>From blank page to finished CV in three steps</h2>
            </div>
            <ol className="lp-steps">
              {STEPS.map((s, i) => (
                <li key={s.title} className="lp-step">
                  <span className="lp-step__num">{i + 1}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- Features as real examples ---------- */}
        <section id="features" className="lp-section">
          <div className="lp-wrap lp-features">
            <div className="lp-split">
              <div className="lp-split__copy">
                <p className="lp-overline">AI writing</p>
                <h2>Say what you did, the way recruiters want to read it</h2>
                <p className="lp-sub">Write your experience in plain words. CareerDocs rewrites it into specific, results-focused bullet points, and suggests alternatives until it sounds like you.</p>
              </div>
              <div className="lp-card lp-rewrite" aria-label="Example of an AI rewrite">
                <div className="lp-rewrite__row">
                  <span className="lp-tag">Before</span>
                  <p className="lp-rewrite__before">Responsible for handling customer complaints.</p>
                </div>
                <div className="lp-rewrite__row">
                  <span className="lp-tag lp-tag--blue">After</span>
                  <p className="lp-rewrite__after">Resolved 40+ customer issues a week and reduced repeat complaints by 25% through clearer follow-up.</p>
                </div>
                <p className="lp-card__foot">Example output. You review and accept every change.</p>
              </div>
            </div>

            <div className="lp-split lp-split--reverse">
              <div className="lp-split__copy">
                <p className="lp-overline">ATS check and tailoring</p>
                <h2>Tailor your CV to every job description</h2>
                <p className="lp-sub">Paste a job advert to see which keywords your CV already covers and which are missing, then tailor your CV and cover letter to match.</p>
              </div>
              <div className="lp-card lp-ats" aria-label="Example of an ATS keyword check">
                <div className="lp-ats__top">
                  <div>
                    <p className="lp-card__eyebrow">Graduate Analyst</p>
                    <p className="lp-ats__score">86<small>/100</small></p>
                  </div>
                  <span className="lp-bar lp-bar--wide"><span style={{ width: '86%' }} /></span>
                </div>
                <p className="lp-card__label">Found in your CV</p>
                <div className="lp-chips">
                  {['SQL', 'Excel', 'Power BI', 'Reporting', 'Data cleaning', 'Stakeholders'].map(k => <span key={k} className="lp-chip">{k}</span>)}
                </div>
                <p className="lp-card__label">Missing</p>
                <div className="lp-chips">
                  {['Python', 'Forecasting'].map(k => <span key={k} className="lp-chip lp-chip--missing">{k}</span>)}
                </div>
              </div>
            </div>

            <div className="lp-split">
              <div className="lp-split__copy">
                <p className="lp-overline">Letters and tracking</p>
                <h2>Every application, organised in one place</h2>
                <p className="lp-sub">Generate cover letters, internship and job application letters, then track each role with its deadline, status and the exact CV and letter you sent.</p>
              </div>
              <div className="lp-card lp-tracker" aria-label="Example of the application tracker">
                <table>
                  <thead><tr><th>Role</th><th>Deadline</th><th>Status</th></tr></thead>
                  <tbody>
                    <tr><td><strong>Graduate Analyst</strong><span>Northwind Logistics</span></td><td>14 Mar</td><td><span className="lp-status lp-status--interview">Interview</span></td></tr>
                    <tr><td><strong>Data Intern</strong><span>Lakeside Bank</span></td><td>2 Apr</td><td><span className="lp-status lp-status--applied">Applied</span></td></tr>
                    <tr><td><strong>Research Assistant</strong><span>City Health Trust</span></td><td>20 Apr</td><td><span className="lp-status">Draft</span></td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Audience ---------- */}
        <section className="lp-section lp-section--tint">
          <div className="lp-wrap lp-audience">
            <picture>
              <source type="image/webp" srcSet={`${photo480} 480w, ${photo736} 736w`} sizes="(max-width: 900px) 92vw, 44vw" />
              <img className="lp-audience__photo" src={photoJpg} width="736" height="736" loading="lazy" decoding="async"
                alt="Smiling students holding notebooks, celebrating together" />
            </picture>
            <div>
              <p className="lp-overline">Who it is for</p>
              <h2>Made for students and graduates</h2>
              <p className="lp-sub">Whether it is your first CV, an internship application or your first graduate role, CareerDocs helps you present what you have done with confidence.</p>
              <dl className="lp-audience__list">
                <div><dt>First CV</dt><dd>Templates and prompts that make a short work history look focused, not thin.</dd></div>
                <div><dt>Internships and attachments</dt><dd>Ready-made letter types for internship and job applications.</dd></div>
                <div><dt>Graduate job hunt</dt><dd>Tailor each application and keep track of every deadline.</dd></div>
              </dl>
              <Link to="/register" className="lp-btn lp-btn--primary">Create my free account</Link>
            </div>
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section id="faq" className="lp-section">
          <div className="lp-wrap lp-faq-layout">
            <div>
              <p className="lp-overline">FAQ</p>
              <h2>Questions, answered</h2>
              <p className="lp-sub">Can&apos;t find what you need? Sign up and ask the built-in help assistant.</p>
            </div>
            <div className="lp-faq">
              {FAQS.map(f => (
                <details key={f.q} className="lp-faq__item">
                  <summary>{f.q}<ChevronDown size={18} className="lp-faq__chev" aria-hidden /></summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Closing CTA ---------- */}
        <section className="lp-closing">
          <div className="lp-wrap lp-closing__inner">
            <h2>Your next application deserves a better CV.</h2>
            <Link to="/register" className="lp-btn lp-btn--light lp-btn--lg">Build my CV</Link>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer__grid">
          <div>
            <span className="lp-brand"><AppLogo className="lp-brand__mark" alt="" /> <Wordmark /></span>
            <p className="lp-footer__about">CV and cover letter builder with AI writing, ATS checks and application tracking.</p>
          </div>
          <nav aria-label="Product">
            <h4>Product</h4>
            <Link to="/templates">Templates</Link>
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#faq">FAQ</a>
          </nav>
          <nav aria-label="Account">
            <h4>Account</h4>
            <Link to="/login">Log in</Link>
            <Link to="/register">Create account</Link>
          </nav>
        </div>
        <div className="lp-wrap lp-footer__copy">© {new Date().getFullYear()} CareerDocs. All rights reserved.</div>
      </footer>
    </div>
  )
}
