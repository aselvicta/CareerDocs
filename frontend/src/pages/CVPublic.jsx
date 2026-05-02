import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { api } from '../api'

export function CVPublic() {
  const { token } = useParams()
  const [cv, setCv] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    api.get(`/view/cv/${token}/`, { public: true })
      .then(setCv)
      .catch(() => setError('This CV link is invalid or has expired.'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="page"><div className="loading-state"><p>Loading...</p></div></div>
  if (error || !cv) return <div className="page"><div className="card"><p className="muted">{error || 'Not found.'}</p><Link to="/">Go to Career Docs</Link></div></div>

  return (
    <div className="page">
      <div className="page-header page-header--row" style={{ marginBottom: '1rem' }}>
        <Link to="/" className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} /> Career Docs
        </Link>
        <span className="meta">Public view</span>
      </div>
      <div className="card card--detail">
        <h2 className="cv-name">{cv.full_name || 'Name'}</h2>
        <p className="cv-contact">{[cv.email, cv.phone, cv.location].filter(Boolean).join(' · ')}</p>
        {cv.summary && (<><h3>Summary</h3><p className="whitespace">{cv.summary}</p></>)}
        {(cv.experience_structured && cv.experience_structured.length > 0) ? (
          <><h3>Experience</h3>{cv.experience_structured.map((e, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <strong>{e.role}{e.company ? ` at ${e.company}` : ''}</strong>
              {(e.start_date || e.end_date) && <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}> ({e.start_date || ''}–{e.current ? 'Present' : (e.end_date || '')})</span>}
              {e.location && <span style={{ color: 'var(--text-muted)' }}> · {e.location}</span>}
              {e.bullets && <p className="whitespace" style={{ margin: '0.25rem 0 0 0', paddingLeft: '1rem' }}>{e.bullets.split('\n').map((b, j) => b.trim() && <span key={j}>• {b}<br /></span>)}</p>}
            </div>
          ))}</>
        ) : cv.experience && (<><h3>Experience</h3><p className="whitespace">{cv.experience}</p></>)}
        {(cv.education_structured && cv.education_structured.length > 0) ? (
          <><h3>Education</h3>{cv.education_structured.map((e, i) => (
            <div key={i} style={{ marginBottom: '0.5rem' }}>
              <strong>{e.degree}{e.institution ? `, ${e.institution}` : ''}</strong>
              {(e.start_date || e.end_date) && <span style={{ color: 'var(--text-muted)' }}> ({e.start_date}–{e.end_date})</span>}
              {e.honors && <p className="whitespace" style={{ margin: 0 }}>{e.honors}</p>}
            </div>
          ))}</>
        ) : cv.education && (<><h3>Education</h3><p className="whitespace">{cv.education}</p></>)}
        {(cv.skills_structured && cv.skills_structured.length > 0) ? (
          <><h3>Skills</h3><p>{cv.skills_structured.map(s => s.category && s.items ? `${s.category}: ${s.items}` : s.items).filter(Boolean).join(' · ')}</p></>
        ) : cv.skills && (<><h3>Skills</h3><p className="whitespace">{cv.skills}</p></>)}
        {cv.certifications?.length > 0 && (<><h3>Certifications</h3><p>{cv.certifications.map(c => `${c.name}${c.issuer ? ` – ${c.issuer}` : ''}${c.date ? ` (${c.date})` : ''}`).join(' · ')}</p></>)}
        {cv.projects?.length > 0 && (<><h3>Projects</h3>{cv.projects.map((p, i) => <p key={i} className="whitespace">{p.name}{p.description ? ` – ${p.description}` : ''}{p.tech ? ` [${p.tech}]` : ''}</p>)}</>)}
        {cv.languages?.length > 0 && (<><h3>Languages</h3><p>{cv.languages.map(l => `${l.language} (${l.proficiency || '-'})`).join(', ')}</p></>)}
        {cv.awards?.length > 0 && (<><h3>Awards</h3><p>{cv.awards.map(a => `${a.name}${a.issuer ? ` – ${a.issuer}` : ''}`).join(' · ')}</p></>)}
        {cv.references?.length > 0 && (<><h3>References</h3>{cv.references.map((r, i) => <p key={i}>{r.name}, {r.title} at {r.company}{r.email ? ` · ${r.email}` : ''}</p>)}</>)}
      </div>
    </div>
  )
}
