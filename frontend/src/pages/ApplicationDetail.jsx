import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, ExternalLink, FileText, Mail, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../ToastContext'
import { ConfirmDialog } from '../shell/Modal'
import { STATUS_LABEL, relativeTime, shortDate } from '../shell/format'
import { gmailThreadUrl } from '../shell/useSenders'

const STAGES = ['draft', 'applied', 'interview', 'offer']

export function ApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [app, setApp] = useState(undefined)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get(`/applications/${id}/`).then(setApp).catch(() => setApp(null))
  }, [id])

  async function setStatus(status) {
    const prev = app
    setApp(a => ({ ...a, status }))
    try {
      setApp(await api.patch(`/applications/${id}/`, { status }))
    } catch (e) {
      setApp(prev)
      addToast(e?.message || 'Could not update.', 'error')
    }
  }
  async function remove() {
    setBusy(true)
    try {
      await api.delete(`/applications/${id}/`)
      addToast('Job removed.', 'success')
      navigate('/applications')
    } catch (e) { addToast(e?.message || 'Delete failed.', 'error'); setBusy(false) }
  }

  if (app === undefined) return <div className="skel" style={{ height: 360, maxWidth: 900 }} />
  if (app === null) return <div className="empty"><h2>Job not found</h2><p>It may have been deleted.</p><Link to="/applications" className="btn btn-primary">Back to applications</Link></div>

  const closed = ['rejected', 'withdrawn'].includes(app.status)
  const stageIndex = STAGES.indexOf(app.status)

  return (
    <div className="ad">
      <Link to="/applications" className="dv-crumb"><ArrowLeft size={14} style={{ verticalAlign: '-2px' }} /> Applications</Link>
      <div className="pg-head" style={{ marginTop: '0.4rem' }}>
        <div>
          <h1 className="pg-title">{app.job_title}</h1>
          <p className="pg-sub">{app.company || 'Company not set'} · <span className={`status-pill status-pill--${app.status}`}>{STATUS_LABEL[app.status]}</span></p>
        </div>
        <div className="pg-actions">
          {app.job_url && <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary"><ExternalLink size={16} /> Advert</a>}
          <Link to={`/applications/${id}/edit`} className="btn btn-secondary"><Pencil size={16} /> Edit</Link>
          <Link to={`/compose?application=${id}`} className="btn btn-primary"><Send size={16} /> {app.email_sent_at ? 'Email again' : 'Email application'}</Link>
          <button type="button" className="btn btn-ghost" onClick={() => setConfirm(true)} aria-label="Delete"><Trash2 size={16} /></button>
        </div>
      </div>

      <section className="ad-stages" aria-label="Stage">
        {STAGES.map((s, i) => (
          <button key={s} type="button" className={`ad-stage ${!closed && i <= stageIndex ? 'is-done' : ''} ${app.status === s ? 'is-current' : ''}`} onClick={() => setStatus(s)}>
            <span className="ad-stage__n">{i + 1}</span> {STATUS_LABEL[s]}
          </button>
        ))}
        <div className="ad-stages__closed">
          <button type="button" className={`ed-chip ${app.status === 'rejected' ? 'is-active' : ''}`} onClick={() => setStatus('rejected')}>Rejected</button>
          <button type="button" className={`ed-chip ${app.status === 'withdrawn' ? 'is-active' : ''}`} onClick={() => setStatus('withdrawn')}>Withdrawn</button>
        </div>
      </section>

      <div className="ad-grid">
        <div className="ad-main">
        <section className="home-card">
          <div className="home-card__head"><h2>Sent email</h2></div>
          {app.email_sent_at ? (
            <>
              <dl className="ad-dl">
                <dt>Subject</dt><dd>{app.email_subject || '(no subject)'}</dd>
                <dt>To</dt><dd>{app.email_sent_to}</dd>
                <dt>From</dt><dd>{app.email_sent_from || 'CareerDocs'}</dd>
                <dt>Sent</dt><dd>{shortDate(app.email_sent_at)} ({relativeTime(app.email_sent_at)})</dd>
              </dl>
              {app.gmail_thread_id && app.email_sent_from && (
                <a className="btn btn-secondary btn--sm ad-gmail" href={gmailThreadUrl(app.email_sent_from, app.gmail_thread_id)} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14} /> Open conversation in Gmail
                </a>
              )}
            </>
          ) : (
            <p className="home-card__empty">Send your CV and cover letter for this job from your Gmail. The email is saved here and the job moves to Applied.</p>
          )}
        </section>
        <section className="home-card">
          <div className="home-card__head"><h2>Notes</h2><Link to={`/applications/${id}/edit`}>Edit</Link></div>
          {app.notes ? <p className="whitespace ad-notes">{app.notes}</p> : <p className="home-card__empty">Add the recruiter's name, interview times or anything you want to remember.</p>}
        </section>
        </div>
        <div className="ad-side">
          <section className="home-card">
            <div className="home-card__head"><h2>Details</h2></div>
            <dl className="ad-dl">
              <dt><CalendarClock size={14} /> Deadline</dt><dd>{app.deadline ? shortDate(app.deadline) : 'Not set'}</dd>
              <dt>Added</dt><dd>{shortDate(app.created_at)}</dd>
              <dt>Last update</dt><dd>{relativeTime(app.updated_at)}</dd>
            </dl>
          </section>
          <section className="home-card">
            <div className="home-card__head"><h2>Documents</h2></div>
            {app.cv
              ? <Link to={`/cv/${app.cv}`} className="dv-item dv-item--plain"><FileText size={17} /><span>{app.cv_title || 'CV'}</span></Link>
              : <Link to="/cv" className="dv-item dv-item--plain"><Plus size={17} /><span>Attach a CV in Edit</span></Link>}
            {app.letter
              ? <Link to={`/letters/${app.letter}`} className="dv-item dv-item--plain"><Mail size={17} /><span>{app.letter_title || 'Cover letter'}</span></Link>
              : <Link to={`/letters/templates`} className="dv-item dv-item--plain"><Plus size={17} /><span>Write a cover letter</span></Link>}
          </section>
        </div>
      </div>

      <ConfirmDialog open={confirm} title="Remove this job?" body="The job and its notes will be deleted. Your CV and letter are not affected." busy={busy} onConfirm={remove} onClose={() => setConfirm(false)} confirmLabel="Remove" />
    </div>
  )
}
