import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Target } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { useToast } from '../ToastContext'

const LETTER_TYPES = [
  { value: 'cover', label: 'Cover Letter' },
  { value: 'internship', label: 'Internship Application' },
  { value: 'job_application', label: 'Job Application Letter' },
  { value: 'recommendation', label: 'Recommendation Letter' },
  { value: 'resignation', label: 'Resignation Letter' },
]

const empty = {
  letter_type: 'cover',
  title: '',
  recipient_name: '',
  recipient_title: '',
  company: '',
  body: '',
  sender_name: '',
  sender_email: '',
  sender_phone: '',
}

export function LetterForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(null)
  const [tailorOpen, setTailorOpen] = useState(false)
  const [jobDesc, setJobDesc] = useState('')
  const [cvSummary, setCvSummary] = useState('')
  const [tailorLoading, setTailorLoading] = useState(false)
  const [alternatives, setAlternatives] = useState('')

  useEffect(() => {
    if (isEdit) {
      api.get(`/letters/${id}/`).then(data => setForm({
        letter_type: data.letter_type ?? 'cover',
        title: data.title ?? '',
        recipient_name: data.recipient_name ?? '',
        recipient_title: data.recipient_title ?? '',
        company: data.company ?? '',
        body: data.body ?? '',
        sender_name: data.sender_name ?? '',
        sender_email: data.sender_email ?? '',
        sender_phone: data.sender_phone ?? '',
      })).catch(() => navigate('/letters')).finally(() => setLoading(false))
    } else {
      const fallback = { sender_email: user?.email || '', sender_name: user?.username || '' }
      api.get('/profile/').then(profile => {
        setForm(prev => ({
          ...prev,
          sender_name: prev.sender_name || profile.full_name || fallback.sender_name || '',
          sender_email: prev.sender_email || profile.email || fallback.sender_email || '',
          sender_phone: prev.sender_phone || profile.phone || '',
        }))
      }).catch(() => setForm(prev => ({ ...prev, ...fallback })))
    }
  }, [id, isEdit, navigate, user?.email, user?.username])

  function update(name, value) {
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSuggestAlternatives() {
    if (!form.body?.trim()) { addToast('Enter some text first.', 'warning'); return }
    setAiLoading('suggest')
    try {
      const data = await api.post('/ai/suggest-alternatives/', { text: form.body })
      if (data.alternatives) { setAlternatives(data.alternatives); addToast('Alternatives generated.', 'success') }
    } catch (e) {
      addToast(e?.message || 'Request failed', 'error')
    } finally {
      setAiLoading(null)
    }
  }

  async function handleGenerateBody() {
    setAiLoading('generate')
    try {
      const data = await api.post('/ai/generate-letter-body/', {
        letter_type: form.letter_type,
        context: {
          recipient_name: form.recipient_name,
          company: form.company,
          sender_name: form.sender_name,
        },
      })
      if (data.body) { update('body', data.body); addToast('Letter body generated.', 'success') }
    } catch (e) {
      addToast(e?.message || 'Request failed', 'error')
    } finally {
      setAiLoading(null)
    }
  }

  const isCoverType = ['cover', 'internship', 'job_application'].includes(form.letter_type)

  async function handleTailorLetter() {
    if (!jobDesc.trim()) { addToast('Paste the job description first.', 'warning'); return }
    if (!cvSummary.trim()) { addToast('Paste your CV summary or describe your background.', 'warning'); return }
    setTailorLoading(true)
    try {
      const data = await api.post('/ai/tailor-letter/', {
        cv_summary: cvSummary.trim(),
        job_description: jobDesc.trim(),
        company: form.company || '',
        recipient: form.recipient_name || '',
      })
      if (data.body) { update('body', data.body); addToast('Letter tailored.', 'success') }
    } catch (e) {
      addToast(e?.message || 'Tailor failed', 'error')
    } finally {
      setTailorLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEdit) {
        await api.patch(`/letters/${id}/`, form)
        addToast('Letter updated.', 'success')
        navigate(`/letters/${id}`)
      } else {
        const data = await api.post('/letters/', form)
        addToast('Letter created.', 'success')
        navigate(`/letters/${data.id}`)
      }
    } catch (err) {
      addToast(err?.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="layout"><p>Loading...</p></div>

  return (
    <div className="layout">
      <h1>{isEdit ? 'Edit letter' : 'Create new letter'}</h1>
      <p className="muted">Choose type: Cover Letter, Internship, Job Application, Recommendation, or Resignation.</p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Letter type</label>
          <select value={form.letter_type} onChange={e => update('letter_type', e.target.value)} className="form-control">
            {LETTER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Title</label>
          <input value={form.title} onChange={e => update('title', e.target.value)} className="form-control" placeholder="e.g. Application for Backend Developer" />
        </div>
        <div className="form-group">
          <label>Recipient name</label>
          <input value={form.recipient_name} onChange={e => update('recipient_name', e.target.value)} className="form-control" />
        </div>
        <div className="form-group">
          <label>Recipient title</label>
          <input value={form.recipient_title} onChange={e => update('recipient_title', e.target.value)} className="form-control" />
        </div>
        <div className="form-group">
          <label>Company</label>
          <input value={form.company} onChange={e => update('company', e.target.value)} className="form-control" />
        </div>
        <div className="form-group">
          <label>Body</label>
          <textarea value={form.body} onChange={e => update('body', e.target.value)} className="form-control" rows={12} />
          <div className="btn-row">
            <button type="button" className="btn btn-secondary" onClick={handleGenerateBody} disabled={aiLoading === 'generate'}>{aiLoading === 'generate' ? '...' : 'Generate with AI'}</button>
            <button type="button" className="btn btn-secondary" onClick={handleSuggestAlternatives} disabled={aiLoading === 'suggest'}>{aiLoading === 'suggest' ? '...' : 'Suggest alternatives'}</button>
          </div>
          {alternatives && (
            <div className="card" style={{ marginTop: '0.5rem', padding: '0.75rem' }}>
              <p className="muted" style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>Alternative phrasings:</p>
              <pre className="whitespace" style={{ margin: 0, fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{alternatives}</pre>
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => setAlternatives('')}>Dismiss</button>
            </div>
          )}
          {isCoverType && (
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setTailorOpen(!tailorOpen)}>
                <Target size={16} /> Tailor to job description
              </button>
              {tailorOpen && (
                <div className="card" style={{ marginTop: '0.5rem', padding: '1rem' }}>
                  <p className="muted" style={{ marginBottom: '0.5rem' }}>Paste job description and your CV summary to generate a tailored letter body.</p>
                  <label style={{ fontSize: '0.85rem' }}>Job description</label>
                  <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} className="form-control" rows={4} placeholder="Paste the full job description..." style={{ marginBottom: '0.5rem' }} />
                  <label style={{ fontSize: '0.85rem' }}>Your CV summary / background</label>
                  <textarea value={cvSummary} onChange={e => setCvSummary(e.target.value)} className="form-control" rows={3} placeholder="Paste from your CV summary or briefly describe your experience..." style={{ marginBottom: '0.5rem' }} />
                  <button type="button" className="btn btn-secondary" onClick={handleTailorLetter} disabled={tailorLoading}>
                    <Target size={14} /> {tailorLoading ? 'Generating...' : 'Generate tailored letter'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="form-group">
          <label>Your name</label>
          <input value={form.sender_name} onChange={e => update('sender_name', e.target.value)} className="form-control" />
        </div>
        <div className="form-group">
          <label>Your email</label>
          <input type="email" value={form.sender_email} onChange={e => update('sender_email', e.target.value)} className="form-control" />
        </div>
        <div className="form-group">
          <label>Your phone</label>
          <input value={form.sender_phone} onChange={e => update('sender_phone', e.target.value)} className="form-control" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save letter'}</button>
        {isEdit && <Link to={`/letters/${id}`} className="btn btn-secondary">Cancel</Link>}
      </form>
    </div>
  )
}
