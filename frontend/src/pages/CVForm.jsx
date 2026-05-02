import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { Sparkles, Save, ArrowLeft, Target, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../ToastContext'

const TEMPLATES = [
  { value: 'classic', label: 'Classic' },
  { value: 'modern', label: 'Modern' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'professional', label: 'Professional' },
]

const emptyExp = () => ({ role: '', company: '', location: '', start_date: '', end_date: '', current: false, bullets: '' })
const emptyEdu = () => ({ degree: '', institution: '', location: '', start_date: '', end_date: '', honors: '' })
const emptySkill = () => ({ category: '', items: '' })
const emptyCert = () => ({ name: '', issuer: '', date: '', url: '' })
const emptyProj = () => ({ name: '', description: '', tech: '', url: '' })
const emptyLang = () => ({ language: '', proficiency: '' })
const emptyAward = () => ({ name: '', issuer: '', date: '', description: '' })
const emptyRef = () => ({ name: '', title: '', company: '', email: '', phone: '' })

const empty = {
  title: 'My CV',
  template: 'classic',
  full_name: '',
  email: '',
  phone: '',
  location: '',
  summary: '',
  experience: '',
  education: '',
  skills: '',
  experience_structured: [],
  education_structured: [],
  skills_structured: [],
  certifications: [],
  projects: [],
  languages: [],
  awards: [],
  references: [],
}

export function CVForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const templateFromUrl = searchParams.get('template')
  const isEdit = !!id
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [form, setForm] = useState({ ...empty, template: templateFromUrl && ['classic', 'modern', 'minimal', 'professional'].includes(templateFromUrl) ? templateFromUrl : 'classic' })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [enhancing, setEnhancing] = useState(null)
  const [jobMatchOpen, setJobMatchOpen] = useState(false)
  const [jobDesc, setJobDesc] = useState('')
  const [tailorSuggestions, setTailorSuggestions] = useState('')
  const [atsReport, setAtsReport] = useState('')
  const [extraOpen, setExtraOpen] = useState(false)

  useEffect(() => {
    if (isEdit) {
      api.get(`/cvs/${id}/`).then(data => setForm({
        title: data.title ?? '',
        template: data.template ?? 'classic',
        full_name: data.full_name ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
        location: data.location ?? '',
        summary: data.summary ?? '',
        experience: data.experience ?? '',
        education: data.education ?? '',
        skills: data.skills ?? '',
        experience_structured: Array.isArray(data.experience_structured) ? data.experience_structured : [],
        education_structured: Array.isArray(data.education_structured) ? data.education_structured : [],
        skills_structured: Array.isArray(data.skills_structured) ? data.skills_structured : [],
        certifications: Array.isArray(data.certifications) ? data.certifications : [],
        projects: Array.isArray(data.projects) ? data.projects : [],
        languages: Array.isArray(data.languages) ? data.languages : [],
        awards: Array.isArray(data.awards) ? data.awards : [],
        references: Array.isArray(data.references) ? data.references : [],
      })).catch(() => navigate('/cv')).finally(() => setLoading(false))
    } else {
      setLoading(false)
      api.get('/profile/').then(profile => {
        setForm(prev => ({
          ...prev,
          full_name: prev.full_name || profile.full_name || '',
          email: prev.email || profile.email || '',
          phone: prev.phone || profile.phone || '',
          location: prev.location || profile.location || '',
          summary: prev.summary || profile.summary || '',
          references: Array.isArray(profile.references) && profile.references.length ? profile.references : prev.references,
          template: ['classic', 'modern', 'minimal', 'professional'].includes(templateFromUrl) ? templateFromUrl : prev.template,
        }))
      }).catch(() => { if (templateFromUrl) setForm(prev => ({ ...prev, template: templateFromUrl })) })
    }
  }, [id, isEdit, navigate, templateFromUrl])

  function update(name, value) { setForm(prev => ({ ...prev, [name]: value })) }
  function updateArr(name, arr) { setForm(prev => ({ ...prev, [name]: arr })) }
  function addArr(name, emptyFn) { setForm(prev => ({ ...prev, [name]: [...(prev[name] || []), emptyFn()] })) }
  function removeArr(name, i) { setForm(prev => ({ ...prev, [name]: prev[name].filter((_, j) => j !== i) })) }
  function updateArrItem(name, i, field, value) {
    setForm(prev => {
      const arr = [...(prev[name] || [])]
      arr[i] = { ...arr[i], [field]: value }
      return { ...prev, [name]: arr }
    })
  }

  async function handleEnhance(field) {
    const text = form[field]
    if (!text?.trim()) { addToast('Enter some text first.', 'warning'); return }
    setEnhancing(field)
    try {
      const data = await api.post('/ai/enhance/', { context: 'CV for professional use', text, field_hint: field })
      if (data.enhanced) { update(field, data.enhanced); addToast('Text enhanced.', 'success') }
    } catch (e) { addToast(e?.message || 'Enhance failed', 'error') } finally { setEnhancing(null) }
  }

  async function handleTailor() {
    if (!jobDesc.trim()) { addToast('Paste the job description first.', 'warning'); return }
    setTailorSuggestions('')
    try {
      const data = await api.post('/ai/tailor-cv/', {
        ...(id ? { cv_id: id } : { cv: form }),
        job_description: jobDesc.trim(),
      })
      setTailorSuggestions(data.suggestions || '')
      if (data.suggestions) addToast('Tailor suggestions ready.', 'success')
    } catch (e) { addToast(e?.message || 'Tailor failed', 'error') }
  }

  async function handleAts() {
    if (!jobDesc.trim()) { addToast('Paste the job description first.', 'warning'); return }
    setAtsReport('')
    try {
      const data = await api.post('/ai/ats/', {
        ...(id ? { cv_id: id } : { cv: form }),
        job_description: jobDesc.trim(),
      })
      setAtsReport(data.report || '')
      if (data.report) addToast('ATS analysis complete.', 'success')
    } catch (e) { addToast(e?.message || 'ATS analysis failed', 'error') }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEdit) {
        await api.patch(`/cvs/${id}/`, form)
        addToast('CV updated.', 'success')
        navigate(`/cv/${id}`)
      } else {
        const data = await api.post('/cvs/', form)
        addToast('CV created.', 'success')
        navigate(`/cv/${data.id}`)
      }
    } catch (err) { addToast(err?.message || 'Save failed', 'error') } finally { setSaving(false) }
  }

  if (loading) return <div className="page"><p>Loading...</p></div>

  return (
    <div className="page">
      <div className="page-header page-header--row">
        <h1>{isEdit ? 'Edit CV' : 'Create new CV'}</h1>
        {!isEdit && <Link to="/cv/templates" className="btn btn-ghost"><ArrowLeft size={18} /> Change template</Link>}
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group"><label>Title</label><input value={form.title} onChange={e => update('title', e.target.value)} className="form-control" /></div>
        <div className="form-group"><label>Template</label><select value={form.template} onChange={e => update('template', e.target.value)} className="form-control">{TEMPLATES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
        <div className="form-group"><label>Full name</label><input value={form.full_name} onChange={e => update('full_name', e.target.value)} className="form-control" /></div>
        <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="form-control" /></div>
        <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e => update('phone', e.target.value)} className="form-control" /></div>
        <div className="form-group"><label>Location</label><input value={form.location} onChange={e => update('location', e.target.value)} className="form-control" /></div>
        <div className="form-group">
          <label>Summary</label>
          <div className="form-row-with-btn">
            <textarea value={form.summary} onChange={e => update('summary', e.target.value)} className="form-control" rows={4} />
            <button type="button" className="btn btn-secondary" onClick={() => handleEnhance('summary')} disabled={!!enhancing}><Sparkles size={14} /> {enhancing === 'summary' ? '...' : 'Enhance'}</button>
          </div>
        </div>

        <h3 style={{ marginTop: '1.5rem' }}>Experience</h3>
        <p className="muted" style={{ marginBottom: '0.5rem' }}>Add structured entries, or use the text area below for quick input.</p>
        {(form.experience_structured || []).map((exp, i) => (
          <div key={i} className="card" style={{ padding: '1rem', marginBottom: '0.5rem' }}>
            <div className="form-row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
              <input placeholder="Role" value={exp.role} onChange={e => updateArrItem('experience_structured', i, 'role', e.target.value)} className="form-control" style={{ flex: 1, minWidth: 120 }} />
              <input placeholder="Company" value={exp.company} onChange={e => updateArrItem('experience_structured', i, 'company', e.target.value)} className="form-control" style={{ flex: 1, minWidth: 120 }} />
              <input placeholder="Location" value={exp.location} onChange={e => updateArrItem('experience_structured', i, 'location', e.target.value)} className="form-control" style={{ width: 100 }} />
              <input placeholder="Start" value={exp.start_date} onChange={e => updateArrItem('experience_structured', i, 'start_date', e.target.value)} className="form-control" style={{ width: 80 }} />
              <input placeholder="End" value={exp.end_date} onChange={e => updateArrItem('experience_structured', i, 'end_date', e.target.value)} className="form-control" style={{ width: 80 }} />
              <label><input type="checkbox" checked={!!exp.current} onChange={e => updateArrItem('experience_structured', i, 'current', e.target.checked)} /> Current</label>
              <button type="button" className="btn btn-ghost" onClick={() => removeArr('experience_structured', i)}><Trash2 size={14} /></button>
            </div>
            <textarea placeholder="Bullet points" value={exp.bullets} onChange={e => updateArrItem('experience_structured', i, 'bullets', e.target.value)} className="form-control" rows={2} style={{ marginTop: '0.5rem' }} />
          </div>
        ))}
        <button type="button" className="btn btn-ghost" onClick={() => addArr('experience_structured', emptyExp)}><Plus size={14} /> Add experience</button>
        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <label>Or paste plain text</label>
          <textarea value={form.experience} onChange={e => update('experience', e.target.value)} className="form-control" rows={3} />
        </div>

        <h3 style={{ marginTop: '1.5rem' }}>Education</h3>
        {(form.education_structured || []).map((edu, i) => (
          <div key={i} className="card" style={{ padding: '1rem', marginBottom: '0.5rem' }}>
            <div className="form-row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
              <input placeholder="Degree" value={edu.degree} onChange={e => updateArrItem('education_structured', i, 'degree', e.target.value)} className="form-control" style={{ flex: 1 }} />
              <input placeholder="Institution" value={edu.institution} onChange={e => updateArrItem('education_structured', i, 'institution', e.target.value)} className="form-control" style={{ flex: 1 }} />
              <input placeholder="Start" value={edu.start_date} onChange={e => updateArrItem('education_structured', i, 'start_date', e.target.value)} className="form-control" style={{ width: 70 }} />
              <input placeholder="End" value={edu.end_date} onChange={e => updateArrItem('education_structured', i, 'end_date', e.target.value)} className="form-control" style={{ width: 70 }} />
              <button type="button" className="btn btn-ghost" onClick={() => removeArr('education_structured', i)}><Trash2 size={14} /></button>
            </div>
            <input placeholder="Honors" value={edu.honors} onChange={e => updateArrItem('education_structured', i, 'honors', e.target.value)} className="form-control" style={{ marginTop: '0.5rem' }} />
          </div>
        ))}
        <button type="button" className="btn btn-ghost" onClick={() => addArr('education_structured', emptyEdu)}><Plus size={14} /> Add education</button>
        <div className="form-group" style={{ marginTop: '0.5rem' }}><textarea value={form.education} onChange={e => update('education', e.target.value)} className="form-control" rows={2} placeholder="Or plain text" /></div>

        <h3 style={{ marginTop: '1.5rem' }}>Skills</h3>
        {(form.skills_structured || []).map((sk, i) => (
          <div key={i} className="form-row" style={{ marginBottom: '0.35rem', gap: '0.35rem' }}>
            <input placeholder="Category (e.g. Technical)" value={sk.category} onChange={e => updateArrItem('skills_structured', i, 'category', e.target.value)} className="form-control" style={{ width: 140 }} />
            <input placeholder="Items (e.g. Python, React)" value={sk.items} onChange={e => updateArrItem('skills_structured', i, 'items', e.target.value)} className="form-control" style={{ flex: 1 }} />
            <button type="button" className="btn btn-ghost" onClick={() => removeArr('skills_structured', i)}><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost" onClick={() => addArr('skills_structured', emptySkill)}><Plus size={14} /> Add skill category</button>
        <div className="form-group" style={{ marginTop: '0.5rem' }}><textarea value={form.skills} onChange={e => update('skills', e.target.value)} className="form-control" rows={2} placeholder="Or comma-separated" /></div>

        <div style={{ marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setExtraOpen(!extraOpen)}>{extraOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />} Optional sections</button>
          {extraOpen && (
            <>
              <h4 style={{ marginTop: '1rem' }}>Certifications</h4>
              {(form.certifications || []).map((c, i) => (
                <div key={i} className="form-row" style={{ marginBottom: '0.35rem', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <input placeholder="Name" value={c.name} onChange={e => updateArrItem('certifications', i, 'name', e.target.value)} className="form-control" style={{ width: 160 }} />
                  <input placeholder="Issuer" value={c.issuer} onChange={e => updateArrItem('certifications', i, 'issuer', e.target.value)} className="form-control" style={{ width: 120 }} />
                  <input placeholder="Date" value={c.date} onChange={e => updateArrItem('certifications', i, 'date', e.target.value)} className="form-control" style={{ width: 80 }} />
                  <button type="button" className="btn btn-ghost" onClick={() => removeArr('certifications', i)}><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" className="btn btn-ghost" onClick={() => addArr('certifications', emptyCert)}><Plus size={14} /> Add</button>

              <h4 style={{ marginTop: '1rem' }}>Projects</h4>
              {(form.projects || []).map((p, i) => (
                <div key={i} className="card" style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                  <input placeholder="Project name" value={p.name} onChange={e => updateArrItem('projects', i, 'name', e.target.value)} className="form-control" style={{ marginBottom: '0.35rem' }} />
                  <textarea placeholder="Description" value={p.description} onChange={e => updateArrItem('projects', i, 'description', e.target.value)} className="form-control" rows={2} />
                  <input placeholder="Tech" value={p.tech} onChange={e => updateArrItem('projects', i, 'tech', e.target.value)} className="form-control" style={{ marginTop: '0.35rem' }} />
                  <button type="button" className="btn btn-ghost" style={{ marginTop: '0.35rem' }} onClick={() => removeArr('projects', i)}><Trash2 size={14} /> Remove</button>
                </div>
              ))}
              <button type="button" className="btn btn-ghost" onClick={() => addArr('projects', emptyProj)}><Plus size={14} /> Add project</button>

              <h4 style={{ marginTop: '1rem' }}>Languages</h4>
              {(form.languages || []).map((l, i) => (
                <div key={i} className="form-row" style={{ marginBottom: '0.35rem' }}>
                  <input placeholder="Language" value={l.language} onChange={e => updateArrItem('languages', i, 'language', e.target.value)} className="form-control" style={{ width: 120 }} />
                  <input placeholder="Proficiency" value={l.proficiency} onChange={e => updateArrItem('languages', i, 'proficiency', e.target.value)} className="form-control" style={{ width: 100 }} />
                  <button type="button" className="btn btn-ghost" onClick={() => removeArr('languages', i)}><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" className="btn btn-ghost" onClick={() => addArr('languages', emptyLang)}><Plus size={14} /> Add</button>

              <h4 style={{ marginTop: '1rem' }}>Awards</h4>
              {(form.awards || []).map((a, i) => (
                <div key={i} className="form-row" style={{ marginBottom: '0.35rem', gap: '0.35rem' }}>
                  <input placeholder="Award" value={a.name} onChange={e => updateArrItem('awards', i, 'name', e.target.value)} className="form-control" style={{ flex: 1 }} />
                  <input placeholder="Issuer" value={a.issuer} onChange={e => updateArrItem('awards', i, 'issuer', e.target.value)} className="form-control" style={{ width: 100 }} />
                  <button type="button" className="btn btn-ghost" onClick={() => removeArr('awards', i)}><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" className="btn btn-ghost" onClick={() => addArr('awards', emptyAward)}><Plus size={14} /> Add</button>

              <h4 style={{ marginTop: '1rem' }}>References</h4>
              {(form.references || []).map((r, i) => (
                <div key={i} className="card" style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                  <div className="form-row" style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
                    <input placeholder="Name" value={r.name} onChange={e => updateArrItem('references', i, 'name', e.target.value)} className="form-control" style={{ minWidth: 100 }} />
                    <input placeholder="Title" value={r.title} onChange={e => updateArrItem('references', i, 'title', e.target.value)} className="form-control" style={{ minWidth: 100 }} />
                    <input placeholder="Company" value={r.company} onChange={e => updateArrItem('references', i, 'company', e.target.value)} className="form-control" style={{ minWidth: 100 }} />
                    <input placeholder="Email" type="email" value={r.email} onChange={e => updateArrItem('references', i, 'email', e.target.value)} className="form-control" style={{ minWidth: 120 }} />
                    <input placeholder="Phone" value={r.phone} onChange={e => updateArrItem('references', i, 'phone', e.target.value)} className="form-control" style={{ width: 100 }} />
                    <button type="button" className="btn btn-ghost" onClick={() => removeArr('references', i)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-ghost" onClick={() => addArr('references', emptyRef)}><Plus size={14} /> Add reference</button>
            </>
          )}
        </div>

        <div className="form-group" style={{ marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setJobMatchOpen(!jobMatchOpen)}><Target size={16} /> Job matching (Tailor & ATS)</button>
          {jobMatchOpen && (
            <div className="card" style={{ marginTop: '0.5rem', padding: '1rem' }}>
              <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} className="form-control" rows={4} placeholder="Paste job description..." style={{ marginBottom: '0.5rem' }} />
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary" onClick={handleTailor}>Tailor suggestions</button>
                <button type="button" className="btn btn-secondary" onClick={handleAts}>ATS analysis</button>
              </div>
              {tailorSuggestions && <div className="whitespace" style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}>{tailorSuggestions}</div>}
              {atsReport && <div className="whitespace" style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}>{atsReport}</div>}
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}><Save size={18} /> {saving ? 'Saving...' : 'Save CV'}</button>
        {isEdit && <Link to={`/cv/${id}`} className="btn btn-secondary" style={{ marginLeft: '0.5rem' }}>Cancel</Link>}
      </form>
    </div>
  )
}
