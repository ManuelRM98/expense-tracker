import { useState, useMemo } from 'react';
import { fmtCOP, fmtDate, todayISO } from '../utils/format';
import DebtModal from './DebtModal';
import DebtPaymentModal from './DebtPaymentModal';
import ConfirmDialog from './ConfirmDialog';
import * as sharedStyles from '../styles/shared';
import TabBtn from './TabBtn';

function DebtTable({ debts, onEdit, onDelete, onAddPayment, onEditPayment, onDeletePayment, onToggleSettle }) {
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
      <div style={s.card}>
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {['', 'Initial Date', 'Person', 'Description', 'Amount', 'Paid', 'Remaining', 'Settled?', 'Settlement Date', 'Actions'].map((h, i) => (
                <th key={i} style={h === '' ? s.thExpand : s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {debts.map(debt => {
              const isExpanded = expandedId === debt.id;
              const effectivelySettled = debt.isSettled || debt.totalRemaining === 0;
              return (
                <>
                  <tr
                    key={debt.id}
                    style={{ ...s.tr, ...(effectivelySettled ? s.trSettled : {}) }}
                  >
                    <td style={s.tdExpand}>
                      <button
                        style={s.expandBtn}
                        onClick={() => setExpandedId(isExpanded ? null : debt.id)}
                        title={isExpanded ? 'Hide payments' : 'Show payment history'}
                      >
                        {isExpanded
                          ? <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                          : <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M10 17l5-5-5-5v10z"/></svg>
                        }
                      </button>
                    </td>
                    <td style={{ ...s.td, ...s.dateCell }}>{fmtDate(debt.createdDate)}</td>
                    <td style={s.td}>
                      <span style={s.personName}>{debt.person}</span>
                    </td>
                    <td style={s.td}><span style={s.desc}>{debt.description}</span></td>
                    <td style={{ ...s.td, ...s.numCell }}>{fmtCOP(debt.amount)}</td>
                    <td style={{ ...s.td, ...s.numCell, color: 'var(--success)' }}>{fmtCOP(debt.totalPaid)}</td>
                    <td style={{ ...s.td, ...s.numCell, color: debt.totalRemaining > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {fmtCOP(debt.totalRemaining)}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <button
                        style={{ ...s.settleToggle, ...(effectivelySettled ? s.settleToggleOn : s.settleToggleOff) }}
                        onClick={() => onToggleSettle(debt)}
                        title={effectivelySettled ? 'Mark as pending' : 'Mark as settled'}
                      >
                        {effectivelySettled ? '✓ Settled' : 'Pending'}
                      </button>
                    </td>
                    <td style={{ ...s.td, ...s.dateCell }}>
                      {debt.settledDate ? fmtDate(debt.settledDate) : <span style={s.dash}>—</span>}
                    </td>
                    <td style={s.td}>
                      <div style={s.actions}>
                        {!effectivelySettled && (
                          <button
                            style={{ ...s.actionBtn, color: 'var(--success)' }}
                            onClick={() => onAddPayment(debt)}
                            title="Record payment"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
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
                      <td colSpan={10} style={s.expandedCell}>
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
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      <button
                                        style={{ ...s.actionBtn, color: 'var(--text-secondary)' }}
                                        onClick={() => onEditPayment(debt, p)}
                                        title="Edit payment"
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                        </svg>
                                      </button>
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
                                    </div>
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

export default function DebtsPage({ debts, onAdd, onUpdate, onDelete, onAddPayment, onUpdatePayment, onDeletePayment }) {
  const [activeTab, setActiveTab]           = useState('analytics');
  const [debtModalOpen, setDebtModalOpen]   = useState(false);
  const [editingDebt, setEditingDebt]       = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget]   = useState(null);
  const [editPaymentOpen, setEditPaymentOpen]   = useState(false);
  const [editPaymentData, setEditPaymentData]   = useState(null);

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
      settledDate: nowSettled ? todayISO() : null,
    });
  }

  function openAddPayment(debt) { setPaymentTarget(debt); setPaymentModalOpen(true); }

  async function handleSavePayment(data) {
    if (!paymentTarget) return;
    const updated = await onAddPayment(paymentTarget.id, data);
    if (updated && updated.totalRemaining === 0 && !updated.isSettled) {
      await onUpdate(paymentTarget.id, {
        person:      updated.person,
        description: updated.description,
        amount:      updated.amount,
        isSettled:   true,
        settledDate: todayISO(),
      });
    }
  }

  function openEditPayment(debt, payment) {
    setEditPaymentData({ debt, payment });
    setEditPaymentOpen(true);
  }

  function handleSaveEditPayment(data) {
    if (editPaymentData) onUpdatePayment(editPaymentData.debt.id, editPaymentData.payment.id, data);
  }

  const tabs = [
    { key: 'analytics', label: 'Analytics',    color: 'var(--analytics)' },
    { key: 'owed',      label: 'They Owe Me',  color: 'var(--success)'   },
    { key: 'owe',       label: 'I Owe',        color: 'var(--danger)'    },
  ];

  return (
    <main style={s.page}>
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Debts</h1>
        <button style={s.addBtn} onClick={openAddDebt}>+ Add Debt</button>
      </div>

      <div style={sharedStyles.tabBar}>
        {tabs.map(t => (
          <TabBtn
            key={t.key}
            label={t.label}
            active={activeTab === t.key}
            onClick={() => setActiveTab(t.key)}
            color={t.color}
          />
        ))}
      </div>

      {/* Analytics */}
      {activeTab === 'analytics' && (
        <div style={s.analytics}>
          <div style={s.summaryRow}>
            <div style={s.summaryCard}>
              <div style={s.summaryLabelRow}>
                <span style={s.summaryLabel}>They Owe Me</span>
                <span style={{ ...s.summaryDot, background: 'var(--success)' }} />
              </div>
              <span style={{ ...s.summaryValue, color: 'var(--success)' }}>{fmtCOP(totalOwedToMe)}</span>
              <span style={s.summaryCount}>{owedToMe.filter(d => !d.isSettled).length} pending debt{owedToMe.filter(d => !d.isSettled).length !== 1 ? 's' : ''}</span>
            </div>
            <div style={s.summaryCard}>
              <div style={s.summaryLabelRow}>
                <span style={s.summaryLabel}>I Owe</span>
                <span style={{ ...s.summaryDot, background: 'var(--danger)' }} />
              </div>
              <span style={{ ...s.summaryValue, color: 'var(--danger)' }}>{fmtCOP(totalIOwe)}</span>
              <span style={s.summaryCount}>{iOwe.filter(d => !d.isSettled).length} pending debt{iOwe.filter(d => !d.isSettled).length !== 1 ? 's' : ''}</span>
            </div>
            <div style={s.summaryCard}>
              <div style={s.summaryLabelRow}>
                <span style={s.summaryLabel}>Net Balance</span>
                <span style={{ ...s.summaryDot, background: totalOwedToMe >= totalIOwe ? 'var(--success)' : 'var(--danger)' }} />
              </div>
              <span style={{ ...s.summaryValue, color: totalOwedToMe >= totalIOwe ? 'var(--success)' : 'var(--danger)' }}>
                {fmtCOP(totalOwedToMe - totalIOwe)}
              </span>
              <span style={s.summaryCount}>{totalOwedToMe >= totalIOwe ? 'in your favor' : 'you owe more'}</span>
            </div>
          </div>

          <div style={s.breakdownRow}>
            {byPersonOwed.length > 0 && (
              <div style={s.breakdown}>
                <h3 style={s.breakdownTitle}>Who Owes Me</h3>
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
                <h3 style={s.breakdownTitle}>Who I Owe</h3>
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
          onEditPayment={openEditPayment}
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
          onEditPayment={openEditPayment}
          onDeletePayment={onDeletePayment}
          onToggleSettle={handleToggleSettle}
        />
      )}

      <DebtModal
        key={`debt-${debtModalOpen ? (editingDebt?.id ?? 'new') : 'closed'}`}
        open={debtModalOpen}
        onClose={() => setDebtModalOpen(false)}
        onSave={handleSaveDebt}
        editing={editingDebt}
      />

      <DebtPaymentModal
        key={`pay-add-${paymentModalOpen ? (paymentTarget?.id ?? 'none') : 'closed'}`}
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSave={handleSavePayment}
        debt={paymentTarget}
      />

      <DebtPaymentModal
        key={`pay-edit-${editPaymentOpen ? (editPaymentData?.payment?.id ?? 'none') : 'closed'}`}
        open={editPaymentOpen}
        onClose={() => setEditPaymentOpen(false)}
        onSave={handleSaveEditPayment}
        debt={editPaymentData?.debt}
        editing={editPaymentData?.payment}
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
  analytics: { display: 'flex', flexDirection: 'column', gap: 20 },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 14,
  },
  summaryCard: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    padding: '18px 20px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  summaryLabelRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  summaryDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  summaryLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' },
  summaryValue: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' },
  summaryCount: { fontSize: 12, color: 'var(--text-tertiary)' },
  breakdownRow: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  breakdown: {
    flex: 1, minWidth: 220,
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
    padding: '16px 20px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  breakdownTitle: {
    fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
    margin: 0, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.6px',
  },
  breakdownItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '6px 0', borderBottom: '1px solid var(--border)',
  },
  breakdownPerson: { fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' },
  breakdownAmt: { fontSize: 14, fontWeight: 700, letterSpacing: '-0.3px' },
  card: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
    overflow: 'hidden',
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '10px 16px', textAlign: 'left',
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
  td: { padding: '12px 16px', fontSize: 14, color: 'var(--text-primary)', verticalAlign: 'middle' },
  numCell: { textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 },
  dateCell: { whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: 12 },
  thExpand: { padding: '10px 8px', width: 36, background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' },
  tdExpand: { padding: '12px 8px', textAlign: 'center', verticalAlign: 'middle' },
  expandBtn: {
    width: 26, height: 26,
    flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1.5px solid var(--border)',
    borderRadius: '50%',
    background: 'var(--bg)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: 0,
    fontFamily: 'inherit',
    lineHeight: 1,
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
  actions: { display: 'flex', gap: 6, alignItems: 'center' },
  actionBtn: {
    width: 28, height: 28, borderRadius: '50%',
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, padding: 0, transition: 'background 0.15s',
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
