import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/** Accessible modal: Escape closes, focus moves inside, background scroll is locked. */
export function Modal({ open, onClose, title, children, width = 520, className = '', hideClose = false, labelledBy }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const prevFocus = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    requestAnimationFrame(() => {
      const el = ref.current?.querySelector('[data-autofocus], input, textarea, select, button:not([data-close])')
      el?.focus()
    })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="md-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div ref={ref} className={`md ${className}`} style={{ maxWidth: width }} role="dialog" aria-modal="true"
        aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : title}>
        {(title || !hideClose) && (
          <div className="md__head">
            {title && <h2 className="md__title" id={labelledBy}>{title}</h2>}
            {!hideClose && (
              <button type="button" className="md__close" onClick={onClose} aria-label="Close" data-close>
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}

/** Confirmation dialog for destructive actions. */
export function ConfirmDialog({ open, title, body, confirmLabel = 'Delete', busy, onConfirm, onClose, danger = true }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={420}>
      <div className="md__body"><p className="md__text">{body}</p></div>
      <div className="md__foot">
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className={`btn ${danger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={onConfirm} disabled={busy} data-autofocus>
          {busy ? 'Working...' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
