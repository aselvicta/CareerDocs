import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { LoadingState } from './LoadingState'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingState />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}
