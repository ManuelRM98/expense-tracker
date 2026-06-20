import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [errors,    setErrors]    = useState({});
  const [apiError,  setApiError]  = useState('');
  const [loading,   setLoading]   = useState(false);
  // Supabase may require email confirmation — track that state
  const [confirmed, setConfirmed] = useState(false);

  function validate() {
    const e = {};
    if (!email.trim())                       e.email     = 'Email is required';
    if (password.length < 6)                 e.password  = 'At least 6 characters';
    if (password !== password2)              e.password2 = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setApiError('');
    setLoading(true);
    try {
      await signUp(email.trim(), password);
      // If email confirmation is required, supabase-js session will be null;
      // show a confirmation message. Otherwise navigate home.
      setConfirmed(true);
      // Try navigating home — if the session is live (confirmation disabled) this
      // will succeed; if not, AuthContext will redirect back to /login when the
      // session isn't available yet.
      navigate('/login');
    } catch (err) {
      setApiError(err.message ?? 'Sign-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (confirmed) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.logo}>Expense<span style={{ color: 'var(--accent)' }}>Page</span></div>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 12 }}>
            Account created. Check your email to confirm, then{' '}
            <Link to="/login" style={s.link}>sign in</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          Expense<span style={{ color: 'var(--accent)' }}>Page</span>
        </div>
        <h1 style={s.heading}>Create account</h1>

        {apiError && <p style={s.apiError}>{apiError}</p>}

        <form onSubmit={handleSubmit} noValidate>
          <div style={s.field}>
            <label style={s.label} htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(er => ({ ...er, email: '' })); }}
              style={{ ...s.input, ...(errors.email ? s.inputError : {}) }}
              placeholder="you@example.com"
            />
            {errors.email && <span style={s.errorMsg}>{errors.email}</span>}
          </div>

          <div style={s.field}>
            <label style={s.label} htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => { setPassword(e.target.value); setErrors(er => ({ ...er, password: '' })); }}
              style={{ ...s.input, ...(errors.password ? s.inputError : {}) }}
              placeholder="At least 6 characters"
            />
            {errors.password && <span style={s.errorMsg}>{errors.password}</span>}
          </div>

          <div style={s.field}>
            <label style={s.label} htmlFor="signup-password2">Confirm password</label>
            <input
              id="signup-password2"
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={e => { setPassword2(e.target.value); setErrors(er => ({ ...er, password2: '' })); }}
              style={{ ...s.input, ...(errors.password2 ? s.inputError : {}) }}
              placeholder="Repeat password"
            />
            {errors.password2 && <span style={s.errorMsg}>{errors.password2}</span>}
          </div>

          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={s.foot}>
          Already have an account?{' '}
          <Link to="/login" style={s.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    padding: 'calc(20px + env(safe-area-inset-top)) 16px calc(20px + env(safe-area-inset-bottom))',
  },
  card: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    padding: '36px 32px',
    width: '100%',
    maxWidth: 400,
    animation: 'modalIn .22s cubic-bezier(.34,1.56,.64,1)',
  },
  logo: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.4px',
    marginBottom: 8,
    textAlign: 'center',
  },
  heading: {
    fontSize: 20,
    fontWeight: 600,
    textAlign: 'center',
    marginBottom: 24,
    color: 'var(--text-primary)',
  },
  apiError: {
    background: 'var(--badge-no-bg)',
    color: 'var(--badge-no-text)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: 14,
    marginBottom: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  input: {
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 14px',
    fontSize: 15,
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    outline: 'none',
    minHeight: 48,
    transition: 'border-color 0.15s',
  },
  inputError: {
    borderColor: 'var(--danger)',
  },
  errorMsg: {
    fontSize: 12,
    color: 'var(--danger)',
  },
  btn: {
    display: 'block',
    width: '100%',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '14px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: 8,
    minHeight: 48,
    transition: 'opacity 0.15s',
  },
  foot: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: 'var(--text-secondary)',
  },
  link: {
    color: 'var(--accent)',
    fontWeight: 600,
    textDecoration: 'none',
  },
};
