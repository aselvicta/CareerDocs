import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Eye, PenLine, Save } from 'lucide-react'
import { ScaledDoc } from './ScaledDoc'
import './studio.css'

/**
 * Split-screen editor frame: form on the left, live A4 preview on the right.
 * On narrow screens a toggle switches between the two.
 */
export function EditorShell({
  backTo, backLabel, title, onTitle, titlePlaceholder, dirty, saving, onSave, saveLabel = 'Save',
  tab, onTab, tabs, extraActions, preview, previewLabel, children,
}) {
  const [mobileView, setMobileView] = useState('edit')

  // Ctrl/Cmd+S saves; warn before leaving with unsaved changes.
  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        onSave()
      }
    }
    const onBeforeUnload = e => { if (dirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('keydown', onKey)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [onSave, dirty])

  return (
    <div className={`ed ed--${mobileView}`}>
      <div className="ed-bar">
        <Link to={backTo} className="ed-bar__back" title={backLabel}><ArrowLeft size={18} /><span>{backLabel}</span></Link>
        <input
          className="ed-bar__title"
          value={title}
          onChange={e => onTitle(e.target.value)}
          placeholder={titlePlaceholder}
          aria-label="Document title"
        />
        <span className={`ed-bar__status ${dirty ? 'is-dirty' : ''}`}>{saving ? 'Saving...' : dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        <div className="ed-bar__actions">
          {extraActions}
          <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : saveLabel}
          </button>
        </div>
      </div>

      <div className="ed-split">
        <div className="ed-form">
          <div className="ed-tabs" role="tablist">
            {tabs.map(t => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
                className={`ed-tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => onTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="ed-form__body">{children}</div>
        </div>
        <div className="ed-preview" aria-label="Live preview">
          <div className="ed-preview__head">
            <span>{previewLabel}</span>
            <span className="ed-preview__live">Live preview</span>
          </div>
          <div className="ed-preview__page">
            <ScaledDoc markers>{preview}</ScaledDoc>
          </div>
        </div>
      </div>

      <button type="button" className="ed-toggle" onClick={() => setMobileView(v => (v === 'edit' ? 'preview' : 'edit'))}>
        {mobileView === 'edit' ? <><Eye size={18} /> Preview</> : <><PenLine size={18} /> Edit</>}
      </button>
    </div>
  )
}

/** Collapsible card used for each form section. */
export function Panel({ id, title, summary, open, onToggle, children, actions }) {
  return (
    <section className={`ed-panel ${open ? 'is-open' : ''}`} id={id}>
      <button type="button" className="ed-panel__head" onClick={onToggle} aria-expanded={open}>
        <span className="ed-panel__title">{title}</span>
        {!open && summary && <span className="ed-panel__summary">{summary}</span>}
        <span className="ed-panel__chev" aria-hidden />
      </button>
      {open && (
        <div className="ed-panel__body">
          {children}
          {actions && <div className="ed-panel__actions">{actions}</div>}
        </div>
      )}
    </section>
  )
}

export function Field({ label, children, wide, hint }) {
  return (
    <label className={`ed-field ${wide ? 'ed-field--wide' : ''}`}>
      <span className="ed-field__label">{label}</span>
      {children}
      {hint && <span className="ed-field__hint">{hint}</span>}
    </label>
  )
}
