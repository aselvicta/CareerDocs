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
import { SeoPage } from './pages/SeoPage'
import { PublicTemplates } from './pages/PublicTemplates'
import { NotFound } from './pages/NotFound'
import { trackPageView } from './analytics'
import { useSeo } from './seo/head'
import { TOOL_PAGES } from './seo/content'

// Route-level code splitting: each page is its own chunk, fetched on first visit.
// The admin console is never downloaded by regular users.
const named = (loader, name) => lazy(() => loader().then(m => ({ default: m[name] })))
const PrivacyPolicy = named(() => import('./pages/Legal'), 'PrivacyPolicy')
const TermsOfService = named(() => import('./pages/Legal'), 'TermsOfService')
const OAuthCallback = named(() => import('./pages/OAuthCallback'), 'OAuthCallback')
const Dashboard = named(() => import('./pages/Dashboard'), 'Dashboard')
const CVList = named(() => import('./pages/CVList'), 'CVList')
const CVTemplates = named(() => import('./pages/CVTemplates'), 'CVTemplates')
const LetterTemplates = named(() => import('./pages/CVTemplates'), 'LetterTemplates')
const CVPrint = named(() => import('./pages/PrintView'), 'CVPrint')
const LetterPrint = named(() => import('./pages/PrintView'), 'LetterPrint')
const PublicCVPrint = named(() => import('./pages/PrintView'), 'PublicCVPrint')
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

/** Title, description, canonical, Open Graph and JSON-LD for the current URL. */
function SeoSync() {
  const { pathname } = useLocation()
  useSeo(pathname)
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
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/view/cv/:token" element={<CVPublic />} />
      <Route path="/view/cv/:token/print" element={<PublicCVPrint />} />
      <Route path="/templates" element={user ? <Navigate to="/cv/templates" replace /> : <PublicTemplates />} />
      {/* Public content pages (src/seo/content.js): prerendered at build time and listed in the sitemap */}
      {TOOL_PAGES.map(p => <Route key={p.path} path={p.path} element={<SeoPage />} />)}
      <Route path="/guides" element={<SeoPage />} />
      <Route path="/guides/:slug" element={<SeoPage />} />
      {/* Print views: just the document, used to save a pixel-exact PDF */}
      <Route path="/print/cv/:id" element={<ProtectedRoute><CVPrint /></ProtectedRoute>} />
      <Route path="/print/letter/:id" element={<ProtectedRoute><LetterPrint /></ProtectedRoute>} />
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
        <Route path="letters/templates" element={<LetterTemplates />} />
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
      <Route path="*" element={user ? <Navigate to="/" replace /> : <NotFound />} />
    </Routes>
    </Suspense>
  )
}

/** Everything inside the router. Shared with the build-time prerender (entry-server.jsx). */
export function AppTree() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <EmailDraftProvider>
          <AuthProvider>
            <PageTracker />
            <SeoSync />
            <AppRoutes />
          </AuthProvider>
        </EmailDraftProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppTree />
      <Analytics />
    </BrowserRouter>
  )
}
