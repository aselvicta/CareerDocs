import { memo } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff } from 'lucide-react'
import { CVDocument } from './CVDocument'
import { LetterDocument } from './LetterDocument'
import { ScaledDoc } from './ScaledDoc'
import { ACCENTS, CATEGORIES, DENSITIES, FONTS, SECTION_LABEL, TEMPLATES, fontCss, resolveDesign } from './templates'
import { SAMPLE_CV, SAMPLE_LETTER } from './sample'

const CAT = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]))

const TemplateGrid = memo(function TemplateGrid({ kind, value, accent, onPick }) {
  return (
    <div className="dp-templates">
      {TEMPLATES.map(t => (
        <button
          key={t.id}
          type="button"
          className={`dp-tpl ${value === t.id ? 'is-active' : ''}`}
          onClick={() => onPick(t.id)}
          aria-pressed={value === t.id}
        >
          <span className="dp-tpl__page">
            <ScaledDoc clip>
              {kind === 'letter'
                ? <LetterDocument letter={SAMPLE_LETTER} template={t.id} design={accent ? { accent } : {}} />
                : <CVDocument cv={SAMPLE_CV} template={t.id} design={accent ? { accent } : {}} />}
            </ScaledDoc>
          </span>
          <span className="dp-tpl__name">{t.name}</span>
          <span className="dp-tpl__cat">{CAT[t.category]}</span>
        </button>
      ))}
    </div>
  )
})

/**
 * Template + look & feel controls shared by the CV and letter editors.
 * `design` is the stored object; only explicit choices are saved, so a template
 * switch keeps template defaults for anything the user never touched.
 */
export function DesignPanel({ kind = 'cv', template, design, onTemplate, onDesign, hasPhoto }) {
  const d = resolveDesign(template, design)
  const set = patch => onDesign({ ...design, ...patch })

  function move(key, dir) {
    const order = [...d.order]
    const i = order.indexOf(key)
    const j = i + dir
    if (j < 0 || j >= order.length) return
    ;[order[i], order[j]] = [order[j], order[i]]
    set({ section_order: order })
  }
  function toggle(key) {
    const hidden = new Set(d.hidden)
    if (hidden.has(key)) hidden.delete(key)
    else hidden.add(key)
    set({ hidden: [...hidden] })
  }

  return (
    <div className="dp">
      <section className="dp-group">
        <div className="dp-group__head">
          <h3>Template</h3>
          <span className="dp-hint">{d.template.name}</span>
        </div>
        <TemplateGrid kind={kind} value={d.template.id} accent={design?.accent} onPick={onTemplate} />
      </section>

      <section className="dp-group">
        <div className="dp-group__head">
          <h3>Colour</h3>
          {design?.accent && <button type="button" className="dp-reset" onClick={() => set({ accent: undefined })}>Use template colour</button>}
        </div>
        <div className="dp-swatches">
          {ACCENTS.map(a => (
            <button
              key={a.hex}
              type="button"
              className={`swatch swatch--lg ${d.accent.toLowerCase() === a.hex ? 'is-active' : ''}`}
              style={{ '--swatch': a.hex }}
              onClick={() => set({ accent: a.hex })}
              title={a.name}
              aria-label={a.name}
            />
          ))}
          <label className="swatch swatch--lg swatch--custom" title="Custom colour">
            <input type="color" value={d.accent} onChange={e => set({ accent: e.target.value })} aria-label="Custom colour" />
          </label>
        </div>
      </section>

      <section className="dp-group">
        <div className="dp-group__head"><h3>Font</h3></div>
        <div className="dp-seg">
          {FONTS.map(f => (
            <button key={f.id} type="button" className={d.font === f.id ? 'is-active' : ''} onClick={() => set({ font: f.id })}>
              <span style={{ fontFamily: fontCss(f.id) }} className="dp-seg__sample">{f.sample}</span>
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section className="dp-group">
        <div className="dp-group__head"><h3>Spacing</h3></div>
        <div className="dp-seg dp-seg--text">
          {DENSITIES.map(x => (
            <button key={x.id} type="button" className={d.density === x.id ? 'is-active' : ''} onClick={() => set({ density: x.id })}>
              {x.label}
            </button>
          ))}
        </div>
        <p className="dp-note">Compact helps fit a second page onto one.</p>
      </section>

      {d.template.photo && (
        <section className="dp-group">
          <div className="dp-group__head"><h3>Photo</h3></div>
          <label className="dp-check">
            <input type="checkbox" checked={d.showPhoto} onChange={e => set({ show_photo: e.target.checked })} />
            Show {hasPhoto ? 'my photo' : 'initials'} in this template
          </label>
          <p className="dp-note">Many UK, US and Canadian employers prefer CVs without photos. ATS templates never show one.</p>
        </section>
      )}

      {kind === 'cv' && (
        <section className="dp-group">
          <div className="dp-group__head">
            <h3>Section order</h3>
            {(design?.section_order || design?.hidden?.length) && (
              <button type="button" className="dp-reset" onClick={() => set({ section_order: undefined, hidden: undefined })}>Reset</button>
            )}
          </div>
          <ol className="dp-order">
            {d.order.map((k, i) => (
              <li key={k} className={d.hidden.has(k) ? 'is-hidden' : ''}>
                <span className="dp-order__n">{i + 1}</span>
                <span className="dp-order__label">{SECTION_LABEL[k]}</span>
                <button type="button" onClick={() => move(k, -1)} disabled={i === 0} aria-label={`Move ${SECTION_LABEL[k]} up`}><ArrowUp size={15} /></button>
                <button type="button" onClick={() => move(k, 1)} disabled={i === d.order.length - 1} aria-label={`Move ${SECTION_LABEL[k]} down`}><ArrowDown size={15} /></button>
                <button type="button" onClick={() => toggle(k)} aria-label={d.hidden.has(k) ? `Show ${SECTION_LABEL[k]}` : `Hide ${SECTION_LABEL[k]}`}>
                  {d.hidden.has(k) ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </li>
            ))}
          </ol>
          {d.template.aside && <p className="dp-note">In two column templates, Skills, Languages and Certifications sit in the side column.</p>}
        </section>
      )}
    </div>
  )
}
