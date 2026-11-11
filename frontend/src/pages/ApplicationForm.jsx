import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../ToastContext'
import { STATUS_LABEL } from '../shell/format'

const STATUSES = Object.keys(STATUS_LABEL)
const EMPTY = { job_title: '', company: '', job_url: '', deadline: '', status: 'draft', cv: null, letter: null, notes: '' }

export function ApplicationForm() {
  const { id } = useParams()
  const isEdit = !!id
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [form, setForm] = useState(() => ({ ...EMPTY, status: STATUSES.includes(sp.get('status')) ? sp.get('status') : 'draft' }))
  const [cvs, setCvs] = useState([])
  const [letters, setLetters] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/cvs/?limit=100').then(d => setCvs(Array.isArray(d) ? d : [])).catch(() => {})
    api.get('/letters/?limit=100').then(d => setLetters(Array.isArray(d) ? d : [])).catch(() => {})
    if (!isEdit) return
    api.get(`/applications/${id}/`).then(app => setForm({
      job_title: app.job_title || '', company: app.company || '', job_url: app.job_url || '',
      deadline: app.deadline ? app.deadline.slice(0, 10) : '', status: app.status || 'draft',
      cv: app.cv || null, letter: app.letter || null, notes: app.notes || '',
    })).catch(() => addToast('Could not load this application.', 'error')).finally(() => setLoading(false))
  }, [id, isEdit, addToast])

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    if (!form.job_title.trim()) { addToast('Add the job title.', 'warning'); return }
    setSaving(true)
    const payload = {
      job_title: form.job_title.trim(), company: form.company.trim(), job_url: form.job_url.trim() || '',
      deadline: form.deadline || null, status: form.status, cv: form.cv || null, letter: form.letter || null, notes: form.notes.trim(),
    }
    try {
      const saved = isEdit ? await api.patch(`/applications/${id}/`, payload) : await api.post('/applications/', payload)
      addToast(isEdit ? 'Saved.' : 'Job added to your board.', 'success')
      navigate(`/applications/${saved.id || id}`)
    } catch (err) {
      addToast(err?.message || 'Save failed.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="skel" style={{ height: 420, maxWidth: 760 }} />

  return (
    <div className="af">
      <Link to={isEdit ? `/applications/${id}` : '/applications'} className="dv-crumb"><ArrowLeft size={14} style={{ verticalAlign: '-2px' }} /> {isEdit ? 'Back to job' : 'Applications'}</Link>
      <div className="pg-head" style={{ marginTop: '0.4rem' }}>
        <div>
          <h1 className="pg-title">{isEdit ? 'Edit job' : 'Add a job'}</h1>
          <p className="pg-sub">Keep the advert, deadline and the documents you sent in one place.</p>
        </div>
      </div>
      <form onSubmit={submit} className="af-card">
        <section className="af-sec">
          <h2>The job</h2>
          <div className="ed-grid">
            <label className="ed-field"><span className="ed-field__label">Job title</span>
              <input className="form-control" value={form.job_title} onChange={e => update('job_title', e.target.value)} placeholder="Graduate Data Analyst" required autoFocus />
            </label>
            <label className="ed-field"><span className="ed-field__label">Company</span>
              <input className="form-control" value={form.company} onChange={e => update('company', e.target.value)} placeholder="Equity Bank" />
            </label>
            <label className="ed-field"><span className="ed-field__label">Link to the advert</span>
              <input className="form-control" type="url" value={form.job_url} onChange={e => update('job_url', e.target.value)} placeholder="https://" />
            </label>
            <label className="ed-field"><span className="ed-field__label">Deadline</span>
              <input className="form-control" type="date" value={form.deadline} onChange={e => update('deadline', e.target.value)} />
            </label>
          </div>
        </section>

        <section className="af-sec">
          <h2>Stage</h2>
          <div className="ed-chips">
            {STATUSES.map(s => (
              <button key={s} type="button" className={`ed-chip ${form.status === s ? 'is-active' : ''}`} onClick={() => update('status', s)}>{STATUS_LABEL[s]}</button>
            ))}
          </div>
        </section>

        <section className="af-sec">
          <h2>Documents you sent</h2>
          <div className="ed-grid">
            <label className="ed-field"><span className="ed-field__label">CV</span>
              <select className="form-control" value={form.cv ?? ''} onChange={e => update('cv', e.target.value ? Number(e.target.value) : null)}>
                <option value="">None yet</option>
                {cvs.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </label>
            <label className="ed-field"><span className="ed-field__label">Cover letter</span>
              <select className="form-control" value={form.letter ?? ''} onChange={e => update('letter', e.target.value ? Number(e.target.value) : null)}>
                <option value="">None yet</option>
                {letters.map(l => <option key={l.id} value={l.id}>{l.title || l.letter_type_display}{l.company ? `, ${l.company}` : ''}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="af-sec">
          <h2>Notes</h2>
          <textarea className="form-control" rows={5} value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Recruiter name, interview dates, salary range, follow-up reminders..." />
        </section>

        <div className="af-foot">
          <Link to={isEdit ? `/applications/${id}` : '/applications'} className="btn btn-ghost">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add job'}</button>
        </div>
      </form>
    </div>
  )
}
