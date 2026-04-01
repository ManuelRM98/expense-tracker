export default function Header({ onAdd, addLabel, btnColor, darkMode, onToggleDark, onOpenPermanent }) {
  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        <div style={styles.titleRow}>
          <div style={styles.title}>
            Expense<span style={{ color: 'var(--accent)' }}>Page</span>
          </div>
          {/* Permanent Fixed Costs manager */}
          <button style={styles.themeBtn} onClick={onOpenPermanent} title="Permanent Fixed Costs">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
            </svg>
          </button>
          <button style={styles.themeBtn} onClick={onToggleDark} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            {darkMode ? (
              // Sun icon
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7zm0-5a1 1 0 0 1 1 1v1a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1zm0 18a1 1 0 0 1-1-1v-1a1 1 0 0 1 2 0v1a1 1 0 0 1-1 1zM4.22 5.64a1 1 0 0 1 1.42-1.42l.7.71a1 1 0 0 1-1.41 1.41l-.71-.7zm13.44 12.72a1 1 0 0 1 1.41-1.41l.71.7a1 1 0 1 1-1.42 1.42l-.7-.71zM3 12a1 1 0 0 1 1-1h1a1 1 0 0 1 0 2H4a1 1 0 0 1-1-1zm16 0a1 1 0 0 1 1-1h1a1 1 0 0 1 0 2h-1a1 1 0 0 1-1-1zM4.22 18.36l.71-.7a1 1 0 1 1 1.41 1.41l-.7.71a1 1 0 0 1-1.42-1.42zM17.66 5.64l.7-.71a1 1 0 1 1 1.42 1.42l-.71.7a1 1 0 0 1-1.41-1.41z"/>
              </svg>
            ) : (
              // Moon icon
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>
        <button style={{ ...styles.btn, background: btnColor ?? 'var(--accent)' }} onClick={onAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          {addLabel ?? 'Add Expense'}
        </button>
      </div>
    </header>
  );
}

const styles = {
  header: {
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '0 24px',
  },
  inner: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
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
};
