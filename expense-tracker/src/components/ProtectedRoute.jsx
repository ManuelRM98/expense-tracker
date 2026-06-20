import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Wraps a route element so that unauthenticated visitors are redirected to /login.
 * While the auth state is still loading (e.g. on first render / hard refresh)
 * we render nothing to avoid a flash of the login page for returning users.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null; // splash handled in main.jsx; returning null here prevents flicker
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
