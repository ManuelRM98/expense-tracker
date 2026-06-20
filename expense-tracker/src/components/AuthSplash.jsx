import { useAuth } from '../contexts/AuthContext';

/**
 * Shows a blank/spinner while the Supabase session is being restored from storage
 * (typically < 200ms). This prevents a flash of the login page for returning users.
 */
export default function AuthSplash({ children }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={s.root}>
        <div style={s.logo}>
          Expense<span style={{ color: 'var(--accent)' }}>Page</span>
        </div>
      </div>
    );
  }

  return children;
}

const s = {
  root: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
  },
  logo: {
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: '-0.4px',
    opacity: 0.7,
    animation: 'fadeIn 0.4s ease',
  },
};
