import { useState, useMemo } from 'react';
import { fmtCOP, fmtDate } from '../utils/format';
import DebtModal from './DebtModal';
import DebtPaymentModal from './DebtPaymentModal';
import ConfirmDialog from './ConfirmDialog';

function DebtTable({ debts, onEdit, onDelete, onAddPayment, onDeletePayment, onToggleSettle }) {
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });

  function askConfirm({ title, message, onConfirm }) {
    setConfirmDialog({ open: true, title, message, onConfirm });
  }

  if (debts.length === 0) {
    return (
      <div style={s.empty}>
        <span style={s.emptyIcon}>📋</span>
        <p style={s.emptyText}>No debts here yet.</p>
      </div>
    );
  }

  return (
    <>
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {['Person', 'Description', 'Amount', 'Paid', 'Remaining', 'Settled?', 'Initial Date', 'Settlement Date', 'Actions'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {debts.map(debt => {
              const isExpanded = expandedId === debt.id;
              return (
                <>
                  <tr
                    key={debt.id}
                    style={{ ...s.tr, ...(debt.isSettled ? s.trSettled : {}) }}
                  >
                    <td style={s.td}>
                      <div style={s.personCell}>
                        <button
                          style={s.expandBtn}
                          onClick={() => setExpandedId(isExpanded ? null : debt.id)}
                          title={isExpanded ? 'Hide payments' : 'Show payment history'}
                        >
                          {isExpanded ? '▾' : '▸'}
                        </button>
                        <span style={s.personName}>{debt.person}</span>
                      </div>
                    </td>
                    <td style={s.td}><span style={s.desc}>{debt.description}</span></td>
                    <td style={{ ...s.td, ...s.numCell }}>{fmtCOP(debt.amount)}</td>
                    <td style={{ ...s.td, ...s.numCell, color: 'var(--success)' }}>{fmtCOP(debt.totalPaid)}</td>
                    <td style={{ ...s.td, ...s.numCell, color: debt.totalRemaining > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {fmtCOP(debt.totalRemaining)}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <button
                        style={{ ...s.settleToggle, ...(debt.isSettled ? s.settleToggleOn : s.settleToggleOff) }}
                        onClick={() => onToggleSettle(debt)}
                        title={debt.isSettled ? 'Mark as pending' : 'Mark as settled'}
                      >
                        {debt.isSettled ? '✓ Settled' : 'Pending'}
                      </button>
                    </td>
                    <td style={{ ...s.td, ...s.dateCell }}>{fmtDate(debt.createdDate)}</td>
                    <td style={{ ...s.td, ...s.dateCell }}>
                      {debt.settledDate ? fmtDate(debt.settledDate) : <span style={s.dash}>—</span>}
                    </td>
                    <td style={s.td}>
                      <div style={s.actions}>
                        {!debt.isSettled && (
                          <button
                            style={{ ...s.actionBtn, color: 'var(--success)' }}
                            onClick={() => onAddPayment(debt)}
                            title="Add payment"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                            </svg>
                          </button>
                        )}
                        <button
                          style={{ ...s.actionBtn, color: 'var(--text-secondary)' }}
                          onClick={() => onEdit(debt)}
                          title="Edit"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                          </svg>
                        </button>
                        <button
                          style={{ ...s.actionBtn, color: 'var(--danger)' }}
                          onClick={() => askConfirm({
                            title: 'Delete debt',
                            message: 'This will also delete all payment history. This action cannot be undone.',
                            onConfirm: () => { setConfirmDialog(d => ({ ...d, open: false })); onDelete(debt.id); },
                          })}
                          title="Delete"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr key={`${debt.id}-payments`} style={s.expandedRow}>
                      <td colSpan={9} style={s.expandedCell}>
                        {debt.payments.length === 0 ? (
                          <p style={s.noPayments}>No payments recorded yet.</p>
                        ) : (
                          <table style={s.payTable}>
                            <thead>
                              <tr>
                                {['Date', 'Amount', 'Note', ''].map(h => (
                                  <th key={h} style={s.payTh}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {debt.payments.map(p => (
                                <tr key={p.id} style={s.payTr}>
                                  <td style={s.payTd}>{fmtDate(p.date)}</td>
                                  <td style={{ ...s.payTd, color: 'var(--success)', fontWeight: 600 }}>{fmtCOP(p.amount)}</td>
                                  <td style={{ ...s.payTd, color: 'var(--text-secondary)' }}>{p.note || <span style={s.dash}>—</span>}</td>
                                  <td style={s.payTd}>
                                    <button
                                      style={{ ...s.actionBtn, color: 'var(--danger)' }}
                                      onClick={() => askConfirm({
                                        title: 'Delete payment',
                                        message: 'Remove this payment entry?',
                                        onConfirm: () => { setConfirmDialog(d => ({ ...d, open: false })); onDeletePayment(debt.id, p.id); },
                                      })}
                                      title="Delete payment"
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                      </svg>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(d => ({ ...d, open: false }))}
      />
    </>
  );
}

export default function DebtsPage({ debts, onAdd, onUpdate, onDelete, onAddPayment, onDeletePayment }) {
  const [activeTab, setActiveTab]           = useState('analytics');
  const [debtModalOpen, setDebtModalOpen]   = useState(false);
  const [editingDebt, setEditingDebt]       = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget]   = useState(null);

  const owedToMe  = useMemo(() => debts.filter(d => d.direction === 'they_owe_me'), [debts]);
  const iOwe      = useMemo(() => debts.filter(d => d.direction === 'i_owe_them'), [debts]);

  const totalOwedToMe  = useMemo(() => owedToMe.filter(d => !d.isSettled).reduce((s, d) => s + d.totalRemaining, 0), [owedToMe]);
  const totalIOwe      = useMemo(() => iOwe.filter(d => !d.isSettled).reduce((s, d) => s + d.totalRemaining, 0), [iOwe]);

  const byPersonOwed = useMemo(() => {
    const map = {};
    owedToMe.filter(d => !d.isSettled).forEach(d => {
      map[d.person] = (map[d.person] ?? 0) + d.totalRemaining;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [owedToMe]);

  const byPersonOwe = useMemo(() => {
    const map = {};
    iOwe.filter(d => !d.isSettled).forEach(d => {
      map[d.person] = (map[d.person] ?? 0) + d.totalRemaining;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [iOwe]);

  function openAddDebt() { setEditingDebt(null); setDebtModalOpen(true); }
  function openEditDebt(debt) { setEditingDebt(debt); setDebtModalOpen(true); }

  function handleSaveDebt(data) {
    if (editingDebt) {
      onUpdate(editingDebt.id, {
        person:      data.person,
        description: data.description,
        amount:      data.amount,
        isSettled:   editingDebt.isSettled,
        settledDate: editingDebt.settledDate,
      });
    } else {
      onAdd(data);
    }
  }

  function handleToggleSettle(debt) {
    const nowSettled = !debt.isSettled;
    onUpdate(debt.id, {
      person:      debt.person,
      description: debt.description,
      amount:      debt.amount,
      isSettled:   nowSettled,
      settledDate: nowSettled ? new Date().toISOString().slice(0, 10) : null,
    });
  }

  function openAddPayment(debt) { setPaymentTarget(debt); setPaymentModalOpen(true); }

  function handleSavePayment(data) {
    if (paymentTarget) onAddPayment(paymentTarget.id, data);
  }

  const tabs = [
    { key: 'analytics', label: 'Analytics' },
    { key: 'owed',      label: 'They Owe Me' },
    { key: 'owe',       label: 'I Owe' },
  ];

  return (
    <main style={s.page}>
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Debts</h1>
        <button style={s.addBtn} onClick={openAddDebt}>+ Add Debt</button>
      </div>

      <div style={s.tabBar}>
        {tabs.map(t => (
          <button
            key={t.key}
            style={{ ...s.tab, ...(activeTab === t.key ? s.tabActive : {}) }}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Analytics */}
      {activeTab === 'analytics' && (
        <div style={s.analytics}>
          <div style={s.summaryRow}>
            <div style={{ ...s.summaryCard, borderColor: 'var(--success)' }}>
              <span style={s.summaryLabel}>They owe me</span>
              <span style={{ ...s.summaryValue, color: 'var(--success)' }}>{fmtCOP(totalOwedToMe)}</span>
              <span style={s.summaryCount}>{owedToMe.filter(d => !d.isSettled).length} pending debt{owedToMe.filter(d => !d.isSettled).length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ ...s.summaryCard, borderColor: 'var(--danger)' }}>
              <span style={s.summaryLabel}>I owe</span>
              <span style={{ ...s.summaryValue, color: 'var(--danger)' }}>{fmtCOP(totalIOwe)}</span>
              <span style={s.summaryCount}>{iOwe.filter(d => !d.isSettled).length} pending debt{iOwe.filter(d => !d.isSettled).length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <div style={s.breakdownRow}>
            {byPersonOwed.length > 0 && (
              <div style={s.breakdown}>
                <h3 style={s.breakdownTitle}>Who owes me</h3>
                {byPersonOwed.map(([person, total]) => (
                  <div key={person} style={s.breakdownItem}>
                    <span style={s.breakdownPerson}>{person}</span>
                    <span style={{ ...s.breakdownAmt, color: 'var(--success)' }}>{fmtCOP(total)}</span>
                  </div>
                ))}
              </div>
            )}
            {byPersonOwe.length > 0 && (
              <div style={s.breakdown}>
                <h3 style={s.breakdownTitle}>Who I owe</h3>
                {byPersonOwe.map(([person, total]) => (
                  <div key={person} style={s.breakdownItem}>
                    <span style={s.breakdownPerson}>{person}</span>
                    <span style={{ ...s.breakdownAmt, color: 'var(--danger)' }}>{fmtCOP(total)}</span>
                  </div>
                ))}
              </div>
            )}
            {byPersonOwed.length === 0 && byPersonOwe.length === 0 && (
              <p style={s.emptyText}>No pending debts.</p>
            )}
          </div>
        </div>
      )}

      {/* They Owe Me */}
      {activeTab === 'owed' && (
        <DebtTable
          debts={owedToMe}
          onEdit={openEditDebt}
          onDelete={onDelete}
          onAddPayment={openAddPayment}
          onDeletePayment={onDeletePayment}
          onToggleSettle={handleToggleSettle}
        />
      )}

      {/* I Owe */}
      {activeTab === 'owe' && (
        <DebtTable
          debts={iOwe}
          onEdit={openEditDebt}
          onDelete={onDelete}
          onAddPayment={openAddPayment}
          onDeletePayment={onDeletePayment}
          onToggleSettle={handleToggleSettle}
        />
      )}

      <DebtModal
        open={debtModalOpen}
        onClose={() => setDebtModalOpen(false)}
        onSave={handleSaveDebt}
        editing={editingDebt}
      />

      <DebtPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSave={handleSavePayment}
        debt={paymentTarget}
      />
    </main>
  );
}

const s = {
  page: { padding: '24px 28px', maxWidth: 1100, margin: '0 auto' },
  pageHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  pageTitle: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  addBtn: {
    padding: '9px 16px', border: 'none',
    borderRadius: 'var(--radius-sm)', background: 'var(--accent)',
    color: '#fff', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  tabBar: { display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 },
  tab: {
    padding: '9px 18px', border: 'none',
    borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
    background: 'transparent', color: 'var(--text-secondary)',
    fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
    borderBottom: '2px solid transparent',
    marginBottom: -1,
    transition: 'all 0.12s',
  },
  tabActive: {
    color: 'var(--accent)', fontWeight: 600,
    borderBottom: '2px solid var(--accent)',
    background: 'var(--accent-light)',
  },
  analytics: { display: 'flex', flexDirection: 'column', gap: 24 },
  summaryRow: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  summaryCard: {
    flex: 1, minWidth: 200,
    background: 'var(--surface)',
    border: '1.5px solid',
    borderRadius: 'var(--radius)',
    padding: '20px 24px',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  summaryLabel: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  summaryValue: { fontSize: 26, fontWeight: 700 },
  summaryCount: { fontSize: 12, color: 'var(--text-tertiary)' },
  breakdownRow: { display: 'flex', gap: 20, flexWrap: 'wrap' },
  breakdown: {
    flex: 1, minWidth: 220,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '16px 20px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  breakdownTitle: { fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0, marginBottom: 4 },
  breakdownItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  breakdownPerson: { fontSize: 14, color: 'var(--text-primary)' },
  breakdownAmt: { fontSize: 14, fontWeight: 600 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '10px 12px', textAlign: 'left',
    background: 'var(--surface-2)', color: 'var(--text-secondary)',
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.1s',
  },
  trSettled: { opacity: 0.5 },
  td: { padding: '10px 12px', color: 'var(--text-primary)', verticalAlign: 'middle' },
  numCell: { textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 },
  dateCell: { whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: 12 },
  personCell: { display: 'flex', alignItems: 'center', gap: 6 },
  expandBtn: {
    width: 20, height: 20,
    border: 'none', background: 'transparent',
    color: 'var(--text-tertiary)', cursor: 'pointer',
    fontSize: 12, padding: 0, fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  personName: { fontWeight: 600 },
  desc: { color: 'var(--text-secondary)' },
  dash: { color: 'var(--text-tertiary)' },
  settleToggle: {
    padding: '4px 10px', border: '1.5px solid',
    borderRadius: 20, fontSize: 11, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
    transition: 'all 0.12s',
  },
  settleToggleOff: {
    borderColor: 'var(--warning)', color: 'var(--warning)',
    background: 'rgba(255,149,0,0.08)',
  },
  settleToggleOn: {
    borderColor: 'var(--success)', color: 'var(--success)',
    background: 'rgba(52,199,89,0.1)',
  },
  actions: { display: 'flex', gap: 4, alignItems: 'center' },
  actionBtn: {
    width: 28, height: 28, border: 'none',
    borderRadius: 'var(--radius-sm)', background: 'transparent',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.1s',
  },
  expandedRow: { background: 'var(--surface-2)' },
  expandedCell: { padding: '10px 20px 16px 44px' },
  noPayments: { fontSize: 12, color: 'var(--text-tertiary)', margin: 0, padding: '4px 0' },
  payTable: { borderCollapse: 'collapse', width: '100%', maxWidth: 540 },
  payTh: {
    padding: '6px 10px', textAlign: 'left',
    fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
    textTransform: 'uppercase', letterSpacing: '0.4px',
    borderBottom: '1px solid var(--border)',
  },
  payTr: { borderBottom: '1px solid var(--border)' },
  payTd: { padding: '7px 10px', fontSize: 12, color: 'var(--text-primary)' },
  empty: { textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  emptyIcon: { fontSize: 32 },
  emptyText: { color: 'var(--text-tertiary)', fontSize: 14, margin: 0 },
};
