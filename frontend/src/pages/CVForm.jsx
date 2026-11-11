import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Sparkles, Target, Plus, Trash2, Camera, X, FileDown } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../ToastContext'
import { CVDocument } from '../cv/CVDocument'
import { DesignPanel } from '../cv/DesignPanel'
import { EditorShell, Field, Panel } from '../cv/EditorShell'
import { EntryList } from '../cv/EntryList'
import { photoToDataUrl } from '../cv/photo'
import { TEMPLATE_IDS, getTemplate } from '../cv/templates'

const emptyExp = () => ({ role: '', company: '', location: '', start_date: '', end_date: '', current: false, bullets: '' })
const emptyEdu = () => ({ degree: '', institution: '', location: '', start_date: '', end_date: '', honors: '' })
const emptySkill = () => ({ category: '', items: '' })
const emptyCert = () => ({ name: '', issuer: '', date: '', url: '' })
const emptyProj = () => ({ name: '', description: '', tech: '', url: '' })
const emptyLang = () => ({ language: '', proficiency: '' })
const emptyAward = () => ({ name: '', issuer: '', date: '', description: '' })
const emptyRef = () => ({ name: '', title: '', company: '', email: '', phone: '' })
const emptyLink = () => ({ label: '', url: '' })

const ARRAY_FIELDS = ['experience_structured', 'education_structured', 'skills_structured', 'certifications', 'projects', 'languages', 'awards', 'references', 'links']
const TEXT_FIELDS = ['title', 'template', 'full_name', 'headline', 'email', 'phone', 'location', 'summary', 'experience', 'education', 'skills', 'photo']

const EMPTY = {
  title: 'My CV', template: 'classic', design: {}, photo: '', headline: '',
  full_name: '', email: '', phone: '', location: '', summary: '',
  experience: '', education: '', skills: '',
  experience_structured: [emptyExp()], education_structured: [emptyEdu()], skills_structured: [emptySkill()],
  certifications: [], projects: [], languages: [], awards: [], references: [], links: [],
}

function fromApi(data) {
  const out = { design: data.design && typeof data.design === 'object' ? data.design : {} }
  for (const k of TEXT_FIELDS) out[k] = data[k] ?? EMPTY[k]
  for (const k of ARRAY_FIELDS) out[k] = Array.isArray(data[k]) ? data[k] : []
  return out
}

const EXP_FIELDS = [
  { key: 'role', label: 'Job title', placeholder: 'Data Analyst Intern' },
  { key: 'company', label: 'Employer', placeholder: 'Safaricom PLC' },
  { key: 'start_date', label: 'Start', placeholder: 'Jun 2024' },
  { key: 'end_date', label: 'End', placeholder: 'Dec 2024', disabledWhen: e => e.current },
  { key: 'location', label: 'City', placeholder: 'Nairobi' },
  { key: 'current', label: 'I work here now', type: 'checkbox' },
  { key: 'bullets', label: 'Achievements, one per line', type: 'textarea', wide: true, rows: 5, placeholder: 'Built a dashboard that cut reporting time by 70%\nTrained 4 new interns on SQL basics' },
]
const EDU_FIELDS = [
  { key: 'degree', label: 'Qualification', placeholder: 'BSc Statistics' },
  { key: 'institution', label: 'School or university', placeholder: 'University of Nairobi' },
  { key: 'start_date', label: 'Start', placeholder: '2020' },
  { key: 'end_date', label: 'End', placeholder: '2024' },
  { key: 'location', label: 'City', placeholder: 'Nairobi', wide: true },
  { key: 'honors', label: 'Grade, honours or highlights', type: 'textarea', wide: true, rows: 2, placeholder: 'Second Class Upper. Dissertation on...' },
]
const PROJ_FIELDS = [
  { key: 'name', label: 'Project name' },
  { key: 'tech', label: 'Tools or tech', placeholder: 'Python, Streamlit' },
  { key: 'url', label: 'Link', wide: true, placeholder: 'github.com/you/project' },
  { key: 'description', label: 'What you did and the result', type: 'textarea', wide: true, rows: 3 },
]
const CERT_FIELDS = [
  { key: 'name', label: 'Certificate', wide: true },
  { key: 'issuer', label: 'Issued by' },
  { key: 'date', label: 'Year' },
]
const AWARD_FIELDS = [
  { key: 'name', label: 'Award', wide: true },
  { key: 'issuer', label: 'Awarded by' },
  { key: 'date', label: 'Year' },
  { key: 'description', label: 'Details (optional)', type: 'textarea', wide: true, rows: 2 },
]
const REF_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'title', label: 'Job title' },
  { key: 'company', label: 'Organisation', wide: true },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
]

const count = (n, word) => (n ? `${n} ${word}${n === 1 ? '' : 's'}` : '')

export function CVForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { addToast } = useToast()
  const location = useLocation()

  const initialTemplate = TEMPLATE_IDS.includes(searchParams.get('template')) ? searchParams.get('template') : 'classic'
  const initialAccent = /^#[0-9a-f]{6}$/i.test(searchParams.get('accent') || '') ? searchParams.get('accent') : null
  const [form, setForm] = useState(() => ({ ...EMPTY, template: initialTemplate, design: initialAccent ? { accent: initialAccent } : {} }))
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [tab, setTab] = useState(location.state?.tab === 'design' ? 'design' : 'content')
  const [open, setOpen] = useState(() => new Set(['personal']))
  const [enhancing, setEnhancing] = useState(null)
  const [jobDesc, setJobDesc] = useState('')
  const [tailorSuggestions, setTailorSuggestions] = useState('')
  const [atsReport, setAtsReport] = useState('')
  const [matching, setMatching] = useState(null)
  const [plainOpen, setPlainOpen] = useState(() => new Set())
  const photoInput = useRef(null)

  useEffect(() => {
    if (isEdit) {
      api.get(`/cvs/${id}/`)
        .then(data => setForm(fromApi(data)))
        .catch(() => navigate('/cv'))
        .finally(() => setLoading(false))
      return
    }
    api.get('/profile/').then(profile => {
      setForm(prev => ({
        ...prev,
        full_name: prev.full_name || profile.full_name || '',
        email: prev.email || profile.email || '',
        phone: prev.phone || profile.phone || '',
        location: prev.location || profile.location || '',
        summary: prev.summary || profile.summary || '',
        references: Array.isArray(profile.references) && profile.references.length ? profile.references : prev.references,
      }))
    }).catch(() => {})
  }, [id, isEdit, navigate])

  const update = useCallback((name, value) => {
    setForm(prev => ({ ...prev, [name]: value }))
    setDirty(true)
  }, [])
  const toggle = key => setOpen(prev => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })
  const panel = key => ({ open: open.has(key), onToggle: () => toggle(key) })
  const togglePlain = key => setPlainOpen(prev => new Set(prev).add(key))

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      update('photo', await photoToDataUrl(file))
      if (!getTemplate(form.template).photo) addToast('Photo added. Pick a template marked "Photo optional" to show it.', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  async function enhance(text, hint, apply, key) {
    if (!text?.trim()) { addToast('Write something first, then let AI polish it.', 'warning'); return }
    setEnhancing(key)
    try {
      const data = await api.post('/ai/enhance/', { context: 'CV for professional use', text, field_hint: hint })
      if (data.enhanced) { apply(data.enhanced); addToast('Rewritten. Check it still sounds like you.', 'success') }
    } catch (e) { addToast(e?.message || 'Enhance failed', 'error') } finally { setEnhancing(null) }
  }

  async function runMatch(kind) {
    if (!jobDesc.trim()) { addToast('Paste the job description first.', 'warning'); return }
    setMatching(kind)
    try {
      const body = { ...(id ? { cv_id: id } : { cv: form }), job_description: jobDesc.trim() }
      if (kind === 'tailor') {
        const data = await api.post('/ai/tailor-cv/', body)
        setTailorSuggestions(data.suggestions || '')
      } else {
        const data = await api.post('/ai/ats/', body)
        setAtsReport(data.report || '')
      }
    } catch (e) { addToast(e?.message || 'Request failed', 'error') } finally { setMatching(null) }
  }

  const save = useCallback(async (then) => {
    if (saving) return
    setSaving(true)
    try {
      const data = isEdit ? await api.patch(`/cvs/${id}/`, form) : await api.post('/cvs/', form)
      setDirty(false)
      addToast(isEdit ? 'CV saved.' : 'CV created.', 'success')
      if (then === 'pdf') navigate(`/print/cv/${data.id}`)
      else if (!isEdit) navigate(`/cv/${data.id}/edit`, { replace: true })
    } catch (err) {
      addToast(err?.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }, [saving, isEdit, id, form, addToast, navigate])

  const previewDoc = useMemo(() => <CVDocument cv={form} template={form.template} design={form.design} />, [form])

  if (loading) return <div className="page"><div className="loading-state"><p>Loading your CV...</p></div></div>

  const t = getTemplate(form.template)
  const exp = form.experience_structured || []
  const edu = form.education_structured || []

  return (
    <EditorShell
      backTo={isEdit ? `/cv/${id}` : '/cv'}
      backLabel={isEdit ? 'CV' : 'My CVs'}
      title={form.title}
      onTitle={v => update('title', v)}
      titlePlaceholder="CV name, e.g. Data analyst roles"
      dirty={dirty}
      saving={saving}
      onSave={() => save()}
      tab={tab}
      onTab={setTab}
      tabs={[{ id: 'content', label: 'Content' }, { id: 'design', label: 'Design' }, { id: 'match', label: 'Job match' }]}
      previewLabel={`${t.name} template`}
      preview={previewDoc}
      extraActions={
        <button type="button" className="btn btn-secondary ed-hide-sm" onClick={() => save('pdf')} disabled={saving}>
          <FileDown size={16} /> Download PDF
        </button>
      }
    >
      {tab === 'design' && (
        <DesignPanel
          template={form.template}
          design={form.design}
          hasPhoto={!!form.photo}
          onTemplate={v => update('template', v)}
          onDesign={v => update('design', v)}
        />
      )}

      {tab === 'match' && (
        <div className="ed-match">
          <p className="ed-lead">Paste a job advert. AI compares it with this CV and tells you what to change, and how an applicant tracking system is likely to score it.</p>
          <Field label="Job description" wide>
            <textarea className="form-control" rows={9} value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder="Paste the full job description here..." />
          </Field>
          <div className="ed-row">
            <button type="button" className="btn btn-primary" onClick={() => runMatch('tailor')} disabled={!!matching}>
              <Target size={16} /> {matching === 'tailor' ? 'Reading the advert...' : 'Tailor suggestions'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => runMatch('ats')} disabled={!!matching}>
              {matching === 'ats' ? 'Scoring...' : 'ATS check'}
            </button>
          </div>
          {tailorSuggestions && <div className="ed-result"><h4>Tailor suggestions</h4><div className="whitespace">{tailorSuggestions}</div></div>}
          {atsReport && <div className="ed-result"><h4>ATS check</h4><div className="whitespace">{atsReport}</div></div>}
        </div>
      )}

      {tab === 'content' && (
        <div className="ed-panels">
          <Panel title="Personal details" summary={[form.full_name, form.headline].filter(Boolean).join(', ')} {...panel('personal')}>
            <div className="ed-photo">
              <button type="button" className="ed-photo__img" onClick={() => photoInput.current?.click()} aria-label="Upload photo">
                {form.photo ? <img src={form.photo} alt="" /> : <Camera size={22} />}
              </button>
              <div className="ed-photo__text">
                <strong>Photo</strong>
                <span>{t.photo ? 'Optional. Shown in this template.' : 'Optional. This template does not show photos.'}</span>
                <div className="ed-row">
                  <button type="button" className="btn btn-secondary btn--sm" onClick={() => photoInput.current?.click()}>{form.photo ? 'Change' : 'Upload'}</button>
                  {form.photo && <button type="button" className="btn btn-ghost btn--sm" onClick={() => update('photo', '')}><X size={14} /> Remove</button>}
                </div>
              </div>
              <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handlePhoto} />
            </div>
            <div className="ed-grid">
              <Field label="Full name"><input className="form-control" value={form.full_name} onChange={e => update('full_name', e.target.value)} placeholder="Sarah Kamau" autoComplete="name" /></Field>
              <Field label="Headline"><input className="form-control" value={form.headline} onChange={e => update('headline', e.target.value)} placeholder="Junior Data Analyst" /></Field>
              <Field label="Email"><input className="form-control" type="email" value={form.email} onChange={e => update('email', e.target.value)} autoComplete="email" /></Field>
              <Field label="Phone"><input className="form-control" value={form.phone} onChange={e => update('phone', e.target.value)} autoComplete="tel" /></Field>
              <Field label="City, Country" wide><input className="form-control" value={form.location} onChange={e => update('location', e.target.value)} placeholder="Nairobi, Kenya" /></Field>
            </div>
            <div className="ed-sub">
              <span className="ed-field__label">Links</span>
              {(form.links || []).map((l, i) => (
                <div key={i} className="ed-inline">
                  <input className="form-control ed-inline__s" placeholder="LinkedIn" value={l.label} onChange={e => update('links', form.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <input className="form-control" placeholder="linkedin.com/in/you" value={l.url} onChange={e => update('links', form.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                  <button type="button" className="ed-icon" onClick={() => update('links', form.links.filter((_, j) => j !== i))} aria-label="Remove link"><Trash2 size={15} /></button>
                </div>
              ))}
              {(form.links || []).length < 4 && (
                <button type="button" className="ed-add ed-add--sm" onClick={() => update('links', [...(form.links || []), emptyLink()])}><Plus size={15} /> Add LinkedIn, GitHub or portfolio</button>
              )}
            </div>
          </Panel>

          <Panel title="Profile" summary={form.summary ? `${form.summary.slice(0, 60)}...` : 'Not written yet'} {...panel('summary')}>
            <Field label="Two to four sentences: who you are, what you are good at, what you want next" wide>
              <textarea className="form-control" rows={6} value={form.summary} onChange={e => update('summary', e.target.value)} />
            </Field>
            <div className="ed-row ed-row--between">
              <span className="ed-field__hint">{form.summary.trim().split(/\s+/).filter(Boolean).length} words. 40 to 80 reads best.</span>
              <button type="button" className="btn btn-secondary btn--sm" onClick={() => enhance(form.summary, 'summary', v => update('summary', v), 'summary')} disabled={!!enhancing}>
                <Sparkles size={14} /> {enhancing === 'summary' ? 'Rewriting...' : 'Improve with AI'}
              </button>
            </div>
          </Panel>

          <Panel title="Experience" summary={count(exp.filter(e => e.role || e.company).length, 'role')} {...panel('experience')}>
            <EntryList
              items={exp}
              onChange={v => update('experience_structured', v)}
              fields={EXP_FIELDS}
              makeEmpty={emptyExp}
              titleOf={e => [e.role, e.company].filter(Boolean).join(', ')}
              addLabel="Add a role"
              renderExtra={(item, i, set) => (
                <div className="ed-row ed-row--end">
                  <button type="button" className="btn btn-ghost btn--sm" disabled={!!enhancing}
                    onClick={() => enhance(item.bullets, 'experience bullet points', v => set('bullets', v), `exp${i}`)}>
                    <Sparkles size={14} /> {enhancing === `exp${i}` ? 'Rewriting...' : 'Strengthen bullets with AI'}
                  </button>
                </div>
              )}
            />
            {(form.experience || plainOpen.has('experience')) ? (
              <Field label="Plain text experience (used when no roles are added above)" wide>
                <textarea className="form-control" rows={4} value={form.experience} onChange={e => update('experience', e.target.value)} />
              </Field>
            ) : <button type="button" className="ed-link" onClick={() => togglePlain('experience')}>Paste plain text instead</button>}
          </Panel>

          <Panel title="Education" summary={count(edu.filter(e => e.degree || e.institution).length, 'qualification')} {...panel('education')}>
            <EntryList
              items={edu}
              onChange={v => update('education_structured', v)}
              fields={EDU_FIELDS}
              makeEmpty={emptyEdu}
              titleOf={e => [e.degree, e.institution].filter(Boolean).join(', ')}
              addLabel="Add education"
            />
            {(form.education || plainOpen.has('education')) ? (
              <Field label="Plain text education" wide>
                <textarea className="form-control" rows={3} value={form.education} onChange={e => update('education', e.target.value)} />
              </Field>
            ) : <button type="button" className="ed-link" onClick={() => togglePlain('education')}>Paste plain text instead</button>}
          </Panel>

          <Panel title="Skills" summary={count((form.skills_structured || []).filter(s => s.items).length, 'group')} {...panel('skills')}>
            <p className="ed-help">Group related skills. Use the exact words from job adverts so applicant tracking systems match them.</p>
            {(form.skills_structured || []).map((s, i) => (
              <div key={i} className="ed-inline">
                <input className="form-control ed-inline__s" placeholder="Group, e.g. Tools" value={s.category} onChange={e => update('skills_structured', form.skills_structured.map((x, j) => (j === i ? { ...x, category: e.target.value } : x)))} />
                <input className="form-control" placeholder="Excel, SQL, Power BI" value={s.items} onChange={e => update('skills_structured', form.skills_structured.map((x, j) => (j === i ? { ...x, items: e.target.value } : x)))} />
                <button type="button" className="ed-icon" onClick={() => update('skills_structured', form.skills_structured.filter((_, j) => j !== i))} aria-label="Remove skill group"><Trash2 size={15} /></button>
              </div>
            ))}
            <button type="button" className="ed-add" onClick={() => update('skills_structured', [...(form.skills_structured || []), emptySkill()])}><Plus size={16} /> Add skill group</button>
            {(form.skills || plainOpen.has('skills')) ? (
              <Field label="Plain text skills, comma separated" wide>
                <textarea className="form-control" rows={2} value={form.skills} onChange={e => update('skills', e.target.value)} />
              </Field>
            ) : null}
          </Panel>

          <Panel title="Projects" summary={count(form.projects.length, 'project')} {...panel('projects')}>
            <EntryList items={form.projects} onChange={v => update('projects', v)} fields={PROJ_FIELDS} makeEmpty={emptyProj} titleOf={p => p.name} addLabel="Add a project" />
          </Panel>

          <Panel title="Certifications" summary={count(form.certifications.length, 'certificate')} {...panel('certifications')}>
            <EntryList items={form.certifications} onChange={v => update('certifications', v)} fields={CERT_FIELDS} makeEmpty={emptyCert} titleOf={c => c.name} addLabel="Add a certificate" />
          </Panel>

          <Panel title="Languages" summary={form.languages.map(l => l.language).filter(Boolean).join(', ')} {...panel('languages')}>
            {form.languages.map((l, i) => (
              <div key={i} className="ed-inline">
                <input className="form-control" placeholder="Language" value={l.language} onChange={e => update('languages', form.languages.map((x, j) => (j === i ? { ...x, language: e.target.value } : x)))} />
                <select className="form-control ed-inline__s" value={l.proficiency} onChange={e => update('languages', form.languages.map((x, j) => (j === i ? { ...x, proficiency: e.target.value } : x)))}>
                  <option value="">Level</option>
                  {['Native', 'Fluent', 'Professional', 'Conversational', 'Basic'].map(o => <option key={o}>{o}</option>)}
                </select>
                <button type="button" className="ed-icon" onClick={() => update('languages', form.languages.filter((_, j) => j !== i))} aria-label="Remove language"><Trash2 size={15} /></button>
              </div>
            ))}
            <button type="button" className="ed-add" onClick={() => update('languages', [...form.languages, emptyLang()])}><Plus size={16} /> Add language</button>
          </Panel>

          <Panel title="Awards" summary={count(form.awards.length, 'award')} {...panel('awards')}>
            <EntryList items={form.awards} onChange={v => update('awards', v)} fields={AWARD_FIELDS} makeEmpty={emptyAward} titleOf={a => a.name} addLabel="Add an award" />
          </Panel>

          <Panel title="References" summary={count(form.references.length, 'referee')} {...panel('references')}>
            <EntryList items={form.references} onChange={v => update('references', v)} fields={REF_FIELDS} makeEmpty={emptyRef} titleOf={r => r.name} addLabel="Add a referee" />
          </Panel>

          <p className="ed-foot">Empty sections are left out of your CV automatically. Reorder or hide sections in the Design tab.</p>
        </div>
      )}
    </EditorShell>
  )
}
