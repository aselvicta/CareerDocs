import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FileDown } from 'lucide-react'
import { AppLogo, Wordmark } from '../AppLogo'
import { api } from '../api'
import { CVDocument } from '../cv/CVDocument'
import { ScaledDoc } from '../cv/ScaledDoc'
import '../cv/studio.css'

/** Read-only shared CV at /view/cv/:token, rendered in its chosen template. */
export function CVPublic() {
  const { token } = useParams()
  const [state, setState] = useState({ cv: null, error: null, loading: true })

  useEffect(() => {
    let alive = true
    api.get(`/view/cv/${token}/`, { public: true })
      .then(cv => alive && setState({ cv, error: null, loading: false }))
      .catch(() => alive && setState({ cv: null, error: 'This CV link is invalid or has been turned off.', loading: false }))
    return () => { alive = false }
  }, [token])

  const { cv, error, loading } = state
  return (
    <div className="pub">
      <header className="pub-bar">
        <Link to="/" className="pub-brand"><AppLogo className="app-logo--public" alt="" /> <Wordmark /></Link>
        {cv && <Link to={`/view/cv/${token}/print`} className="btn btn-primary btn--sm"><FileDown size={15} /> Download PDF</Link>}
      </header>
      <main className="pub-main">
        {loading ? <p className="pv-msg">Loading CV...</p>
          : error ? <div className="card"><p className="muted">{error}</p><Link to="/">Go to CareerDocs</Link></div>
            : (
              <div className="pub-doc">
                <ScaledDoc><CVDocument cv={cv} /></ScaledDoc>
              </div>
            )}
        {cv && <p className="pub-foot">Made with <Link to="/">CareerDocs</Link>. Build your own CV free.</p>}
      </main>
    </div>
  )
}
