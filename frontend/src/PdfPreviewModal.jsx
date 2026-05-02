import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { api } from './api'

export function PdfPreviewModal({ open, onClose, pdfPath, title = 'Preview' }) {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !pdfPath) {
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    let objectUrl = null
    api.getBlob(pdfPath)
      .then(blob => {
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(e => setError(e?.message || 'Failed to load PDF'))
      .finally(() => setLoading(false))
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setUrl(null)
    }
  }, [open, pdfPath])

  if (!open) return null

  return (
    <div className="pdf-preview-overlay" onClick={onClose}>
      <div className="pdf-preview-modal" onClick={e => e.stopPropagation()}>
        <div className="pdf-preview-header">
          <h3>{title}</h3>
          <button type="button" className="pdf-preview-close" onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>
        <div className="pdf-preview-body">
          {loading && <div className="loading-state"><p>Loading PDF…</p></div>}
          {error && <p className="error-message">{error}</p>}
          {url && !loading && (
            <iframe src={url} title={title} className="pdf-preview-iframe" />
          )}
        </div>
      </div>
    </div>
  )
}
