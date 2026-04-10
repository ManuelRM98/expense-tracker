export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div style={s.overlay} onClick={onCancel}>
      <div style={s.card} onClick={e => e.stopPropagation()}>
        <div style={s.iconWrap}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--danger)' }}>
            <path d="M6 19c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </div>
        <h3 style={s.title}>{title ?? 'Delete item'}</h3>
        {message && <p style={s.message}>{message}</p>}
        <div style={s.actions}>
          <button style={s.cancelBtn} onClick={onCancel}>Cancel</button>
          <button style={s.deleteBtn} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.35)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 900,
    animation: 'fadeIn .15s ease',
  },
  card: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg, 18px)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    padding: '28px 28px 22px',
    width: 320,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    animation: 'scaleIn .18s cubic-bezier(0.34,1.56,0.64,1)',
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: '50%',
    background: 'rgba(255,59,48,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 17, fontWeight: 700, color: 'var(--text-primary)',
    margin: 0, textAlign: 'center',
  },
  message: {
    fontSize: 14, color: 'var(--text-secondary)', margin: '4px 0 8px',
    textAlign: 'center', lineHeight: 1.5,
  },
  actions: {
    display: 'flex', gap: 10, marginTop: 10, width: '100%',
  },
  cancelBtn: {
    flex: 1, padding: '12px 0', borderRadius: 12,
    border: '1.5px solid var(--border)',
    background: 'var(--surface-2)',
    color: 'var(--text-primary)',
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit',
  },
  deleteBtn: {
    flex: 1, padding: '12px 0', borderRadius: 12,
    border: 'none',
    background: 'var(--danger)',
    color: '#fff',
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
