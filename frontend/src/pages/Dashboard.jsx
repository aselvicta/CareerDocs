import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Briefcase, CalendarClock, Check, FileText, FileUp, PenLine, Plus } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { CVDocument } from '../cv/CVDocument'
import { LetterDocument } from '../cv/LetterDocument'
import { ScaledDoc } from '../cv/ScaledDoc'
import { getTemplate } from '../cv/templates'
import { useShell } from '../shell/shellContext'
import { relativeTime, STATUS_LABEL } from '../shell/format'
import '../cv/studio.css'

const PIPELINE = ['draft', 'applied', 'interview', 'offer']

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function daysUntil(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((d - today) / 86400000)
}

export function Dashboard() {
  const { user } = useAuth()
  const { openImport } = useShell()
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.get('/home/').then(setData).catch(() => setError(true))
  }, [])

  const first = (data?.name || user?.username || '').split(/\s+/)[0]
  const isNew = data && data.counts.cvs === 0 && data.counts.letters === 0

  return (
    <div className="home">
      <div className="pg-head">
        <div>
          <h1 className="pg-title">{greeting()}{first ? `, ${first}` : ''}</h1>
          <p className="pg-sub">{isNew ? 'Let us get your first CV done. Start from a template or bring the one you already have.' : 'Pick up where you left off, or start something new.'}</p>
        </div>
      </div>

      <div className="home-actions">
        <Link to="/cv/templates" className="home-action home-action--primary">
          <span className="home-action__icon"><Plus size={20} /></span>
          <span><strong>Create a CV</strong><small>16 templates, live preview</small></span>
        </Link>
        <button type="button" className="home-action" onClick={openImport}>
          <span className="home-action__icon"><FileUp size={20} /></span>
          <span><strong>Import a CV</strong><small>Upload Word or PDF</small></span>
        </button>
        <Link to="/letters/templates" className="home-action">
          <span className="home-action__icon"><PenLine size={20} /></span>
          <span><strong>Write a cover letter</strong><small>Matches your CV</small></span>
        </Link>
        <Link to="/applications/new" className="home-action">
          <span className="home-action__icon"><Briefcase size={20} /></span>
          <span><strong>Track a job</strong><small>Deadlines and status</small></span>
        </Link>
      </div>

      {error && <p className="pg-sub" style={{ marginTop: '2rem' }}>Could not load your workspace. Refresh to try again.</p>}

      {!data && !error && (
        <div className="pg-section">
          <div className="doc-grid">{[0, 1, 2, 3].map(i => <div key={i} className="skel" style={{ aspectRatio: '794 / 1000' }} />)}</div>
        </div>
      )}

      {data && (
        <div className="home-grid">
          <div className="home-main">
            <section className="pg-section">
              <div className="pg-section__head">
                <h2>Recent CVs</h2>
                {data.counts.cvs > 0 && <Link to="/cv">{data.counts.cvs === 1 ? 'Open CVs' : `All ${data.counts.cvs} CVs`} <ArrowRight size={14} style={{ verticalAlign: '-2px' }} /></Link>}
              </div>
              {data.recent_cvs.length ? (
                <div className="doc-grid doc-grid--home">
                  {data.recent_cvs.map(cv => (
                    <div key={cv.id} className="doc-card">
                      <Link to={`/cv/${cv.id}/edit`} className="doc-card__thumb" aria-label={`Edit ${cv.title}`}>
                        <div className="doc-card__page"><ScaledDoc clip><CVDocument cv={cv} /></ScaledDoc></div>
                      </Link>
                      <div className="doc-card__meta">
                        <div className="doc-card__text">
                          <Link to={`/cv/${cv.id}`} className="doc-card__title">{cv.title}</Link>
                          <div className="doc-card__sub">{getTemplate(cv.template).name} · edited {relativeTime(cv.updated_at)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <div className="empty__art" aria-hidden />
                  <h2>No CVs yet</h2>
                  <p>Choose one of 16 designs and fill it in with a live preview, or import the CV you already have and restyle it in seconds.</p>
                  <div className="empty__actions">
                    <Link to="/cv/templates" className="btn btn-primary"><Plus size={16} /> Choose a template</Link>
                    <button type="button" className="btn btn-secondary" onClick={openImport}><FileUp size={16} /> Import Word or PDF</button>
                  </div>
                </div>
              )}
            </section>

            {data.recent_letters.length > 0 && (
              <section className="pg-section">
                <div className="pg-section__head">
                  <h2>Recent letters</h2>
                  <Link to="/letters">{data.counts.letters === 1 ? 'Open letters' : `All ${data.counts.letters} letters`} <ArrowRight size={14} style={{ verticalAlign: '-2px' }} /></Link>
                </div>
                <div className="doc-grid doc-grid--home">
                  {data.recent_letters.map(l => (
                    <div key={l.id} className="doc-card">
                      <Link to={`/letters/${l.id}/edit`} className="doc-card__thumb" aria-label={`Edit ${l.title || 'letter'}`}>
                        <div className="doc-card__page"><ScaledDoc clip><LetterDocument letter={l} date={l.updated_at} /></ScaledDoc></div>
                      </Link>
                      <div className="doc-card__meta">
                        <div className="doc-card__text">
                          <Link to={`/letters/${l.id}`} className="doc-card__title">{l.title || l.letter_type_display}</Link>
                          <div className="doc-card__sub">{l.company || l.letter_type_display} · {relativeTime(l.updated_at)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="home-side">
            <section className="home-card">
              <div className="home-card__head">
                <h2>Job search</h2>
                <Link to="/applications">Board</Link>
              </div>
              <div className="home-pipe">
                {PIPELINE.map(s => (
                  <Link key={s} to={`/applications?status=${s}`} className="home-pipe__cell">
                    <strong>{data.pipeline[s] || 0}</strong>
                    <span>{STATUS_LABEL[s]}</span>
                  </Link>
                ))}
              </div>
              <div className="home-card__sub"><CalendarClock size={15} /> Upcoming deadlines</div>
              {data.upcoming.length ? (
                <ul className="home-deadlines">
                  {data.upcoming.map(a => {
                    const d = daysUntil(a.deadline)
                    return (
                      <li key={a.id}>
                        <Link to={`/applications/${a.id}`}>
                          <span className="home-deadlines__title">{a.job_title}</span>
                          <span className="home-deadlines__org">{a.company}</span>
                        </Link>
                        <span className={`home-deadlines__when ${d <= 3 ? 'is-soon' : ''}`}>{d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `${d} days`}</span>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="home-card__empty">No deadlines coming up. <Link to="/applications/new">Add a job</Link> to keep track.</p>
              )}
            </section>

            <Checklist checks={data.checklist} />
          </aside>
        </div>
      )}
    </div>
  )
}

function Checklist({ checks }) {
  const { openImport } = useShell()
  const items = [
    { key: 'profile', label: 'Complete your profile', hint: 'Fills new CVs and letters for you', to: '/profile' },
    { key: 'cv', label: 'Create or import a CV', hint: 'Start from a template or a file', to: '/cv/templates', alt: openImport },
    { key: 'letter', label: 'Write a matching cover letter', hint: 'Same design as your CV', to: '/letters/templates' },
    { key: 'application', label: 'Track your first application', hint: 'Never miss a deadline', to: '/applications/new' },
    { key: 'shared', label: 'Share your CV with a link', hint: 'Open a CV, then Create share link', to: '/cv' },
  ]
  const done = items.filter(i => checks[i.key]).length
  if (done === items.length) return null
  return (
    <section className="home-card">
      <div className="home-card__head">
        <h2>Getting started</h2>
        <span className="home-card__count">{done} of {items.length}</span>
      </div>
      <div className="home-progress"><span style={{ width: `${(done / items.length) * 100}%` }} /></div>
      <ul className="home-check">
        {items.map(i => (
          <li key={i.key} className={checks[i.key] ? 'is-done' : ''}>
            <span className="home-check__box">{checks[i.key] && <Check size={12} strokeWidth={3} />}</span>
            <Link to={i.to}>
              <strong>{i.label}</strong>
              <small>{i.hint}</small>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
