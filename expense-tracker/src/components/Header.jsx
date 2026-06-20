import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAccountMe } from '../services/api';
import { getModalOverlayStyle, getModalStyle } from '../utils/mobileModalStyles';
import { DragHandle } from '../utils/mobileModal';

/**
 * isMobile — when true the action button collapses to icon-only to fit 375px
 */
export default function Header({ onAdd, addLabel, btnColor, onHome, isMobile }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const menuRef   = useRef(null);

  // Load the profile display name so the user menu can greet by name
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getAccountMe()
      .then(profile => { if (!cancelled) setDisplayName(profile.displayName ?? ''); })
      .catch(() => { /* fall back to email below */ });
    return () => { cancelled = true; };
  }, [user]);

  // Close dropdown on outside-click or Esc
  useEffect(() => {
    if (!menuOpen || isMobile) return; // bottom-sheet uses overlay click

    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown',   handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown',   handleKey);
    };
  }, [menuOpen, isMobile]);

  // Prefer the saved display name, fall back to the email's local part
  const name = displayName.trim() || user?.email?.split('@')[0] || '';
  // Derive avatar initial from the resolved name (or email)
  const initial = (name || user?.email)?.[0]?.toUpperCase() ?? '?';

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
  }

  function handleAccount() {
    setMenuOpen(false);
    navigate('/account');
  }

  return (
    <>
      <header
        style={{
          ...styles.header,
          padding: isMobile ? '0 16px' : '0 24px',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div style={styles.inner}>
          <div style={styles.titleRow}>
            <div
              style={styles.title}
              onClick={onHome}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && onHome?.()}
              title="Go to Home"
            >
              Expense<span style={{ color: 'var(--accent)' }}>Page</span>
            </div>
          </div>

          <div style={styles.rightGroup}>
            {/* Add button */}
            {isMobile ? (
              <button
                style={{ ...styles.btnIcon, background: btnColor ?? 'var(--accent)' }}
                onClick={onAdd}
                title={addLabel ?? 'Add Expense'}
                aria-label={addLabel ?? 'Add Expense'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
              </button>
            ) : (
              <button style={{ ...styles.btn, background: btnColor ?? 'var(--accent)' }} onClick={onAdd}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                {addLabel ?? 'Add Expense'}
              </button>
            )}

            {/* Avatar button — only shown when logged in */}
            {user && (
              <div style={{ position: 'relative' }} ref={menuRef}>
                <button
                  style={styles.avatar}
                  onClick={() => setMenuOpen(o => !o)}
                  aria-label="User menu"
                  aria-expanded={menuOpen}
                >
                  {initial}
                </button>

                {/* Desktop dropdown */}
                {menuOpen && !isMobile && (
                  <div style={styles.dropdown}>
                    <div style={styles.menuHeader}>
                      <span style={styles.menuName}>{name}</span>
                      {user?.email && <span style={styles.menuEmail}>{user.email}</span>}
                    </div>
                    <div style={styles.menuDivider} />
                    <button style={styles.menuItem} onClick={handleAccount}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                      </svg>
                      Account
                    </button>
                    <div style={styles.menuDivider} />
                    <button style={{ ...styles.menuItem, color: 'var(--danger)' }} onClick={handleSignOut}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                        <path d="M17 7l-1.4 1.4 2.6 2.6H9v2h9.2l-2.6 2.6L17 17l5-5-5-5zm-12 1H3v12h2V8z"/>
                      </svg>
                      Log out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom-sheet user menu */}
      {menuOpen && isMobile && (
        <div
          style={getModalOverlayStyle(true)}
          onClick={() => setMenuOpen(false)}
        >
          <div
            style={getModalStyle(true, { maxWidth: '100%' })}
            onClick={e => e.stopPropagation()}
          >
            <DragHandle />
            <div style={styles.sheetTitle}>
              <span style={styles.sheetName}>{name}</span>
              {user?.email && <span style={styles.sheetEmail}>{user.email}</span>}
            </div>
            <button style={styles.sheetItem} onClick={handleAccount}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
              Account
            </button>
            <button style={{ ...styles.sheetItem, color: 'var(--danger)' }} onClick={handleSignOut}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                <path d="M17 7l-1.4 1.4 2.6 2.6H9v2h9.2l-2.6 2.6L17 17l5-5-5-5zm-12 1H3v12h2V8z"/>
              </svg>
              Log out
            </button>
            <div style={{ height: 16 }} />
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  header: {
    background: 'var(--surface-glass)',
    backdropFilter: 'saturate(180%) blur(20px)',
    WebkitBackdropFilter: 'saturate(180%) blur(20px)',
    border: '1px solid var(--panel-edge)',
    borderTop: 'none',
    borderBottomLeftRadius: 'var(--radius-md)',
    borderBottomRightRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  inner: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 'var(--header-h)',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: '-0.4px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  rightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  btnIcon: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    fontFamily: 'inherit',
    flexShrink: 0,
    WebkitTapHighlightColor: 'transparent',
  },
  // Circular avatar button — 34px visual + min 44px touch target via padding
  avatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    WebkitTapHighlightColor: 'transparent',
    padding: 0,
    outline: 'none',
    // Browsers clip box-model hit areas at the element boundary, so we rely on
    // the 64px header height to give ample vertical clearance. The 34px circle
    // sits centered in a 64px tall strip — effective touch band is ~64px tall.
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-md)',
    minWidth: 160,
    zIndex: 300,
    overflow: 'hidden',
    animation: 'scaleIn .16s cubic-bezier(.34,1.56,.64,1)',
    transformOrigin: 'top right',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '11px 16px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-primary)',
    textAlign: 'left',
    transition: 'background 0.1s',
  },
  menuDivider: {
    height: 1,
    background: 'var(--border)',
    margin: '2px 0',
  },
  // Identity header inside the desktop dropdown
  menuHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '11px 16px 9px',
  },
  menuName: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  menuEmail: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  // Bottom-sheet styles
  sheetTitle: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '0 4px 12px',
    borderBottom: '1px solid var(--border)',
    marginBottom: 8,
  },
  sheetName: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sheetEmail: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sheetItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    padding: '14px 4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 16,
    fontWeight: 500,
    color: 'var(--text-primary)',
    textAlign: 'left',
    minHeight: 52,
    WebkitTapHighlightColor: 'transparent',
  },
};
