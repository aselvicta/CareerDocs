import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { LoadingState } from './LoadingState'
import { Landing } from './pages/Landing'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingState />
  // Signed-out visitors to the home page see the marketing landing page instead of the login form.
  if (!user && location.pathname === '/') return <Landing />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}
