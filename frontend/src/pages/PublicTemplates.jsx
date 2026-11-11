import { Link } from 'react-router-dom'
import { AppLogo, Wordmark } from '../AppLogo'
import { CVTemplates } from './CVTemplates'
import './landing.css'

/** Signed-out template gallery at /templates, reachable from the landing page. */
export function PublicTemplates() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-wrap lp-nav__inner">
          <Link to="/" className="lp-brand" aria-label="CareerDocs home">
            <AppLogo className="lp-brand__mark" alt="" /> <Wordmark />
          </Link>
          <div className="lp-nav__actions">
            <Link to="/login" className="lp-link">Log in</Link>
            <Link to="/register" className="lp-btn lp-btn--primary">Build my CV</Link>
          </div>
        </div>
      </header>
      <main className="container container--wide">
        <CVTemplates />
      </main>
    </div>
  )
}
