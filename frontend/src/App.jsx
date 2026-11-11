import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ThemeProvider } from './ThemeContext'
import { ToastProvider } from './ToastContext'
import { EmailDraftProvider } from './EmailDraftContext'
import { AuthProvider, useAuth } from './AuthContext'
import { ProtectedRoute } from './ProtectedRoute'
import { Layout } from './Layout'
import { LoadingState } from './LoadingState'
import { Analytics } from '@vercel/analytics/react'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Landing } from './pages/Landing'
import { trackPageView } from './analytics'

// Route-level code splitting: each page is its own chunk, fetched on first visit.
// The admin console is never downloaded by regular users.
const named = (loader, name) => lazy(() => loader().then(m => ({ default: m[name] })))
const OAuthCallback = named(() => import('./pages/OAuthCallback'), 'OAuthCallback')
const Dashboard = named(() => import('./pages/Dashboard'), 'Dashboard')
const CVList = named(() => import('./pages/CVList'), 'CVList')
const CVTemplates = named(() => import('./pages/CVTemplates'), 'CVTemplates')
const CVForm = named(() => import('./pages/CVForm'), 'CVForm')
const CVDetail = named(() => import('./pages/CVDetail'), 'CVDetail')
const CVDelete = named(() => import('./pages/CVDelete'), 'CVDelete')
const LetterList = named(() => import('./pages/LetterList'), 'LetterList')
const LetterForm = named(() => import('./pages/LetterForm'), 'LetterForm')
const LetterDetail = named(() => import('./pages/LetterDetail'), 'LetterDetail')
const LetterDelete = named(() => import('./pages/LetterDelete'), 'LetterDelete')
const EmailComposer = named(() => import('./pages/EmailComposer'), 'EmailComposer')
const Profile = named(() => import('./pages/Profile'), 'Profile')
const CVPublic = named(() => import('./pages/CVPublic'), 'CVPublic')
const ApplicationsList = named(() => import('./pages/ApplicationsList'), 'ApplicationsList')
const ApplicationDetail = named(() => import('./pages/ApplicationDetail'), 'ApplicationDetail')
const ApplicationForm = named(() => import('./pages/ApplicationForm'), 'ApplicationForm')
const AdminGate = named(() => import('./admin/AdminShell'), 'AdminGate')
const AdminOverview = named(() => import('./admin/AdminOverview'), 'AdminOverview')
const AdminUsers = named(() => import('./admin/AdminUsers'), 'AdminUsers')
const AdminUserDetail = named(() => import('./admin/AdminUserDetail'), 'AdminUserDetail')
const AdminActivity = named(() => import('./admin/AdminActivity'), 'AdminActivity')
const AdminContent = named(() => import('./admin/AdminContent'), 'AdminContent')

function PageTracker() {
  const { pathname } = useLocation()
  const { loading } = useAuth()
  useEffect(() => {
    if (!loading) trackPageView(pathname)
  }, [pathname, loading])
  return null
}

function AppRoutes() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const skipAuthLoading = location.pathname === '/oauth/callback'
  if (loading && !skipAuthLoading) return <LoadingState />
  return (
    <Suspense fallback={<LoadingState />}>
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route path="/view/cv/:token" element={<CVPublic />} />
      {/* Admin console: separate layout + its own login, outside the client app shell */}
      <Route path="/admin" element={<AdminGate />}>
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:id" element={<AdminUserDetail />} />
        <Route path="activity" element={<AdminActivity />} />
        <Route path="content" element={<AdminContent />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
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
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <EmailDraftProvider>
            <AuthProvider>
              <PageTracker />
              <AppRoutes />
            </AuthProvider>
          </EmailDraftProvider>
        </ToastProvider>
      </ThemeProvider>
      <Analytics />
    </BrowserRouter>
  )
}
