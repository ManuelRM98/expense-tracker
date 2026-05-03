import { useState } from 'react';
import { fmtCOP, fmtDate } from '../utils/format';

const COLS = ['Date', 'Description', 'Category', 'Price', 'Card?', 'Card Type', 'Who Paid', ''];

export default function ExpenseTable({ expenses, onEdit, onDelete, onClone, onAddFixed, onAddVariable }) {
  const [activeTab, setActiveTab] = useState('Variable');

  if (expenses.length === 0) {
    return (
      <div style={s.empty}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.35 }}>
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/>
        </svg>
        <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-tertiary)' }}>
          No expenses this month. Add your first one!
        </p>
      </div>
    );
  }

  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  const fixed    = sorted.filter(e => e.costType === 'fixed');
  const variable = sorted.filter(e => e.costType !== 'fixed');

  const fixedTotal    = fixed.reduce((sum, e) => sum + e.price, 0);
  const variableTotal = variable.reduce((sum, e) => sum + e.price, 0);

  const tabs = [
    { key: 'Variable', label: 'Variable', count: variable.length, color: 'var(--accent)' },
    { key: 'Fixed',    label: 'Fixed',    count: fixed.length,    color: 'var(--warning)' },
    { key: 'All',      label: 'All',      count: expenses.length, color: 'var(--text-secondary)' },
  ];

  return (
    <div style={s.container}>
      <div style={s.tabBar}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            style={{
              ...s.tabBtn,
              ...(activeTab === tab.key ? { ...s.tabActive, borderBottomColor: tab.color, color: tab.color } : {}),
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span style={{
              ...s.tabCount,
              ...(activeTab === tab.key ? { background: tab.color, color: '#fff' } : {}),
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div style={s.tabContent}>
        {(activeTab === 'Variable' || activeTab === 'All') && (
          <Section
            title="Variable Costs"
            color="var(--accent)"
            expenses={variable}
            total={variableTotal}
            onEdit={onEdit}
            onDelete={onDelete}
            onClone={onClone}
            onAdd={onAddVariable}
          />
        )}
        {(activeTab === 'Fixed' || activeTab === 'All') && (
          <Section
            title="Fixed Costs"
            color="var(--warning)"
            expenses={fixed}
            total={fixedTotal}
            onEdit={onEdit}
            onDelete={onDelete}
            onClone={onClone}
            onAdd={onAddFixed}
          />
        )}
      </div>
    </div>
  );
}

function Section({ title, color, expenses, total, onEdit, onDelete, onClone, onAdd }) {
  return (
    <div style={s.section}>
      <div style={s.sectionHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ ...s.sectionDot, background: color }} />
          <div>
            <span style={s.sectionTitle}>{title}</span>
            <div style={{ ...s.sectionTotal, color }}>{fmtCOP(total)}</div>
          </div>
          <span style={s.sectionCount}>{expenses.length} item{expenses.length !== 1 ? 's' : ''}</span>
        </div>
        {onAdd && (
          <button style={{ ...s.circleAddBtn, color }} title={`Add ${title} expense`} onClick={onAdd}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
        )}
      </div>

      {expenses.length === 0 ? (
        <div style={s.sectionEmpty}>No {title.toLowerCase()} this month.</div>
      ) : (
        <div style={s.wrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {COLS.map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} style={s.tr}>
                  <td style={{ ...s.td, ...s.tdDate }}>{fmtDate(e.date)}</td>
                  <td style={{ ...s.td, ...s.tdDesc }}>{e.desc}</td>
                  <td style={s.td}>
                    {e.category
                      ? <span style={s.badgeCat}>{e.category}</span>
                      : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                  </td>
                  <td style={{ ...s.td, ...s.tdPrice }}>{fmtCOP(e.price)}</td>
                  <td style={s.td}>
                    <span style={e.cardPay === 'Yes' ? s.badgeYes : s.badgeNo}>
                      {e.cardPay}
                    </span>
                  </td>
                  <td style={s.td}>
                    {e.cardType
                      ? <span style={s.badgeCard}>{e.cardType}</span>
                      : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                  </td>
                  <td style={s.td}>{e.whoPaid}</td>
                  <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                    <button style={s.iconBtn} title="Edit" onClick={() => onEdit(e)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                    <button style={{ ...s.iconBtn, ...s.iconClone }} title="Duplicate" onClick={() => onClone(e)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                      </svg>
                    </button>
                    <button style={{ ...s.iconBtn, ...s.iconDel }} title="Delete" onClick={() => onDelete(e.id)}>
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
  container: { display: 'flex', flexDirection: 'column', gap: 0 },
  tabBar: {
    display: 'flex', gap: 0,
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
    padding: '0 4px',
    boxShadow: 'var(--shadow-sm)',
  },
  tabBtn: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '12px 18px', fontSize: 13, fontWeight: 600,
    background: 'none', border: 'none', borderBottom: '2px solid transparent',
    cursor: 'pointer', color: 'var(--text-tertiary)',
    transition: 'color 0.15s, border-color 0.15s',
    marginBottom: -1,
  },
  tabActive: {
    color: 'var(--accent)',
  },
  tabCount: {
    fontSize: 11, fontWeight: 700, borderRadius: 20,
    padding: '1px 7px', background: 'var(--surface-2)',
    color: 'var(--text-tertiary)', transition: 'background 0.15s, color 0.15s',
  },
  tabContent: { display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 16 },
  section: {
    background: 'var(--surface)', borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px', borderBottom: '1px solid var(--border)',
    background: 'var(--surface-2)',
  },
  sectionDot: {
    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.6px', color: 'var(--text-primary)',
  },
  sectionCount: {
    fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)',
    background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 20, padding: '2px 8px',
  },
  sectionTotal: {
    fontSize: 18, fontWeight: 700, letterSpacing: '-0.4px', display: 'block', marginTop: 2,
  },
  circleAddBtn: {
    width: 34, height: 34, borderRadius: '50%', border: '1.5px solid var(--border)',
    background: 'var(--surface)', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  sectionEmpty: {
    padding: '20px 20px', fontSize: 14, color: 'var(--text-tertiary)',
    fontStyle: 'italic',
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '60px 24px', gap: 12,
    color: 'var(--text-tertiary)',
    background: 'var(--surface)', borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
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
  tdPrice: { fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
  badgeCat:  { display:'inline-flex', alignItems:'center', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600, background:'var(--accent-light)', color:'var(--accent)' },
  badgeYes:  { display:'inline-flex', alignItems:'center', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600, background:'var(--badge-yes-bg)', color:'var(--badge-yes-text)' },
  badgeNo:   { display:'inline-flex', alignItems:'center', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600, background:'var(--badge-no-bg)',  color:'var(--badge-no-text)' },
  badgeCard: { display:'inline-flex', alignItems:'center', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600, background:'var(--accent-light)', color:'var(--accent)' },
  iconBtn: {
    background:'none', border:'none', cursor:'pointer', padding:6,
    borderRadius:8, color:'var(--text-tertiary)', display:'inline-flex',
  },
  iconClone: { color: 'var(--accent)' },
  iconDel: { color: 'var(--danger)' },
};
