import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Briefcase, ChevronsUpDown, PanelLeftClose, PanelLeftOpen, FileText, FileUp, HelpCircle, Home, LayoutTemplate, LogOut, Mail, Menu, Moon,
  PenLine, Plus, Search, Send, Settings, ShieldCheck, Sun, X,
} from 'lucide-react'
import { AppLogo, Wordmark } from './AppLogo'
import { useAuth } from './AuthContext'
import { useTheme } from './ThemeContext'
import { EmailAssistant } from './EmailAssistant'
import { HelpChat } from './HelpChat'
import { LoadingState } from './LoadingState'
import { CommandPalette } from './shell/CommandPalette'
import { ImportDialog } from './shell/ImportDialog'
import { ShellContext } from './shell/shellContext'
import './shell/shell.css'

// Pages that use the full width: template gallery, split-screen editors, document views, board.
// Editors get the whole screen: the sidebar folds to an icon rail unless the user pins it open.
const EDITOR_ROUTES = /^\/(cv|letters)\/(new|\d+\/edit)\/?$/
const RAIL_KEY = 'sh-rail'

const WIDE_ROUTES = /^\/(cv\/templates|cv\/new|cv\/\d+(\/edit)?|letters\/new|letters\/templates|letters\/\d+(\/edit)?|applications)\/?$/

const NAV = [
  { to: '/', label: 'Home', short: 'Home', icon: Home, end: true },
  { to: '/cv', label: 'CVs', short: 'CVs', icon: FileText },
  { to: '/letters', label: 'Cover letters', short: 'Letters', icon: Mail },
  { to: '/applications', label: 'Applications', short: 'Jobs', icon: Briefcase },
  { to: '/compose', label: 'Email', short: 'Email', icon: Send },
]

function initialsOf(user) {
  const src = (user?.username || user?.email || '?').replace(/@.*/, '')
  const parts = src.split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase()
}

function useOutsideClose(open, close) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onDown = e => { if (ref.current && !ref.current.contains(e.target)) close() }
    const onKey = e => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])
  return ref
}

const linkClass = ({ isActive }) => `sh-link ${isActive ? 'is-active' : ''}`

function CreateMenu({ onImport, onEmail, align = 'left', compact = false }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useOutsideClose(open, close)
  const navigate = useNavigate()
  const go = to => () => { close(); navigate(to) }
  const items = [
    { icon: FileText, label: 'New CV', hint: 'Start from a template', run: go('/cv/templates') },
    { icon: FileUp, label: 'Import CV', hint: 'From Word or PDF', run: () => { close(); onImport() } },
    { icon: PenLine, label: 'Cover letter', hint: 'Matches your CV design', run: go('/letters/templates') },
    { icon: Briefcase, label: 'Track application', hint: 'Add a job to your board', run: go('/applications/new') },
    { icon: Send, label: 'Email with AI', hint: 'Describe it, get a draft', run: () => { close(); onEmail() } },
  ]
  return (
    <div className={`sh-create ${compact ? 'sh-create--compact' : ''}`} ref={ref}>
      <button type="button" className="sh-create__btn" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu" aria-label="Create">
        <Plus size={18} strokeWidth={2.25} /> {!compact && <span>Create</span>}
      </button>
      {open && (
        <div className={`sh-menu sh-menu--${align}`} role="menu">
          {items.map(item => {
            const { label, hint, run } = item
            const Icon = item.icon
            return (
            <button key={label} type="button" role="menuitem" className="sh-menu__item" onClick={run}>
              <span className="sh-menu__icon"><Icon size={17} /></span>
              <span className="sh-menu__text"><strong>{label}</strong><small>{hint}</small></span>
            </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function UserMenu({ user, onLogout, theme, toggleTheme }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useOutsideClose(open, close)
  return (
    <div className="sh-user" ref={ref}>
      <button type="button" className="sh-user__btn" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu">
        <span className="sh-avatar">{initialsOf(user)}</span>
        <span className="sh-user__text">
          <strong>{user?.username || 'Account'}</strong>
          <small>{user?.email}</small>
        </span>
        <ChevronsUpDown size={15} className="sh-user__chev" />
      </button>
      {open && (
        <div className="sh-menu sh-menu--up" role="menu">
          <Link to="/profile" className="sh-menu__item sh-menu__item--row" role="menuitem" onClick={close}><Settings size={16} /> Profile and settings</Link>
          <button type="button" className="sh-menu__item sh-menu__item--row" role="menuitem" onClick={() => { toggleTheme(); close() }}>
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />} {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
          <div className="sh-menu__sep" />
          <button type="button" className="sh-menu__item sh-menu__item--row" role="menuitem" onClick={onLogout}><LogOut size={16} /> Log out</button>
        </div>
      )}
    </div>
  )
}

/** Signed-in app shell: sidebar on desktop, top bar + bottom tabs on mobile. */
export function Layout() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [importOpen, setImportOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  // null = follow the route (rail in editors), true/false = user's explicit choice.
  const [railPref, setRailPref] = useState(() => {
    const v = localStorage.getItem(RAIL_KEY)
    return v === null ? null : v === '1'
  })
  const rail = railPref ?? EDITOR_ROUTES.test(pathname)
  const toggleRail = useCallback(() => {
    const next = !rail
    setRailPref(next)
    localStorage.setItem(RAIL_KEY, next ? '1' : '0')
  }, [rail])
  useEffect(() => {
    document.documentElement.classList.toggle('sh-rail', rail)
    return () => document.documentElement.classList.remove('sh-rail')
  }, [rail])

  const actions = useMemo(() => ({
    openImport: () => setImportOpen(true),
    openPalette: () => setPaletteOpen(true),
    openHelp: () => { setEmailOpen(false); setHelpOpen(true) },
    openEmailWriter: () => { setHelpOpen(false); setEmailOpen(true) },
    toggleTheme,
  }), [toggleTheme])

  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        toggleRail()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleRail])

  // Close the mobile "More" sheet when the route changes.
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setMoreOpen(false)
  }

  const wide = WIDE_ROUTES.test(pathname)
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <ShellContext.Provider value={actions}>
      <div className="sh">
        <aside className={`sh-side ${rail ? 'is-rail' : ''}`} aria-label="Main navigation">
          <div className="sh-side__head">
            <Link to="/" className="sh-brand" aria-label="CareerDocs home"><AppLogo className="sh-brand__mark" alt="" /> <span className="sh-label"><Wordmark /></span></Link>
            <button type="button" className="sh-railbtn" onClick={toggleRail}
              aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'} title={`${rail ? 'Expand' : 'Collapse'} sidebar (${isMac ? '⌘' : 'Ctrl'} \\)`}>
              {rail ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
          <CreateMenu onImport={actions.openImport} onEmail={actions.openEmailWriter} compact={rail} />
          <button type="button" className="sh-search" onClick={actions.openPalette} title={rail ? 'Search' : undefined}>
            <Search size={16} /> <span className="sh-label">Search</span> <kbd className="sh-label">{isMac ? '⌘' : 'Ctrl'} K</kbd>
          </button>
          <nav className="sh-nav">
            {NAV.map(item => {
              const Icon = item.icon
              return <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} title={rail ? item.label : undefined}><Icon size={18} /> <span className="sh-label">{item.label}</span></NavLink>
            })}
            <div className="sh-nav__label">Library</div>
            <NavLink to="/cv/templates" className={linkClass} title={rail ? 'CV templates' : undefined}><LayoutTemplate size={18} /> <span className="sh-label">CV templates</span></NavLink>
            <NavLink to="/letters/templates" className={linkClass} title={rail ? 'Letter templates' : undefined}><PenLine size={18} /> <span className="sh-label">Letter templates</span></NavLink>
            {user?.is_staff && (
              <>
                <div className="sh-nav__label">Admin</div>
                <Link to="/admin" className="sh-link"><ShieldCheck size={18} /> <span className="sh-label">Admin console</span></Link>
              </>
            )}
          </nav>
          <div className="sh-side__foot">
            <button type="button" className="sh-link" onClick={actions.openHelp} title={rail ? 'Help' : undefined}><HelpCircle size={18} /> <span className="sh-label">Help</span></button>
            <NavLink to="/profile" className={linkClass} title={rail ? 'Settings' : undefined}><Settings size={18} /> <span className="sh-label">Settings</span></NavLink>
            <UserMenu user={user} onLogout={logout} theme={theme} toggleTheme={toggleTheme} />
          </div>
        </aside>

        <header className="sh-top">
          <Link to="/" className="sh-brand sh-brand--top"><AppLogo className="sh-brand__mark" alt="" /> <Wordmark /></Link>
          <div className="sh-top__actions">
            <button type="button" className="sh-iconbtn" onClick={actions.openPalette} aria-label="Search"><Search size={20} /></button>
            <CreateMenu onImport={actions.openImport} onEmail={actions.openEmailWriter} align="right" compact />
          </div>
        </header>

        <main className={`sh-main ${wide ? 'sh-main--wide' : ''}`}>
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </main>

        <nav className="sh-tabs" aria-label="Main">
          {NAV.slice(0, 4).map(item => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `sh-tab ${isActive ? 'is-active' : ''}`}>
                <Icon size={20} /> <span>{item.short}</span>
              </NavLink>
            )
          })}
          <button type="button" className={`sh-tab ${moreOpen ? 'is-active' : ''}`} onClick={() => setMoreOpen(o => !o)} aria-expanded={moreOpen}>
            {moreOpen ? <X size={20} /> : <Menu size={20} />} <span>More</span>
          </button>
        </nav>
        {moreOpen && (
          <div className="sh-sheet" role="dialog" aria-label="More">
            <div className="sh-sheet__backdrop" onClick={() => setMoreOpen(false)} />
            <div className="sh-sheet__panel">
              <div className="sh-sheet__user"><span className="sh-avatar">{initialsOf(user)}</span><span>{user?.email}</span></div>
              <Link to="/compose" className="sh-link"><Send size={18} /> Email</Link>
              <Link to="/cv/templates" className="sh-link"><LayoutTemplate size={18} /> CV templates</Link>
              <Link to="/letters/templates" className="sh-link"><PenLine size={18} /> Letter templates</Link>
              <button type="button" className="sh-link" onClick={() => { setMoreOpen(false); actions.openImport() }}><FileUp size={18} /> Import CV</button>
              <Link to="/profile" className="sh-link"><Settings size={18} /> Profile and settings</Link>
              <button type="button" className="sh-link" onClick={() => { setMoreOpen(false); actions.openHelp() }}><HelpCircle size={18} /> Help</button>
              <button type="button" className="sh-link" onClick={toggleTheme}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />} {theme === 'light' ? 'Dark mode' : 'Light mode'}</button>
              {user?.is_staff && <Link to="/admin" className="sh-link"><ShieldCheck size={18} /> Admin console</Link>}
              <button type="button" className="sh-link sh-link--danger" onClick={logout}><LogOut size={18} /> Log out</button>
            </div>
          </div>
        )}
      </div>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} actions={actions} isStaff={user?.is_staff} />
      <HelpChat open={helpOpen} onOpenChange={setHelpOpen} />
      <EmailAssistant open={emailOpen} onOpenChange={setEmailOpen} />
    </ShellContext.Provider>
  )
}
