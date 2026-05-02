import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Briefcase } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../ToastContext'

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

const empty = { job_title: '', company: '', job_url: '', deadline: '', status: 'draft', cv: null, letter: null, notes: '' }

export function ApplicationForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [cvs, setCvs] = useState([])
  const [letters, setLetters] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    Promise.all([
      api.get('/cvs/').then(d => setCvs(Array.isArray(d) ? d : [])),
      api.get('/letters/').then(d => setLetters(Array.isArray(d) ? d : [])),
      isEdit ? api.get(`/applications/${id}/`) : Promise.resolve(null),
    ]).then(([, , app]) => {
      if (app) {
        setForm({
          job_title: app.job_title || '',
          company: app.company || '',
          job_url: app.job_url || '',
          deadline: app.deadline ? app.deadline.slice(0, 10) : '',
          status: app.status || 'draft',
          cv: app.cv || null,
          letter: app.letter || null,
          notes: app.notes || '',
        })
      }
    }).catch(() => addToast('Failed to load.', 'error')).finally(() => setLoading(false))
  }, [id, isEdit, addToast])

  function update(name, value) {
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        job_title: form.job_title.trim(),
        company: form.company.trim(),
        job_url: form.job_url.trim() || null,
        deadline: form.deadline || null,
        status: form.status,
        cv: form.cv || null,
        letter: form.letter || null,
        notes: form.notes.trim(),
      }
      if (isEdit) {
        await api.patch(`/applications/${id}/`, payload)
        addToast('Application updated.', 'success')
      } else {
        const created = await api.post('/applications/', payload)
        addToast('Application added.', 'success')
        navigate(`/applications/${created.id}`)
        return
      }
      navigate(`/applications/${id}`)
    } catch (err) {
      addToast(err?.message || 'Save failed.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="page"><div className="loading-state"><p>Loading...</p></div></div>

  return (
    <div className="page">
      <div className="page-header page-header--row">
        <h1><Briefcase size={28} /> {isEdit ? 'Edit application' : 'Add application'}</h1>
        <Link to={isEdit ? `/applications/${id}` : '/applications'} className="btn btn-ghost"><ArrowLeft size={18} /> Back</Link>
      </div>
      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 560, marginTop: '1rem' }}>
        <div className="form-group">
          <label>Job title *</label>
          <input value={form.job_title} onChange={e => update('job_title', e.target.value)} className="form-control" placeholder="e.g. Software Engineer" required />
        </div>
        <div className="form-group">
          <label>Company</label>
          <input value={form.company} onChange={e => update('company', e.target.value)} className="form-control" placeholder="Company name" />
        </div>
        <div className="form-group">
          <label>Job posting URL</label>
          <input type="url" value={form.job_url} onChange={e => update('job_url', e.target.value)} className="form-control" placeholder="https://..." />
        </div>
        <div className="form-group">
          <label>Deadline</label>
          <input type="date" value={form.deadline} onChange={e => update('deadline', e.target.value)} className="form-control" />
        </div>
        <div className="form-group">
          <label>Status</label>
          <select value={form.status} onChange={e => update('status', e.target.value)} className="form-control">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>CV used</label>
          <select value={form.cv != null ? String(form.cv) : ''} onChange={e => update('cv', e.target.value ? Number(e.target.value) : null)} className="form-control">
            <option value="">None</option>
            {cvs.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Cover letter used</label>
          <select value={form.letter != null ? String(form.letter) : ''} onChange={e => update('letter', e.target.value ? Number(e.target.value) : null)} className="form-control">
            <option value="">None</option>
            {letters.map(l => <option key={l.id} value={l.id}>{l.letter_type_display}{l.title ? ` — ${l.title}` : ''}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea value={form.notes} onChange={e => update('notes', e.target.value)} className="form-control" rows={3} placeholder="Deadline reminders, contact info, follow-up..." />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}><Save size={18} /> {saving ? 'Saving...' : 'Save'}</button>
      </form>
    </div>
  )
}
