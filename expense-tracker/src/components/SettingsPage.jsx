export default function SettingsPage({ onOpenPermanent, darkMode, onToggleDark }) {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Settings</h1>
      </div>

      <div style={s.card}>
        {/* Permanent Fixed Costs */}
        <button style={s.row} onClick={onOpenPermanent}>
          <div style={s.rowLeft}>
            <span style={s.iconWrap}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
              </svg>
            </span>
            <div>
              <div style={s.rowTitle}>Permanent Fixed Costs</div>
              <div style={s.rowSub}>Manage recurring monthly expenses</div>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>

        <div style={s.divider} />

        {/* Night Mode */}
        <div style={s.row}>
          <div style={s.rowLeft}>
            <span style={s.iconWrap}>
              {darkMode ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7zm0-5a1 1 0 0 1 1 1v1a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1zm0 18a1 1 0 0 1-1-1v-1a1 1 0 0 1 2 0v1a1 1 0 0 1-1 1zM4.22 5.64a1 1 0 0 1 1.42-1.42l.7.71a1 1 0 0 1-1.41 1.41l-.71-.7zm13.44 12.72a1 1 0 0 1 1.41-1.41l.71.7a1 1 0 1 1-1.42 1.42l-.7-.71zM3 12a1 1 0 0 1 1-1h1a1 1 0 0 1 0 2H4a1 1 0 0 1-1-1zm16 0a1 1 0 0 1 1-1h1a1 1 0 0 1 0 2h-1a1 1 0 0 1-1-1zM4.22 18.36l.71-.7a1 1 0 1 1 1.41 1.41l-.7.71a1 1 0 0 1-1.42-1.42zM17.66 5.64l.7-.71a1 1 0 1 1 1.42 1.42l-.71.7a1 1 0 0 1-1.41-1.41z"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </span>
            <div>
              <div style={s.rowTitle}>Night Mode</div>
              <div style={s.rowSub}>{darkMode ? 'Dark theme active' : 'Light theme active'}</div>
            </div>
          </div>
          {/* Toggle switch */}
          <button
            role="switch"
            aria-checked={darkMode}
            onClick={onToggleDark}
            style={{ ...s.toggle, background: darkMode ? 'var(--accent)' : 'var(--border)' }}
          >
            <span style={{ ...s.toggleThumb, transform: darkMode ? 'translateX(20px)' : 'translateX(2px)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '32px 24px 80px',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: 'var(--text-primary)',
    margin: 0,
  },
  card: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
    overflow: 'hidden',
  },
  row: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 20px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'background 0.12s',
    gap: 12,
  },
  rowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'var(--accent-light)',
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 2,
  },
  rowSub: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  divider: {
    height: 1,
    background: 'var(--border)',
    margin: '0 20px',
  },
  toggle: {
    position: 'relative',
    width: 44,
    height: 26,
    borderRadius: 13,
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
    transition: 'background 0.2s',
  },
  toggleThumb: {
    position: 'absolute',
    top: 3,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    transition: 'transform 0.2s',
    display: 'block',
  },
};
