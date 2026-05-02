import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Trash2, ArrowLeft } from 'lucide-react'
import { api } from '../api'
import { useToast } from '../ToastContext'

export function LetterDelete() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [letter, setLetter] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.get(`/letters/${id}/`).then(setLetter).catch(() => navigate('/letters'))
  }, [id, navigate])

  async function handleConfirm() {
    setDeleting(true)
    try {
      await api.delete(`/letters/${id}/`)
      addToast('Letter deleted.', 'success')
      navigate('/letters')
    } catch (e) {
      addToast(e?.message || 'Delete failed.', 'error')
      setDeleting(false)
    }
  }

  if (!letter) return <div className="page"><div className="loading-state"><p>Loading...</p></div></div>

  return (
    <div className="page">
      <div className="card card--detail">
        <h1>Delete letter</h1>
        <p>Are you sure you want to delete this <strong>{letter.letter_type_display}</strong>? This cannot be undone.</p>
        <div className="btn-group" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn btn-danger" onClick={handleConfirm} disabled={deleting}>
            <Trash2 size={18} /> {deleting ? 'Deleting...' : 'Yes, delete'}
          </button>
          <Link to={`/letters/${id}`} className="btn btn-secondary"><ArrowLeft size={18} /> Cancel</Link>
        </div>
      </div>
    </div>
  )
}
