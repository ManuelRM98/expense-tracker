import { useState } from 'react';
import { fmtCOP } from '../utils/format';
import PermanentExpenseModal from './PermanentExpenseModal';

const ORDINAL = (d) => {
  const s = ['th','st','nd','rd'];
  const v = d % 100;
  return d + (s[(v - 20) % 10] || s[v] || s[0]);
};

export default function FixedExpensesPage({
  templates,
  onAdd, onUpdate, onDelete, onToggle,
  cardTypes, onAddCard, onRemoveCard,
  expenseCategories, onAddCategory, onRemoveCategory,
  onBack,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState(null);

  function openAdd()       { setEditing(null); setModalOpen(true); }
  function openEdit(tmpl)  { setEditing(tmpl); setModalOpen(true); }

  function handleSave(data) {
    if (editing) onUpdate(editing.id, data);
    else         onAdd(data);
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this permanent expense? It will no longer auto-generate entries, but existing entries in your expense list are not affected.')) return;
    onDelete(id);
  }

  const active   = templates.filter(t =>  t.isActive);
  const inactive = templates.filter(t => !t.isActive);
  const totalActive = active.reduce((s, t) => s + t.amount, 0);

  return (
    <div style={s.page}>

      {/* ── Page header ── */}
      <div style={s.pageHeader}>
        <div style={s.pageHeaderLeft}>
          <button style={s.backBtn} onClick={onBack} title="Back to main view">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <div>
            <div style={s.pageTitle}>Permanent Fixed Costs</div>
            <div style={s.pageSubtitle}>
              {active.length} active · auto-generates on the scheduled day each month
            </div>
          </div>
        </div>
        <div style={s.pageHeaderRight}>
          {active.length > 0 && (
            <div style={s.totalBadge}>
              <span style={s.totalLabel}>Monthly total</span>
              <span style={s.totalValue}>{fmtCOP(totalActive)}</span>
            </div>
          )}
          <button style={s.addBtn} onClick={openAdd}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Add Permanent Expense
          </button>
        </div>
      </div>

      {/* ── Info banner ── */}
      <div style={s.infoBanner}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, opacity: 0.7 }}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
        <span>
          Entries are generated automatically on each expense&apos;s scheduled day.
          If you delete a generated entry for a specific month, it won&apos;t come back — use that to skip months you don&apos;t need.
        </span>
      </div>

      {/* ── Active templates ── */}
      <TemplateSection
        title="Active"
        color="var(--warning)"
        templates={active}
        onEdit={openEdit}
        onDelete={handleDelete}
        onToggle={onToggle}
      />

      {/* ── Inactive templates ── */}
      {inactive.length > 0 && (
        <TemplateSection
          title="Inactive"
          color="var(--text-tertiary)"
          templates={inactive}
          onEdit={openEdit}
          onDelete={handleDelete}
          onToggle={onToggle}
        />
      )}

      {/* ── Empty state ── */}
      {templates.length === 0 && (
        <div style={s.empty}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.3 }}>
            <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
          </svg>
          <p style={s.emptyText}>No permanent expenses yet.</p>
          <p style={s.emptyHint}>Add one above — it will auto-appear in your Fixed Costs table each month on the day you choose.</p>
          <button style={s.emptyAddBtn} onClick={openAdd}>Add your first permanent expense</button>
        </div>
      )}

      {/* ── Modal ── */}
      <PermanentExpenseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        cardTypes={cardTypes}
        onAddCard={onAddCard}
        onRemoveCard={onRemoveCard}
        expenseCategories={expenseCategories}
        onAddCategory={onAddCategory}
        onRemoveCategory={onRemoveCategory}
        editing={editing}
      />
    </div>
  );
}

function TemplateSection({ title, color, templates, onEdit, onDelete, onToggle }) {
  return (
    <div style={s.section}>
      <div style={s.sectionHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ ...s.sectionDot, background: color }} />
          <span style={s.sectionTitle}>{title}</span>
          <span style={s.sectionCount}>{templates.length} item{templates.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {templates.length === 0 ? (
        <div style={s.sectionEmpty}>No {title.toLowerCase()} permanent expenses.</div>
      ) : (
        <div style={s.wrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Name', 'Amount', 'Category', 'Day', 'Who Pays', 'Card?', 'Card Type', ''].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.id} style={{ ...s.tr, ...(t.isActive ? {} : s.trInactive) }}>
                  <td style={{ ...s.td, ...s.tdName }}>{t.name}</td>
                  <td style={{ ...s.td, ...s.tdAmount }}>{fmtCOP(t.amount)}</td>
                  <td style={s.td}>
                    {t.category
                      ? <span style={s.badgeCat}>{t.category}</span>
                      : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                  </td>
                  <td style={{ ...s.td, ...s.tdDay }}>
                    <span style={s.badgeDay}>{ORDINAL(t.dayOfMonth)}</span>
                  </td>
                  <td style={s.td}>{t.whoPaid}</td>
                  <td style={s.td}>
                    <span style={t.cardPay === 'Yes' ? s.badgeYes : s.badgeNo}>{t.cardPay}</span>
                  </td>
                  <td style={s.td}>
                    {t.cardType
                      ? <span style={s.badgeCard}>{t.cardType}</span>
                      : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                  </td>
                  <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                    {/* Toggle active/inactive */}
                    <button
                      style={{ ...s.iconBtn, color: t.isActive ? 'var(--success)' : 'var(--text-tertiary)' }}
                      title={t.isActive ? 'Deactivate' : 'Activate'}
                      onClick={() => onToggle(t.id)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        {t.isActive
                          ? <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                          : <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                        }
                      </svg>
                    </button>
                    {/* Edit */}
                    <button style={s.iconBtn} title="Edit" onClick={() => onEdit(t)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                    {/* Delete */}
                    <button style={{ ...s.iconBtn, ...s.iconDel }} title="Delete" onClick={() => onDelete(t.id)}>
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
  page: { maxWidth: 1100, margin: '0 auto', padding: '28px 24px 80px' },

  pageHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 16, marginBottom: 16,
  },
  pageHeaderLeft:  { display: 'flex', alignItems: 'center', gap: 14 },
  pageHeaderRight: { display: 'flex', alignItems: 'center', gap: 14 },

  backBtn: {
    width: 38, height: 38, borderRadius: '50%', border: '1.5px solid var(--border)',
    background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-secondary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  pageTitle:    { fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' },
  pageSubtitle: { fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 },

  totalBadge: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
    background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
    padding: '8px 14px', boxShadow: 'var(--shadow-sm)',
  },
  totalLabel: { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' },
  totalValue: { fontSize: 18, fontWeight: 700, color: 'var(--warning)', letterSpacing: '-0.4px' },

  addBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'var(--warning)', color: '#fff', border: 'none',
    borderRadius: 'var(--radius-sm)', padding: '10px 18px',
    fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },

  infoBanner: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)',
    padding: '12px 16px', marginBottom: 20,
    fontSize: 13, color: 'var(--accent)', lineHeight: 1.5,
  },

  section: {
    background: 'var(--surface)', borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)', overflow: 'hidden', marginBottom: 20,
  },
  sectionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px', borderBottom: '1px solid var(--border)',
    background: 'var(--surface-2)',
  },
  sectionDot:   { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  sectionTitle: { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-primary)' },
  sectionCount: {
    fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)',
    background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 20, padding: '2px 8px',
  },
  sectionEmpty: { padding: '20px', fontSize: 14, color: 'var(--text-tertiary)', fontStyle: 'italic' },

  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '60px 24px', gap: 10,
    background: 'var(--surface)', borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)', textAlign: 'center',
  },
  emptyText:   { fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0 },
  emptyHint:   { fontSize: 14, color: 'var(--text-tertiary)', maxWidth: 360, margin: 0 },
  emptyAddBtn: {
    marginTop: 8, padding: '10px 22px', borderRadius: 'var(--radius-sm)', border: 'none',
    background: 'var(--warning)', color: '#fff', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },

  wrap:  { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    background: 'var(--surface-2)', fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.6px',
    color: 'var(--text-secondary)', padding: '10px 16px',
    textAlign: 'left', borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  tr:         { borderBottom: '1px solid var(--border)' },
  trInactive: { opacity: 0.5 },
  td:         { padding: '13px 16px', fontSize: 14, verticalAlign: 'middle' },
  tdName:     { fontWeight: 600, maxWidth: 200 },
  tdAmount:   { fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: 'var(--warning)' },
  tdDay:      { whiteSpace: 'nowrap' },

  badgeCat:  { display:'inline-flex', alignItems:'center', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600, background:'var(--accent-light)', color:'var(--accent)' },
  badgeDay:  { display:'inline-flex', alignItems:'center', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700, background:'rgba(255,149,0,0.12)', color:'var(--warning)' },
  badgeYes:  { display:'inline-flex', alignItems:'center', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600, background:'var(--badge-yes-bg)', color:'var(--badge-yes-text)' },
  badgeNo:   { display:'inline-flex', alignItems:'center', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600, background:'var(--badge-no-bg)',  color:'var(--badge-no-text)' },
  badgeCard: { display:'inline-flex', alignItems:'center', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600, background:'var(--accent-light)', color:'var(--accent)' },

  iconBtn: {
    background:'none', border:'none', cursor:'pointer', padding:6,
    borderRadius:8, color:'var(--text-tertiary)', display:'inline-flex',
  },
  iconDel: { color: 'var(--danger)' },
};
