import { fmtCOP, fmtDate } from '../utils/format';

export default function SavingTable({ savings, onEdit, onDelete }) {
  if (savings.length === 0) {
    return (
      <div style={s.empty}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.35 }}>
          <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
        </svg>
        <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-tertiary)' }}>
          No savings this month. Add your first one!
        </p>
      </div>
    );
  }

  const sorted = [...savings].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div style={s.wrap}>
      <table style={s.table}>
        <thead>
          <tr>
            {['Date', 'Description', 'Category', 'Price', 'Card?', 'Card Type', ''].map(h => (
              <th key={h} style={s.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(sv => (
            <tr key={sv.id} style={s.tr}>
              <td style={{ ...s.td, ...s.tdDate }}>{fmtDate(sv.date)}</td>
              <td style={{ ...s.td, ...s.tdDesc }}>{sv.desc}</td>
              <td style={s.td}>
                <span style={s.badgeCat}>{sv.category}</span>
              </td>
              <td style={{ ...s.td, ...s.tdPrice }}>{fmtCOP(sv.price)}</td>
              <td style={s.td}>
                <span style={sv.cardPay === 'Yes' ? s.badgeYes : s.badgeNo}>
                  {sv.cardPay}
                </span>
              </td>
              <td style={s.td}>
                {sv.cardType
                  ? <span style={s.badgeCard}>{sv.cardType}</span>
                  : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
              </td>
              <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                <button style={s.iconBtn} title="Edit" onClick={() => onEdit(sv)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
                <button style={{ ...s.iconBtn, ...s.iconDel }} title="Delete" onClick={() => onDelete(sv.id)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const s = {
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '60px 24px', gap: 12,
    color: 'var(--text-tertiary)',
    background: 'var(--surface)', borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
  },
  wrap: {
    background: 'var(--surface)', borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)', overflowX: 'auto',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    background: 'var(--surface-2)', fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.6px',
    color: 'var(--text-secondary)', padding: '10px 16px',
    textAlign: 'left', borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '13px 16px', fontSize: 14, verticalAlign: 'middle' },
  tdDate:  { color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
  tdDesc:  { fontWeight: 500, maxWidth: 220 },
  tdPrice: { fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: 'var(--savings)' },
  badgeCat:  { display:'inline-flex', alignItems:'center', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600, background:'var(--savings-light)', color:'var(--savings)' },
  badgeYes:  { display:'inline-flex', alignItems:'center', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600, background:'var(--badge-yes-bg)', color:'var(--badge-yes-text)' },
  badgeNo:   { display:'inline-flex', alignItems:'center', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600, background:'var(--badge-no-bg)',  color:'var(--badge-no-text)' },
  badgeCard: { display:'inline-flex', alignItems:'center', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600, background:'var(--accent-light)', color:'var(--accent)' },
  iconBtn: {
    background:'none', border:'none', cursor:'pointer', padding:6,
    borderRadius:8, color:'var(--text-tertiary)', display:'inline-flex',
  },
  iconDel: { color: 'var(--danger)' },
};
