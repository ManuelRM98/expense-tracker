/**
 * isMobile — when true the action button collapses to icon-only to fit 375px
 */
export default function Header({ onAdd, addLabel, btnColor, onHome, isMobile }) {
  return (
    <header
      style={{
        ...styles.header,
        // Mobile-only tighter side padding; desktop keeps the original 24px
        padding: isMobile ? '0 16px' : '0 24px',
        // Respect notch / status bar on iOS (0 on desktop)
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div style={styles.inner}>
        <div style={styles.titleRow}>
          <div style={styles.title} onClick={onHome} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onHome?.()} title="Go to Home">
            Expense<span style={{ color: 'var(--accent)' }}>Page</span>
          </div>
        </div>
        {/* On mobile: icon-only button so title + button fit at 375px */}
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
      </div>
    </header>
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
  themeBtn: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    border: '1.5px solid var(--border)',
    background: 'var(--surface)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
    transition: 'background 0.15s, color 0.15s',
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
  // Icon-only variant for mobile header — meets ≥ 44px touch target
  btnIcon: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    flexShrink: 0,
    WebkitTapHighlightColor: 'transparent',
  },
};
