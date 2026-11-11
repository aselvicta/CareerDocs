import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileUp } from 'lucide-react'
import { useShell } from '../shell/shellContext'
import { CVDocument } from '../cv/CVDocument'
import { LetterDocument } from '../cv/LetterDocument'
import { ScaledDoc } from '../cv/ScaledDoc'
import { ACCENTS, CATEGORIES, TEMPLATES } from '../cv/templates'
import { SAMPLE_CV, SAMPLE_LETTER } from '../cv/sample'
import '../cv/studio.css'

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]))

/**
 * Template gallery for CVs (/cv/templates) and cover letters (/letters/templates).
 * Thumbnails are the real renderer with sample content, so what you pick is what you get.
 */
export function CVTemplates({ kind = 'cv' }) {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || 'all'
  const [accent, setAccent] = useState(null)
  const isLetter = kind === 'letter'
  const { openImport } = useShell()

  const shown = useMemo(
    () => (category === 'all' ? TEMPLATES : TEMPLATES.filter(t => t.category === category)),
    [category],
  )
  const counts = useMemo(() => {
    const c = { all: TEMPLATES.length }
    for (const t of TEMPLATES) c[t.category] = (c[t.category] || 0) + 1
    return c
  }, [])

  function hrefFor(t) {
    const q = new URLSearchParams({ template: t.id })
    if (accent) q.set('accent', accent)
    return `${isLetter ? '/letters/new' : '/cv/new'}?${q}`
  }

  return (
    <div className="tg">
      <div className="tg-head">
        <div>
          <p className="tg-kicker">{isLetter ? 'Cover letter templates' : 'CV templates'}</p>
          <h1 className="tg-title">{isLetter ? 'Pick a letter that matches your CV' : 'Pick a template. Change it any time.'}</h1>
          <p className="tg-sub">
            {isLetter
              ? 'Every letter design pairs with the CV template of the same name, so your application looks like one set.'
              : `${TEMPLATES.length} designs, all exported as clean, selectable text that applicant tracking systems can read. Your content carries over when you switch.`}
          </p>
        </div>
        <div className="pg-actions tg-back">
          {!isLetter && <button type="button" className="btn btn-secondary" onClick={openImport}><FileUp size={16} /> Import my CV</button>}
          <Link to={isLetter ? '/letters' : '/cv'} className="btn btn-ghost"><ArrowLeft size={16} /> {isLetter ? 'My letters' : 'My CVs'}</Link>
        </div>
      </div>

      <div className="tg-toolbar">
        <div className="tg-tabs" role="tablist" aria-label="Template category">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              className={`tg-tab ${category === c.id ? 'is-active' : ''}`}
              onClick={() => setParams(c.id === 'all' ? {} : { category: c.id }, { replace: true })}
            >
              {c.label} <span className="tg-tab__count">{counts[c.id] || 0}</span>
            </button>
          ))}
        </div>
        <div className="tg-colours" aria-label="Preview colour">
          <span className="tg-colours__label">Colour</span>
          <button type="button" className={`swatch swatch--auto ${!accent ? 'is-active' : ''}`} onClick={() => setAccent(null)} title="Template default">
            <span>A</span>
          </button>
          {ACCENTS.slice(1, 9).map(a => (
            <button
              key={a.hex}
              type="button"
              className={`swatch ${accent === a.hex ? 'is-active' : ''}`}
              style={{ '--swatch': a.hex }}
              onClick={() => setAccent(a.hex)}
              title={a.name}
              aria-label={a.name}
            />
          ))}
        </div>
      </div>

      <div className="tg-grid">
        {shown.map(t => (
          <article key={t.id} className="tg-card">
            <Link to={hrefFor(t)} className="tg-card__stage" aria-label={`Use the ${t.name} template`}>
              <div className="tg-card__page">
                <ScaledDoc clip>
                  {isLetter
                    ? <LetterDocument letter={SAMPLE_LETTER} template={t.id} design={accent ? { accent } : {}} />
                    : <CVDocument cv={SAMPLE_CV} template={t.id} design={accent ? { accent } : {}} />}
                </ScaledDoc>
              </div>
              <span className="tg-card__cta">Use this template</span>
            </Link>
            <div className="tg-card__meta">
              <div className="tg-card__row">
                <h2>{t.name}</h2>
                <span className="tg-card__cat">{CATEGORY_LABEL[t.category]}</span>
              </div>
              <p>{t.desc}</p>
              <div className="tg-card__facts">
                <span>{t.aside ? 'Two column' : 'One column'}</span>
                {t.photo && <span>Photo optional</span>}
                {t.category === 'ats' && <span>Best for ATS</span>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export function LetterTemplates() {
  return <CVTemplates kind="letter" />
}
