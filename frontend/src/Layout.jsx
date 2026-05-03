import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Mail,
  LogOut,
  User,
  Sun,
  Moon,
  Send,
  Settings,
  Briefcase,
  Menu,
  X,
} from 'lucide-react'
import { AppLogo } from './AppLogo'
import { useAuth } from './AuthContext'
import { useTheme } from './ThemeContext'
import { EmailAssistant } from './EmailAssistant'
import { HelpChat } from './HelpChat'

const BREAKPOINT_NAV = '(min-width: 896px)'

const navLinkClass = 'nav__link'

export function Layout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    const mq = window.matchMedia(BREAKPOINT_NAV)
    const onMq = () => setMenuOpen(false)
    mq.addEventListener('change', onMq)
    return () => mq.removeEventListener('change', onMq)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onEscape = e => {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('keydown', onEscape)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEscape)
      document.body.style.overflow = prev
    }
  }, [menuOpen, closeMenu])

  const links = (
    <>
      <Link to="/" className={navLinkClass} onClick={closeMenu}>
        <LayoutDashboard size={18} aria-hidden /> Dashboard
      </Link>
      <Link to="/cv" className={navLinkClass} onClick={closeMenu}>
        <FileText size={18} aria-hidden /> CVs
      </Link>
      <Link to="/letters" className={navLinkClass} onClick={closeMenu}>
        <Mail size={18} aria-hidden /> Letters
      </Link>
      <Link to="/applications" className={navLinkClass} onClick={closeMenu}>
        <Briefcase size={18} aria-hidden /> Applications
      </Link>
      <Link to="/compose" className={navLinkClass} onClick={closeMenu}>
        <Send size={18} aria-hidden /> Compose
      </Link>
      <Link to="/profile" className={navLinkClass} onClick={closeMenu}>
        <Settings size={18} aria-hidden /> Profile
      </Link>
    </>
  )

  return (
    <>
      <header className={`nav ${menuOpen ? 'nav--menu-open' : ''}`}>
        <div className="nav__backdrop" aria-hidden="true" onClick={closeMenu} />
        <div className="nav__inner">
          <Link to="/" className="nav__brand" onClick={closeMenu}>
            <AppLogo className="app-logo--nav" /> <span className="nav__brand-text">Career Docs</span>
          </Link>

          <nav className="nav__links" aria-label="Main">{links}</nav>

          <div className="nav__aside">
            <button
              type="button"
              className="nav__theme"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <span className="nav__email nav__email--desktop">
              <User size={14} aria-hidden />
              <span className="nav__email-truncate">{user?.email}</span>
            </span>
            <button type="button" className="nav__logout nav__logout--desktop" onClick={logout} aria-label="Log out">
              <LogOut size={18} />
            </button>
            <button
              type="button"
              className="nav__menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-links"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen(o => !o)}
            >
              {menuOpen ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
            </button>
          </div>
        </div>

        <div id="mobile-nav-links" className="nav__sheet">
          <nav className="nav__sheet-links" aria-label="Main menu">
            {links}
          </nav>
          <div className="nav__sheet-footer">
            <p className="nav__sheet-user">
              <User size={16} aria-hidden />
              <span className="nav__sheet-email">{user?.email}</span>
            </p>
            <button type="button" className="btn btn-ghost btn--full nav__sheet-logout" onClick={() => { logout(); closeMenu() }}>
              <LogOut size={18} /> Log out
            </button>
          </div>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
      <EmailAssistant />
      <HelpChat />
    </>
  )
}
