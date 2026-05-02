import { Link, Outlet } from 'react-router-dom'
import { LayoutDashboard, FileText, Mail, LogOut, User, Sun, Moon, Send, Settings, Briefcase } from 'lucide-react'
import { useAuth } from './AuthContext'
import { useTheme } from './ThemeContext'
import { EmailAssistant } from './EmailAssistant'
import { HelpChat } from './HelpChat'

export function Layout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <>
      <nav className="nav">
        <Link to="/" className="nav__brand">
          <FileText size={20} /> Career Docs
        </Link>
        <div className="nav__links">
          <Link to="/" className="nav__link"><LayoutDashboard size={18} /> Dashboard</Link>
          <Link to="/cv" className="nav__link"><FileText size={18} /> CVs</Link>
          <Link to="/letters" className="nav__link"><Mail size={18} /> Letters</Link>
          <Link to="/applications" className="nav__link"><Briefcase size={18} /> Applications</Link>
          <Link to="/compose" className="nav__link"><Send size={18} /> Compose</Link>
          <Link to="/profile" className="nav__link"><Settings size={18} /> Profile</Link>
        </div>
        <div className="nav__user">
          <button type="button" className="nav__theme" onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <span className="nav__email"><User size={14} /> {user?.email}</span>
          <button type="button" className="nav__logout" onClick={logout} aria-label="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </nav>
      <main className="container">
        <Outlet />
      </main>
      <EmailAssistant />
      <HelpChat />
    </>
  )
}
