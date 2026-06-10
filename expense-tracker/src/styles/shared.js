/**
 * DEBT-07: shared style constants extracted from the former App.jsx monolith.
 * All inline-style objects use CSS custom properties defined in src/index.css.
 * Components import what they need to avoid repeating the same object literals.
 */

// ── Layout ────────────────────────────────────────────────────────────────────

export const layout = {
  display: 'flex',
  alignItems: 'flex-start',
};

export const contentArea = {
  flex: 1,
  minWidth: 0,
  overflowX: 'hidden',
};

// ── Page containers ───────────────────────────────────────────────────────────

export const pageMain = {
  maxWidth: 1000,
  margin: '0 auto',
  padding: '28px 24px 80px',
};

// ── Navigation buttons (round arrow buttons) ──────────────────────────────────

export const navBtn = {
  width: 36, height: 36, borderRadius: '50%', border: 'none',
  background: 'var(--surface)', boxShadow: 'var(--shadow-sm)',
  cursor: 'pointer', fontSize: 22, color: 'var(--accent)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'inherit',
};

export const navBtnDisabled = {
  opacity: 0.3,
  cursor: 'default',
};

// ── Cards / surfaces ──────────────────────────────────────────────────────────

export const surfaceCard = {
  background: 'var(--surface)',
  borderRadius: 'var(--radius-md)',
  padding: '18px 20px',
  boxShadow: 'var(--shadow-sm)',
};

export const chartCard = {
  background: 'var(--surface)',
  borderRadius: 'var(--radius-md)',
  padding: '20px 20px 24px',
  boxShadow: 'var(--shadow-sm)',
  marginBottom: 16,
};

// ── Labels / text ─────────────────────────────────────────────────────────────

export const cardLabel = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  color: 'var(--text-secondary)',
  marginBottom: 6,
};

export const chartTitle = {
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  color: 'var(--text-secondary)',
  margin: '0 0 18px',
};

export const badge = {
  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.5px', background: 'var(--accent-light)',
  color: 'var(--accent)', padding: '3px 9px', borderRadius: 20,
};

// ── Grids ─────────────────────────────────────────────────────────────────────

export const summaryGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 14,
  marginBottom: 24,
};

export const chartsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: 16,
  marginBottom: 16,
};

// ── Tab bars ──────────────────────────────────────────────────────────────────

export const tabBar = {
  display: 'flex', gap: 8, marginBottom: 20,
  background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
  padding: 4, boxShadow: 'var(--shadow-sm)', width: 'fit-content',
};

export const tabBtn = {
  padding: '8px 20px', border: 'none', borderRadius: 8,
  fontSize: 14, fontWeight: 500, cursor: 'pointer',
  background: 'transparent', color: 'var(--text-secondary)',
  fontFamily: 'inherit', transition: 'all .15s',
};

export const subTabBar = {
  display: 'flex',
  gap: 0,
  marginBottom: 20,
  borderBottom: '1.5px solid var(--border)',
};

export const subTabBtn = {
  padding: '8px 18px',
  border: 'none',
  borderBottom: '2px solid transparent',
  marginBottom: -1.5,
  background: 'transparent',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  color: 'var(--text-secondary)',
  fontFamily: 'inherit',
  transition: 'all .15s',
};

export const subTabBtnActive = {
  color: 'var(--accent)',
  fontWeight: 600,
  borderBottomColor: 'var(--accent)',
};

// ── Toast ─────────────────────────────────────────────────────────────────────

export const toast = {
  position: 'fixed', bottom: 32, left: '50%',
  transform: 'translateX(-50%)',
  background: 'var(--text-primary)', color: 'var(--bg)',
  padding: '12px 22px', borderRadius: 30,
  fontSize: 14, fontWeight: 500, zIndex: 500,
  boxShadow: 'var(--shadow-md)',
  animation: 'fadeInUp .3s ease',
};

// ── Bar rows (used in CreditCardBreakdown, AnnualDashboard category list) ─────

export const barRow = {
  display: 'grid',
  alignItems: 'center',
  gap: 10,
};

export const barBg = {
  height: 8,
  background: 'var(--bg)',
  borderRadius: 4,
  overflow: 'hidden',
};

export const barFill = {
  height: '100%',
  borderRadius: 4,
  transition: 'width 0.5s ease',
};
