import { Link } from 'react-router-dom'
import { FileText, Sparkles, Layout, Minus, Briefcase, ArrowRight } from 'lucide-react'

const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Timeless, clear structure. Ideal for traditional industries and senior roles.',
    icon: FileText,
    preview: 'classic',
    accent: '#3b82f6',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean lines and subtle hierarchy. Perfect for tech and creative roles.',
    icon: Sparkles,
    preview: 'modern',
    accent: '#8b5cf6',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Maximum impact with minimal clutter. Best for design and UX portfolios.',
    icon: Minus,
    preview: 'minimal',
    accent: '#10b981',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Structured and formal. Suits finance, law, and corporate positions.',
    icon: Briefcase,
    preview: 'professional',
    accent: '#f59e0b',
  },
]

function TemplatePreview({ type }) {
  const isClassic = type === 'classic'
  const isModern = type === 'modern'
  const isMinimal = type === 'minimal'
  const isPro = type === 'professional'
  return (
    <div className={`template-preview template-preview--${type}`}>
      <div className="tp-header">
        <div className="tp-name">Jane Doe</div>
        <div className="tp-contact">jane@email.com · +1 234 567 890</div>
      </div>
      {(isClassic || isPro) && <div className="tp-section">Summary</div>}
      <div className="tp-body">
        <div className="tp-line tp-line--short" />
        <div className="tp-line" />
        <div className="tp-line tp-line--short" />
      </div>
      <div className="tp-section">Experience</div>
      <div className="tp-body">
        <div className="tp-line" />
        <div className="tp-line tp-line--short" />
      </div>
      {!isMinimal && (
        <>
          <div className="tp-section">Education</div>
          <div className="tp-line tp-line--short" />
        </>
      )}
    </div>
  )
}

export function CVTemplates() {
  return (
    <div className="page page--templates">
      <div className="page-header">
        <h1>Choose a CV template</h1>
        <p className="subtitle">Pick a style that fits your industry. You can change it anytime.</p>
      </div>
      <div className="template-grid">
        {TEMPLATES.map((t) => {
          const Icon = t.icon
          return (
            <div key={t.id} className="template-card" style={{ '--accent': t.accent }}>
              <div className="template-card__preview">
                <TemplatePreview type={t.preview} />
              </div>
              <div className="template-card__body">
                <div className="template-card__icon">
                  <Icon size={24} strokeWidth={1.5} />
                </div>
                <h3>{t.name}</h3>
                <p>{t.description}</p>
                <span className="template-card__hint">Click below to use</span>
                <Link to={`/cv/new?template=${t.id}`} className="btn btn-primary btn--template">
                  Use this template <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )
        })}
      </div>
      <p className="template-footer">
        <Link to="/cv" className="link-muted">← Back to my CVs</Link>
      </p>
    </div>
  )
}
