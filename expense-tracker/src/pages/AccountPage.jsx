import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { getAccountMe, updateAccountMe, deleteAccountMe } from '../services/api';

export default function AccountPage({ showToast }) {
  const { user, signOut } = useAuth();

  const [displayName,  setDisplayName]  = useState('');
  const [savedName,    setSavedName]    = useState('');
  const [nameError,    setNameError]    = useState('');
  const [savingName,   setSavingName]   = useState(false);

  const [resetSent,    setResetSent]    = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [loadingProfile, setLoadingProfile] = useState(true);

  // Danger zone state
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [confirmInput,   setConfirmInput]   = useState('');
  const [deleting,       setDeleting]       = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const profile = await getAccountMe();
        if (!cancelled) {
          const name = profile.displayName ?? '';
          setDisplayName(name);
          setSavedName(name);
        }
      } catch {
        // ignore — we still show the email from the auth session
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleSaveName(ev) {
    ev.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) { setNameError('Display name cannot be empty'); return; }
    setNameError('');
    setSavingName(true);
    try {
      const updated = await updateAccountMe(trimmed);
      setSavedName(updated.displayName ?? trimmed);
      showToast?.('Display name updated.');
    } catch (err) {
      showToast?.(`Error: ${err.message ?? 'Could not save name.'}`);
    } finally {
      setSavingName(false);
    }
  }

  async function handlePasswordReset() {
    setResetLoading(true);
    try {
      const email = user?.email;
      if (!email) throw new Error('No email on session');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/account`,
      });
      if (error) throw error;
      setResetSent(true);
      showToast?.('Password reset email sent.');
    } catch (err) {
      showToast?.(`Error: ${err.message ?? 'Could not send reset email.'}`);
    } finally {
      setResetLoading(false);
    }
  }

  const userEmail = user?.email ?? '';
  const confirmMatches = confirmInput.trim() === userEmail || confirmInput.trim() === 'DELETE';

  async function handleDeleteAccount() {
    if (!confirmMatches) return;
    setDeleting(true);
    try {
      const result = await deleteAccountMe();
      // result is null on 204 (full success) or { detail, auth_deleted } on 200
      if (result && result.auth_deleted === false) {
        showToast?.('Your data has been deleted. Note: the login record could not be removed automatically — contact support if needed.');
      } else {
        showToast?.('Account deleted successfully.');
      }
      await signOut();
    } catch (err) {
      showToast?.(`Error: ${err.message ?? 'Could not delete account.'}`);
      setDeleting(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.inner}>
        <h2 style={s.heading}>Account</h2>

        {/* ── Email (read-only) ── */}
        <section style={s.section}>
          <p style={s.sectionLabel}>Email</p>
          <p style={s.emailValue}>{user?.email ?? '—'}</p>
        </section>

        {/* ── Display name ── */}
        <section style={s.section}>
          <p style={s.sectionLabel}>Display name</p>
          {loadingProfile ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Loading…</p>
          ) : (
            <form onSubmit={handleSaveName} noValidate>
              <div className="modal-form-grid">
                <div className="modal-grid-full" style={s.field}>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => { setDisplayName(e.target.value); setNameError(''); }}
                    style={{ ...s.input, ...(nameError ? s.inputError : {}) }}
                    placeholder="Your name"
                    maxLength={80}
                  />
                  {nameError && <span style={s.errorMsg}>{nameError}</span>}
                </div>
              </div>
              <button
                type="submit"
                style={s.btn}
                disabled={savingName || displayName.trim() === savedName}
              >
                {savingName ? 'Saving…' : 'Save name'}
              </button>
            </form>
          )}
        </section>

        {/* ── Password ── */}
        <section style={s.section}>
          <p style={s.sectionLabel}>Password</p>
          {resetSent ? (
            <p style={{ color: 'var(--success)', fontSize: 14 }}>
              Reset email sent — check your inbox.
            </p>
          ) : (
            <button
              type="button"
              style={s.btnSecondary}
              onClick={handlePasswordReset}
              disabled={resetLoading}
            >
              {resetLoading ? 'Sending…' : 'Send password-reset email'}
            </button>
          )}
        </section>

        {/* ── Danger zone ── */}
        <section style={s.dangerSection}>
          <p style={s.sectionLabel}>Danger zone</p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>

          {!showDangerZone ? (
            <button
              type="button"
              style={s.btnDanger}
              onClick={() => { setShowDangerZone(true); setConfirmInput(''); }}
              disabled={deleting}
            >
              Delete account
            </button>
          ) : (
            <div style={s.dangerConfirm}>
              <p style={s.dangerPrompt}>
                To confirm, type your email address <strong style={{ color: 'var(--text-primary)' }}>{userEmail}</strong> below:
              </p>
              <input
                type="text"
                value={confirmInput}
                onChange={e => setConfirmInput(e.target.value)}
                style={{ ...s.input, borderColor: confirmInput && !confirmMatches ? 'var(--danger)' : 'var(--border)' }}
                placeholder={userEmail}
                autoComplete="off"
                disabled={deleting}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  style={s.btnSecondary}
                  onClick={() => { setShowDangerZone(false); setConfirmInput(''); }}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  style={{
                    ...s.btnDanger,
                    opacity: confirmMatches && !deleting ? 1 : 0.4,
                    cursor: confirmMatches && !deleting ? 'pointer' : 'not-allowed',
                  }}
                  onClick={handleDeleteAccount}
                  disabled={!confirmMatches || deleting}
                >
                  {deleting ? 'Deleting…' : 'Permanently delete account'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const s = {
  page: {
    maxWidth: 600,
    margin: '0 auto',
    padding: '24px 20px',
  },
  inner: {
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
  },
  heading: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  section: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    padding: '18px 20px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
  },
  emailValue: {
    fontSize: 15,
    color: 'var(--text-primary)',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  input: {
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '11px 13px',
    fontSize: 15,
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    outline: 'none',
    minHeight: 44,
    transition: 'border-color 0.15s',
    width: '100%',
  },
  inputError: {
    borderColor: 'var(--danger)',
  },
  errorMsg: {
    fontSize: 12,
    color: 'var(--danger)',
  },
  btn: {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '11px 20px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    minHeight: 44,
    marginTop: 6,
    transition: 'opacity 0.15s',
  },
  btnSecondary: {
    background: 'var(--surface-2)',
    color: 'var(--text-primary)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '11px 20px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    minHeight: 44,
    transition: 'background 0.15s',
  },
  dangerSection: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    padding: '18px 20px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    border: '1.5px solid rgba(255,59,48,0.25)',
  },
  dangerConfirm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  dangerPrompt: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    margin: 0,
    lineHeight: 1.5,
  },
  btnDanger: {
    background: 'var(--danger)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '11px 20px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    minHeight: 44,
    marginTop: 2,
    transition: 'opacity 0.15s',
  },
};
