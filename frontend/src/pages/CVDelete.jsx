import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Trash2, ArrowLeft } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../ToastContext'

export function CVDelete() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [cv, setCv] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.get(`/cvs/${id}/`).then(setCv).catch(() => navigate('/cv'))
  }, [id, navigate])

  async function handleConfirm() {
    setDeleting(true)
    try {
      await api.delete(`/cvs/${id}/`)
      addToast('CV deleted.', 'success')
      navigate('/cv')
    } catch (e) {
      addToast(e?.message || 'Delete failed.', 'error')
      setDeleting(false)
    }
  }

  if (!cv) return <div className="page"><div className="loading-state"><p>Loading...</p></div></div>

  return (
    <div className="page">
      <div className="card card--detail">
        <h1>Delete CV</h1>
        <p>Are you sure you want to delete <strong>{cv.title}</strong>? This cannot be undone.</p>
        <div className="btn-group" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn btn-danger" onClick={handleConfirm} disabled={deleting}>
            <Trash2 size={18} /> {deleting ? 'Deleting...' : 'Yes, delete'}
          </button>
          <Link to={`/cv/${id}`} className="btn btn-secondary"><ArrowLeft size={18} /> Cancel</Link>
        </div>
      </div>
    </div>
  )
}
