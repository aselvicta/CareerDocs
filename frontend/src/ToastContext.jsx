import { createContext, useContext, useState, useCallback } from 'react'
import { Info, CheckCircle, AlertCircle, AlertTriangle, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  info: Info,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
}

const TOAST_DURATION_MS = 4000

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, TOAST_DURATION_MS)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map(t => {
          const toastType = ICONS[t.type] ? t.type : 'info'
          const Icon = ICONS[toastType]
          return (
            <div
              key={t.id}
              className={`toast toast--${toastType}`}
              role="alert"
              style={{ '--toast-duration': `${TOAST_DURATION_MS}ms` }}
            >
              <div className="toast__body">
                <span className={`toast__icon-wrap toast__icon-wrap--${toastType}`}>
                  <Icon size={20} className="toast__icon" aria-hidden strokeWidth={2.5} />
                </span>
                <span className="toast__text">{t.message}</span>
                <button type="button" className="toast__close" onClick={() => removeToast(t.id)} aria-label="Dismiss">
                  <X size={16} strokeWidth={2.25} />
                </button>
              </div>
              <div className="toast__progress-track" aria-hidden>
                <div className={`toast__progress-bar toast__progress-bar--${toastType}`} />
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
