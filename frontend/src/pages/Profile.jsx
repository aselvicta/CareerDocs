import { useState, useEffect } from 'react'
import { User, Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../ToastContext'

const empty = {
  full_name: '',
  email: '',
  phone: '',
  location: '',
  summary: '',
  references: [],
}

const emptyRef = { name: '', title: '', company: '', email: '', phone: '' }

export function Profile() {
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    api.get('/profile/')
      .then(data => setForm({
        full_name: data.full_name ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
        location: data.location ?? '',
        summary: data.summary ?? '',
        references: Array.isArray(data.references) ? data.references.map(r => ({ ...emptyRef, ...r })) : [],
      }))
      .catch(() => addToast('Failed to load profile.', 'error'))
      .finally(() => setLoading(false))
  }, [addToast])

  function update(name, value) {
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function updateRef(i, field, value) {
    setForm(prev => ({
      ...prev,
      references: prev.references.map((r, j) => j === i ? { ...r, [field]: value } : r),
    }))
  }

  function addRef() {
    setForm(prev => ({ ...prev, references: [...(prev.references || []), { ...emptyRef }] }))
  }

  function removeRef(i) {
    setForm(prev => ({ ...prev, references: prev.references.filter((_, j) => j !== i) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const { references, ...rest } = form
      await api.patch('/profile/', { ...rest, references: references.filter(r => r.name || r.title || r.company || r.email || r.phone) })
      addToast('Profile saved.', 'success')
    } catch (err) {
      addToast(err?.message || 'Save failed.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="page"><div className="loading-state"><p>Loading...</p></div></div>

  return (
    <div className="page">
      <div className="page-header page-header--row">
        <h1><User size={28} /> Profile & Default Info</h1>
        <Link to="/" className="btn btn-ghost"><ArrowLeft size={18} /> Dashboard</Link>
      </div>
      <p className="muted">Store your default personal info. New CVs and letters will auto-fill from here.</p>
      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 480, marginTop: '1rem' }}>
        <div className="form-group">
          <label>Full name</label>
          <input value={form.full_name} onChange={e => update('full_name', e.target.value)} className="form-control" placeholder="e.g. Jane Doe" />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="form-control" />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input value={form.phone} onChange={e => update('phone', e.target.value)} className="form-control" />
        </div>
        <div className="form-group">
          <label>Location</label>
          <input value={form.location} onChange={e => update('location', e.target.value)} className="form-control" placeholder="e.g. New York, NY" />
        </div>
        <div className="form-group">
          <label>Default summary</label>
          <textarea value={form.summary} onChange={e => update('summary', e.target.value)} className="form-control" rows={4} placeholder="Brief bio used when creating new CVs" />
        </div>
        <div className="form-group" style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <label style={{ margin: 0 }}>References</label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addRef}><Plus size={14} /> Add</button>
          </div>
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>Store references for quick use when building CVs.</p>
          {(form.references || []).map((r, i) => (
            <div key={i} className="card" style={{ padding: '0.75rem', marginBottom: '0.5rem', background: 'var(--bg-soft)' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeRef(i)}><Trash2 size={14} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input value={r.name} onChange={e => updateRef(i, 'name', e.target.value)} className="form-control" placeholder="Name" />
                <input value={r.title} onChange={e => updateRef(i, 'title', e.target.value)} className="form-control" placeholder="Title" />
                <input value={r.company} onChange={e => updateRef(i, 'company', e.target.value)} className="form-control" placeholder="Company" style={{ gridColumn: '1/-1' }} />
                <input type="email" value={r.email} onChange={e => updateRef(i, 'email', e.target.value)} className="form-control" placeholder="Email" />
                <input value={r.phone} onChange={e => updateRef(i, 'phone', e.target.value)} className="form-control" placeholder="Phone" />
              </div>
            </div>
          ))}
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}><Save size={18} /> {saving ? 'Saving...' : 'Save profile'}</button>
      </form>
    </div>
  )
}
