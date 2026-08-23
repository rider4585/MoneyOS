import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider.jsx'

/**
 * Minimal auth-guard wrapper (T2 scope: wiring only, no nav restructuring).
 * DEMO_MODE users pass straight through; Supabase users must have a session,
 * otherwise they are bounced to the login screen preserving intent.
 */
export default function ProtectedRoute({ children }) {
  const { user, isDemo, status } = useAuth()
  const location = useLocation()

  if (isDemo) return children
  if (status === 'restoring') {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="neu-card px-8 py-6 text-sm text-muted">Restoring session…</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}
