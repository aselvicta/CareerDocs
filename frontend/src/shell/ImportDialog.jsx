import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileUp, FileText, Check } from 'lucide-react'
import { api } from '../api'
import { TEMPLATES } from '../cv/templates'
import { Modal } from './Modal'

const STEPS = ['Uploading your file', 'Reading the text', 'Sorting it into sections', 'Building your CV']
const MAX_MB = 5

/**
 * Import an existing CV (.docx or .pdf). The backend extracts the text, structures it
 * (AI when available) and creates a CV; we then open it in the editor to review.
 */
export function ImportDialog({ open, onClose, template: initialTemplate }) {
  const navigate = useNavigate()
  const input = useRef(null)
  const [file, setFile] = useState(null)
  const [template, setTemplate] = useState(initialTemplate || 'classic')
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!busy) return undefined
    const t = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 2600)
    return () => clearInterval(t)
  }, [busy])

  function reset() {
    setFile(null); setError(''); setBusy(false); setStep(0); setDrag(false)
  }
  function close() {
    if (busy) return
    reset()
    onClose()
  }

  function pick(f) {
    setError('')
    if (!f) return
    const ok = /\.(docx|pdf)$/i.test(f.name)
    if (!ok) { setError(/\.doc$/i.test(f.name) ? 'Old .doc files are not supported. In Word choose File, Save As, Word Document (.docx).' : 'Choose a Word (.docx) or PDF file.'); return }
    if (f.size > MAX_MB * 1024 * 1024) { setError(`That file is over ${MAX_MB} MB.`); return }
    setFile(f)
  }

  async function submit() {
    if (!file) return
    setBusy(true); setStep(0); setError('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('template', template)
    try {
      const data = await api.postMultipart('/cvs/import/', fd)
      reset()
      onClose()
      navigate(`/cv/${data.cv.id}/edit`, { state: { imported: { method: data.method, found: data.found, file: file.name } } })
    } catch (e) {
      setBusy(false)
      setError(e?.message || 'Import failed. Try again.')
    }
  }

  return (
    <Modal open={open} onClose={close} title="Import your CV" width={540}>
      <div className="md__body">
        {busy ? (
          <div className="imp-progress" aria-live="polite">
            <ol>
              {STEPS.map((s, i) => (
                <li key={s} className={i < step ? 'is-done' : i === step ? 'is-active' : ''}>
                  <span className="imp-progress__dot">{i < step ? <Check size={12} strokeWidth={3} /> : null}</span>
                  {s}
                </li>
              ))}
            </ol>
            <p className="imp-progress__file"><FileText size={15} /> {file?.name}</p>
          </div>
        ) : (
          <>
            <p className="md__text">Upload a Word or PDF CV. We pull out your details, experience, education and skills so you can restyle and edit them in any template.</p>
            <div
              className={`imp-drop ${drag ? 'is-drag' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]) }}
              onClick={() => input.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click() } }}
            >
              {file ? (
                <>
                  <FileText size={26} />
                  <strong>{file.name}</strong>
                  <span>{(file.size / 1024).toFixed(0)} KB. Click to choose a different file.</span>
                </>
              ) : (
                <>
                  <FileUp size={26} />
                  <strong>Drop your CV here, or click to browse</strong>
                  <span>.docx or .pdf, up to {MAX_MB} MB</span>
                </>
              )}
              <input ref={input} type="file" accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden
                onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
            </div>
            <label className="imp-template">
              <span>Start in template</span>
              <select className="form-control" value={template} onChange={e => setTemplate(e.target.value)}>
                {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            {error && <p className="imp-error" role="alert">{error}</p>}
            <p className="imp-note">Your file is only used to fill in the CV and is not stored. Scanned images cannot be read.</p>
          </>
        )}
      </div>
      {!busy && (
        <div className="md__foot">
          <button type="button" className="btn btn-ghost" onClick={close}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={!file}>
            Import CV
          </button>
        </div>
      )}
    </Modal>
  )
}
