import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'

/**
 * Editable list of structured entries (experience, education, projects...).
 * `fields`: [{ key, label, type: 'text' | 'textarea' | 'checkbox', wide, placeholder, rows, hint }]
 */
export function EntryList({ items = [], onChange, fields, makeEmpty, titleOf, addLabel, renderExtra }) {
  const update = (i, key, value) => onChange(items.map((it, j) => (j === i ? { ...it, [key]: value } : it)))
  const remove = i => onChange(items.filter((_, j) => j !== i))
  const move = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="ed-entries">
      {items.map((item, i) => (
        <div key={i} className="ed-entry">
          <div className="ed-entry__head">
            <span className="ed-entry__title">{titleOf(item) || <em>Untitled</em>}</span>
            <div className="ed-entry__tools">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp size={15} /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down"><ArrowDown size={15} /></button>
              <button type="button" onClick={() => remove(i)} aria-label="Remove" className="is-danger"><Trash2 size={15} /></button>
            </div>
          </div>
          <div className="ed-grid">
            {fields.map(f => {
              if (f.type === 'checkbox') {
                return (
                  <label key={f.key} className="ed-check">
                    <input type="checkbox" checked={!!item[f.key]} onChange={e => update(i, f.key, e.target.checked)} />
                    {f.label}
                  </label>
                )
              }
              const disabled = f.disabledWhen?.(item)
              return (
                <label key={f.key} className={`ed-field ${f.wide ? 'ed-field--wide' : ''}`}>
                  <span className="ed-field__label">{f.label}</span>
                  {f.type === 'textarea' ? (
                    <textarea
                      className="form-control"
                      rows={f.rows || 4}
                      value={item[f.key] || ''}
                      placeholder={f.placeholder}
                      onChange={e => update(i, f.key, e.target.value)}
                    />
                  ) : (
                    <input
                      className="form-control"
                      value={disabled ? '' : item[f.key] || ''}
                      placeholder={disabled ? 'Present' : f.placeholder}
                      disabled={disabled}
                      onChange={e => update(i, f.key, e.target.value)}
                    />
                  )}
                  {f.hint && <span className="ed-field__hint">{f.hint}</span>}
                </label>
              )
            })}
          </div>
          {renderExtra?.(item, i, (key, value) => update(i, key, value))}
        </div>
      ))}
      <button type="button" className="ed-add" onClick={() => onChange([...items, makeEmpty()])}>
        <Plus size={16} /> {addLabel}
      </button>
    </div>
  )
}
