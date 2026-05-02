import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './ThemeContext'
import { ToastProvider } from './ToastContext'
import { EmailDraftProvider } from './EmailDraftContext'
import { AuthProvider, useAuth } from './AuthContext'
import { ProtectedRoute } from './ProtectedRoute'
import { Layout } from './Layout'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { CVList } from './pages/CVList'
import { CVTemplates } from './pages/CVTemplates'
import { CVForm } from './pages/CVForm'
import { CVDetail } from './pages/CVDetail'
import { CVDelete } from './pages/CVDelete'
import { LetterList } from './pages/LetterList'
import { LetterForm } from './pages/LetterForm'
import { LetterDetail } from './pages/LetterDetail'
import { LetterDelete } from './pages/LetterDelete'
import { EmailComposer } from './pages/EmailComposer'
import { Profile } from './pages/Profile'
import { CVPublic } from './pages/CVPublic'
import { ApplicationsList } from './pages/ApplicationsList'
import { ApplicationDetail } from './pages/ApplicationDetail'
import { ApplicationForm } from './pages/ApplicationForm'

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="app-loading">Loading...</div>
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/view/cv/:token" element={<CVPublic />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="cv" element={<CVList />} />
        <Route path="cv/templates" element={<CVTemplates />} />
        <Route path="cv/new" element={<CVForm />} />
        <Route path="cv/:id" element={<CVDetail />} />
        <Route path="cv/:id/edit" element={<CVForm />} />
        <Route path="cv/:id/delete" element={<CVDelete />} />
        <Route path="letters" element={<LetterList />} />
        <Route path="letters/new" element={<LetterForm />} />
        <Route path="letters/:id" element={<LetterDetail />} />
        <Route path="letters/:id/edit" element={<LetterForm />} />
        <Route path="letters/:id/delete" element={<LetterDelete />} />
        <Route path="compose" element={<EmailComposer />} />
        <Route path="profile" element={<Profile />} />
        <Route path="applications" element={<ApplicationsList />} />
        <Route path="applications/new" element={<ApplicationForm />} />
        <Route path="applications/:id" element={<ApplicationDetail />} />
        <Route path="applications/:id/edit" element={<ApplicationForm />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <EmailDraftProvider>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </EmailDraftProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
