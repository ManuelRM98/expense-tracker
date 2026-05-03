import { fmtCOP, fmtDate } from '../utils/format';

const COLOR = 'var(--savings)';

export default function SavingTable({ savings, onEdit, onDelete, onClone, onAdd }) {
  const sorted = [...savings].sort((a, b) => b.date.localeCompare(a.date));
  const total = savings.reduce((sum, sv) => sum + sv.price, 0);

  return (
    <div style={s.section}>
      <div style={s.sectionHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ ...s.sectionDot, background: COLOR }} />
          <div>
            <span style={s.sectionTitle}>Savings</span>
            <div style={{ ...s.sectionTotal, color: COLOR }}>{fmtCOP(total)}</div>
          </div>
          <span style={s.sectionCount}>{savings.length} item{savings.length !== 1 ? 's' : ''}</span>
        </div>
        {onAdd && (
          <button style={{ ...s.circleAddBtn, color: COLOR }} title="Add saving" onClick={onAdd}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
        )}
      </div>

      {savings.length === 0 ? (
        <div style={s.sectionEmpty}>No savings this month.</div>
      ) : (
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
                    <button style={{ ...s.iconBtn, ...s.iconClone }} title="Duplicate" onClick={() => onClone(sv)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
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
      )}
    </div>
  );
}

const s = {
  section: {
    background: 'var(--surface)', borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px', borderBottom: '1px solid var(--border)',
    background: 'var(--surface-2)',
  },
  sectionDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  sectionTitle: {
    fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.6px', color: 'var(--text-primary)', display: 'block',
  },
  sectionTotal: {
    fontSize: 18, fontWeight: 700, letterSpacing: '-0.4px', display: 'block', marginTop: 2,
  },
  sectionCount: {
    fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)',
    background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 20, padding: '2px 8px',
  },
  sectionEmpty: {
    padding: '20px 20px', fontSize: 14, color: 'var(--text-tertiary)', fontStyle: 'italic',
  },
  circleAddBtn: {
    width: 34, height: 34, borderRadius: '50%', border: '1.5px solid var(--border)',
    background: 'var(--surface)', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  wrap: { overflowX: 'auto' },
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
  iconClone: { color: 'var(--savings)' },
  iconDel: { color: 'var(--danger)' },
};
