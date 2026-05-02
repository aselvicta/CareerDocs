import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Mail, Plus, ChevronRight, Sparkles } from 'lucide-react'
import { api } from '../api'

export function Dashboard() {
  const [cvs, setCvs] = useState([])
  const [letters, setLetters] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/cvs/'), api.get('/letters/')])
      .then(([cvsData, lettersData]) => {
        setCvs(Array.isArray(cvsData) ? cvsData.slice(0, 10) : [])
        setLetters(Array.isArray(lettersData) ? lettersData.slice(0, 10) : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="page">
        <div className="loading-state">
          <Sparkles size={32} className="spin-slow" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="subtitle">Create and manage your CVs and professional letters.</p>
      </div>

      <section className="dashboard-section">
        <div className="section-header">
          <h2><FileText size={22} /> CVs</h2>
          <div className="section-actions">
            <Link to="/cv/templates" className="btn btn-primary">
              <Plus size={18} /> New CV
            </Link>
            <Link to="/cv" className="btn btn-ghost">View all <ChevronRight size={16} /></Link>
          </div>
        </div>
        {cvs.length ? (
          <ul className="item-list">
            {cvs.map(cv => (
              <li key={cv.id}>
                <Link to={`/cv/${cv.id}`} className="item-list__link">
                  <span className="item-list__title">{cv.title}</span>
                  <span className="item-list__meta">{cv.template_display} · {new Date(cv.updated_at).toLocaleDateString()}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No CVs yet. <Link to="/cv/templates">Choose a template</Link> to create your first.</p>
        )}
      </section>

      <section className="dashboard-section">
        <div className="section-header">
          <h2><Mail size={22} /> Letters</h2>
          <div className="section-actions">
            <Link to="/letters/new" className="btn btn-primary"><Plus size={18} /> New letter</Link>
            <Link to="/letters" className="btn btn-ghost">View all <ChevronRight size={16} /></Link>
          </div>
        </div>
        {letters.length ? (
          <ul className="item-list">
            {letters.map(l => (
              <li key={l.id}>
                <Link to={`/letters/${l.id}`} className="item-list__link">
                  <span className="item-list__title">{l.letter_type_display}{l.title ? ` — ${l.title}` : ''}</span>
                  <span className="item-list__meta">{new Date(l.updated_at).toLocaleDateString()}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No letters yet. <Link to="/letters/new">Create a cover letter or other letter</Link>.</p>
        )}
      </section>
    </div>
  )
}
