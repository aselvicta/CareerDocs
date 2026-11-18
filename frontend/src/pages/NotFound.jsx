import { Link } from 'react-router-dom'
import { PublicHeader, PublicFooter } from './PublicChrome'
import './landing.css'
import './seo.css'

/** Signed-out 404. The app shell marks unknown URLs noindex, so they don't count as duplicate pages. */
export function NotFound() {
  return (
    <div className="lp">
      <PublicHeader />
      <main className="lp-wrap sp-404">
        <h1>We couldn&apos;t find that page</h1>
        <p>The link may be old or mistyped. Here are some places to start instead.</p>
        <div className="lp-hero__ctas">
          <Link to="/" className="lp-btn lp-btn--primary lp-btn--lg">Go to the home page</Link>
          <Link to="/guides" className="lp-btn lp-btn--ghost lp-btn--lg">Read the guides</Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
