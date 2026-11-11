import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MoreHorizontal, Search } from 'lucide-react'
import { Pagination } from '../Pagination'

export function LibraryToolbar({ lib, placeholder, noun }) {
  return (
    <div className="pg-toolbar">
      <label className="pg-searchbox">
        <Search size={16} />
        <input className="form-control" type="search" value={lib.draft} onChange={e => lib.setDraft(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      </label>
      <select className="form-control pg-select" value={lib.sort} onChange={e => lib.setSort(e.target.value)} aria-label="Sort by">
        <option value="updated">Last edited</option>
        <option value="created">Newest</option>
        <option value="oldest">Oldest edit</option>
        <option value="title">Name A to Z</option>
      </select>
      <span className="pg-count">{lib.initialLoading ? '' : `${lib.total} ${noun}${lib.total === 1 ? '' : 's'}`}</span>
    </div>
  )
}

export function LibraryPager({ lib, noun }) {
  return <Pagination page={lib.page} pages={lib.pages} total={lib.total} onPage={lib.setPage} noun={noun} busy={lib.loading} />
}

/** "More" menu on a document card. items: [{ icon, label, onClick | to, danger }] */
export function CardMenu({ items, label = 'More actions' }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return undefined
    const close = () => setOpen(false)
    const onKey = e => { if (e.key === 'Escape') close() }
    document.addEventListener('click', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div className="kebab">
      <button type="button" className="kebab__btn" aria-label={label} aria-haspopup="menu" aria-expanded={open}
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}>
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="sh-menu sh-menu--above" role="menu">
          {items.filter(Boolean).map(item => {
            const { label: text, onClick, to, danger } = item
            const Icon = item.icon
            return to ? (
              <Link key={text} to={to} role="menuitem" className={`sh-menu__item sh-menu__item--row ${danger ? 'is-danger' : ''}`}><Icon size={16} /> {text}</Link>
            ) : (
              <button key={text} type="button" role="menuitem" className={`sh-menu__item sh-menu__item--row ${danger ? 'is-danger' : ''}`} onClick={onClick}><Icon size={16} /> {text}</button>
            )
          })}
        </div>
      )}
    </div>
  )
}
