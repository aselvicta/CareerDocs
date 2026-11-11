import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FileDown, Sparkles, Target } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { useToast } from '../ToastContext'
import { DesignPanel } from '../cv/DesignPanel'
import { EditorShell, Field, Panel } from '../cv/EditorShell'
import { LetterDocument } from '../cv/LetterDocument'
import { TEMPLATE_IDS, getTemplate } from '../cv/templates'

const LETTER_TYPES = [
  { value: 'cover', label: 'Cover letter' },
  { value: 'internship', label: 'Internship application' },
  { value: 'job_application', label: 'Job application letter' },
  { value: 'recommendation', label: 'Recommendation letter' },
  { value: 'resignation', label: 'Resignation letter' },
]

const FIELDS = ['letter_type', 'title', 'template', 'recipient_name', 'recipient_title', 'company', 'body',
  'sender_name', 'sender_email', 'sender_phone', 'sender_location', 'sender_headline']

const EMPTY = {
  letter_type: 'cover', title: '', template: 'classic', design: {},
  recipient_name: '', recipient_title: '', company: '', body: '',
  sender_name: '', sender_email: '', sender_phone: '', sender_location: '', sender_headline: '',
}

export function LetterForm() {
  const { id } = useParams()
  const isEdit = !!id
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()

  const urlTemplate = TEMPLATE_IDS.includes(searchParams.get('template')) ? searchParams.get('template') : null
  const urlAccent = /^#[0-9a-f]{6}$/i.test(searchParams.get('accent') || '') ? searchParams.get('accent') : null
  const fromCv = searchParams.get('cv')

  const [form, setForm] = useState(() => ({ ...EMPTY, template: urlTemplate || 'classic', design: urlAccent ? { accent: urlAccent } : {} }))
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [tab, setTab] = useState(location.state?.tab === 'design' ? 'design' : 'content')
  const [open, setOpen] = useState(() => new Set(['recipient', 'body']))
  const [aiLoading, setAiLoading] = useState(null)
  const [alternatives, setAlternatives] = useState('')
  const [jobDesc, setJobDesc] = useState('')
  const [cvSummary, setCvSummary] = useState('')
  const [cvs, setCvs] = useState([])

  useEffect(() => {
    if (isEdit) {
      api.get(`/letters/${id}/`).then(data => {
        const next = { design: data.design && typeof data.design === 'object' ? data.design : {} }
        for (const k of FIELDS) next[k] = data[k] ?? EMPTY[k]
        setForm(next)
      }).catch(() => navigate('/letters')).finally(() => setLoading(false))
      return
    }
    // New letter: sender details from the linked CV if there is one, else the profile.
    const fill = src => setForm(prev => ({
      ...prev,
      sender_name: prev.sender_name || src.full_name || user?.username || '',
      sender_email: prev.sender_email || src.email || user?.email || '',
      sender_phone: prev.sender_phone || src.phone || '',
      sender_location: prev.sender_location || src.location || '',
      sender_headline: prev.sender_headline || src.headline || '',
      ...(src.template && !urlTemplate ? { template: src.template, design: src.design || {} } : {}),
    }))
    if (fromCv) {
      api.get(`/cvs/${fromCv}/`).then(cv => {
        fill(cv)
        setCvSummary(cv.summary || '')
      }).catch(() => api.get('/profile/').then(fill).catch(() => fill({})))
    } else {
      api.get('/profile/').then(fill).catch(() => fill({}))
    }
  }, [id, isEdit, navigate, fromCv, urlTemplate, user?.email, user?.username])

  useEffect(() => {
    if (tab === 'match' && !cvs.length) api.get('/cvs/?limit=20').then(setCvs).catch(() => {})
  }, [tab, cvs.length])

  const update = useCallback((name, value) => {
    setForm(prev => ({ ...prev, [name]: value }))
    setDirty(true)
  }, [])
  const panel = key => ({
    open: open.has(key),
    onToggle: () => setOpen(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    }),
  })

  async function generate() {
    setAiLoading('generate')
    try {
      const data = await api.post('/ai/generate-letter-body/', {
        letter_type: form.letter_type,
        context: { recipient_name: form.recipient_name, company: form.company, sender_name: form.sender_name },
      })
      if (data.body) { update('body', data.body); addToast('Draft written. Make it yours before sending.', 'success') }
    } catch (e) { addToast(e?.message || 'Request failed', 'error') } finally { setAiLoading(null) }
  }

  async function suggest() {
    if (!form.body?.trim()) { addToast('Write something first.', 'warning'); return }
    setAiLoading('suggest')
    try {
      const data = await api.post('/ai/suggest-alternatives/', { text: form.body })
      if (data.alternatives) setAlternatives(data.alternatives)
    } catch (e) { addToast(e?.message || 'Request failed', 'error') } finally { setAiLoading(null) }
  }

  async function tailor() {
    if (!jobDesc.trim()) { addToast('Paste the job description first.', 'warning'); return }
    if (!cvSummary.trim()) { addToast('Add your background, or pick one of your CVs.', 'warning'); return }
    setAiLoading('tailor')
    try {
      const data = await api.post('/ai/tailor-letter/', {
        cv_summary: cvSummary.trim(), job_description: jobDesc.trim(),
        company: form.company || '', recipient: form.recipient_name || '',
      })
      if (data.body) { update('body', data.body); setTab('content'); addToast('Letter tailored to the advert.', 'success') }
    } catch (e) { addToast(e?.message || 'Tailor failed', 'error') } finally { setAiLoading(null) }
  }

  const save = useCallback(async then => {
    if (saving) return
    if (!form.body.trim()) { addToast('Write the letter body before saving.', 'warning'); return }
    setSaving(true)
    try {
      const data = isEdit ? await api.patch(`/letters/${id}/`, form) : await api.post('/letters/', form)
      setDirty(false)
      addToast(isEdit ? 'Letter saved.' : 'Letter created.', 'success')
      if (then === 'pdf') navigate(`/print/letter/${data.id}`)
      else if (!isEdit) navigate(`/letters/${data.id}/edit`, { replace: true })
    } catch (err) { addToast(err?.message || 'Save failed', 'error') } finally { setSaving(false) }
  }, [saving, form, isEdit, id, addToast, navigate])

  const previewDoc = useMemo(() => <LetterDocument letter={form} template={form.template} design={form.design} />, [form])

  if (loading) return <div className="page"><div className="loading-state"><p>Loading your letter...</p></div></div>

  const words = form.body.trim().split(/\s+/).filter(Boolean).length
  const typeLabel = LETTER_TYPES.find(t => t.value === form.letter_type)?.label || 'Letter'

  return (
    <EditorShell
      backTo={isEdit ? `/letters/${id}` : '/letters'}
      backLabel={isEdit ? 'Letter' : 'My letters'}
      title={form.title}
      onTitle={v => update('title', v)}
      titlePlaceholder={`${typeLabel} name, e.g. Equity Bank analyst`}
      dirty={dirty}
      saving={saving}
      onSave={() => save()}
      tab={tab}
      onTab={setTab}
      tabs={[{ id: 'content', label: 'Content' }, { id: 'design', label: 'Design' }, { id: 'match', label: 'Tailor to a job' }]}
      previewLabel={`${typeLabel}, ${getTemplate(form.template).name} design`}
      preview={previewDoc}
      extraActions={
        <button type="button" className="btn btn-secondary ed-hide-sm" onClick={() => save('pdf')} disabled={saving}>
          <FileDown size={16} /> Download PDF
        </button>
      }
    >
      {tab === 'design' && (
        <DesignPanel kind="letter" template={form.template} design={form.design}
          onTemplate={v => update('template', v)} onDesign={v => update('design', v)} />
      )}

      {tab === 'match' && (
        <div className="ed-match">
          <p className="ed-lead">Paste the advert and your background. AI writes a letter that answers what this employer asked for.</p>
          <Field label="Job description" wide>
            <textarea className="form-control" rows={7} value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder="Paste the full job description..." />
          </Field>
          <Field label="Your background" wide hint={cvs.length ? 'Or fill it from one of your CVs below.' : undefined}>
            <textarea className="form-control" rows={4} value={cvSummary} onChange={e => setCvSummary(e.target.value)} placeholder="Your CV profile, or a few lines about your experience" />
          </Field>
          {cvs.length > 0 && (
            <div className="ed-row" style={{ marginBottom: '1rem' }}>
              {cvs.slice(0, 6).map(c => (
                <button key={c.id} type="button" className="btn btn-ghost btn--sm"
                  onClick={() => api.get(`/cvs/${c.id}/`).then(full => setCvSummary(
                    [full.summary, ...(full.experience_structured || []).map(e => [e.role, e.company, e.bullets].filter(Boolean).join(': '))].filter(Boolean).join('\n'),
                  ))}>
                  Use {c.title}
                </button>
              ))}
            </div>
          )}
          <button type="button" className="btn btn-primary" onClick={tailor} disabled={!!aiLoading}>
            <Target size={16} /> {aiLoading === 'tailor' ? 'Writing...' : 'Write tailored letter'}
          </button>
        </div>
      )}

      {tab === 'content' && (
        <div className="ed-panels">
          <Panel title="Letter type" summary={typeLabel} {...panel('type')}>
            <div className="ed-chips">
              {LETTER_TYPES.map(t => (
                <button key={t.value} type="button" className={`ed-chip ${form.letter_type === t.value ? 'is-active' : ''}`} onClick={() => update('letter_type', t.value)}>
                  {t.label}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Recipient" summary={[form.recipient_name, form.company].filter(Boolean).join(', ')} {...panel('recipient')}>
            <div className="ed-grid">
              <Field label="Name"><input className="form-control" value={form.recipient_name} onChange={e => update('recipient_name', e.target.value)} placeholder="Ms. Grace Njoroge" /></Field>
              <Field label="Job title"><input className="form-control" value={form.recipient_title} onChange={e => update('recipient_title', e.target.value)} placeholder="Head of Analytics" /></Field>
              <Field label="Company" wide><input className="form-control" value={form.company} onChange={e => update('company', e.target.value)} placeholder="Equity Bank" /></Field>
            </div>
            <p className="ed-help">No name in the advert? Leave it blank and the letter opens with "Dear Hiring Manager".</p>
          </Panel>

          <Panel title="Letter" summary={words ? `${words} words` : 'Not written yet'} {...panel('body')}>
            <Field label="Body. Separate paragraphs with a blank line." wide>
              <textarea className="form-control" rows={16} value={form.body} onChange={e => update('body', e.target.value)}
                placeholder={'I am writing to apply for...\n\nIn my current role...\n\nI would welcome the chance to...'} />
            </Field>
            <div className="ed-row ed-row--between">
              <span className="ed-field__hint">{words} words. 250 to 400 is the sweet spot.</span>
              <div className="ed-row">
                <button type="button" className="btn btn-secondary btn--sm" onClick={generate} disabled={!!aiLoading}>
                  <Sparkles size={14} /> {aiLoading === 'generate' ? 'Writing...' : form.body ? 'Rewrite with AI' : 'Write a draft with AI'}
                </button>
                <button type="button" className="btn btn-ghost btn--sm" onClick={suggest} disabled={!!aiLoading}>
                  {aiLoading === 'suggest' ? 'Thinking...' : 'Alternative phrasings'}
                </button>
              </div>
            </div>
            {alternatives && (
              <div className="ed-result">
                <h4>Alternative phrasings</h4>
                <div className="whitespace">{alternatives}</div>
                <button type="button" className="btn btn-ghost btn--sm" onClick={() => setAlternatives('')}>Dismiss</button>
              </div>
            )}
          </Panel>

          <Panel title="Your details" summary={[form.sender_name, form.sender_email].filter(Boolean).join(', ')} {...panel('sender')}>
            <div className="ed-grid">
              <Field label="Full name"><input className="form-control" value={form.sender_name} onChange={e => update('sender_name', e.target.value)} /></Field>
              <Field label="Headline"><input className="form-control" value={form.sender_headline} onChange={e => update('sender_headline', e.target.value)} placeholder="Junior Data Analyst" /></Field>
              <Field label="Email"><input className="form-control" type="email" value={form.sender_email} onChange={e => update('sender_email', e.target.value)} /></Field>
              <Field label="Phone"><input className="form-control" value={form.sender_phone} onChange={e => update('sender_phone', e.target.value)} /></Field>
              <Field label="City, Country" wide><input className="form-control" value={form.sender_location} onChange={e => update('sender_location', e.target.value)} /></Field>
            </div>
          </Panel>
          <p className="ed-foot">Tip: use the same design as your CV so the application reads as one set.</p>
        </div>
      )}
    </EditorShell>
  )
}
