export default function Header({ onAdd, addLabel, btnColor }) {
  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        <div style={styles.titleRow}>
          <div style={styles.title}>
            Expense<span style={{ color: 'var(--accent)' }}>Page</span>
          </div>
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
