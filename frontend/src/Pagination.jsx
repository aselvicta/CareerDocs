import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({ page, pages, total, onPage, noun = 'items', busy = false }) {
  if (pages <= 1) return null
  return (
    <nav className="pager" aria-label="Pagination">
      <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1 || busy} onClick={() => onPage(page - 1)}>
        <ChevronLeft size={16} /> Previous
      </button>
      <span className="pager__info">
        Page {page} of {pages} <span className="muted">· {total} {noun}</span>
      </span>
      <button type="button" className="btn btn-secondary btn-sm" disabled={page >= pages || busy} onClick={() => onPage(page + 1)}>
        Next <ChevronRight size={16} />
      </button>
    </nav>
  )
}
