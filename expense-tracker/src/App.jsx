import { useState, useMemo, useEffect } from 'react';
import { useExpenses } from './hooks/useExpenses';
import { useFixedExpenses } from './hooks/useFixedExpenses';
import { fmtCOP, MONTH_NAMES } from './utils/format';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AnnualDashboard from './components/AnnualDashboard';
import ExpenseModal from './components/ExpenseModal';
import ExpenseTable from './components/ExpenseTable';
import SavingModal from './components/SavingModal';
import SavingTable from './components/SavingTable';
import FixedExpensesPage from './components/FixedExpensesPage';
import {
  CardVsCashChart,
  ByCardTypeChart,
  ByPersonChart,
  MonthlyTrendChart,
} from './components/Charts';

const now = new Date();

export default function App() {
  const {
    expenses, cardTypes, expenseCategories,
    addExpense, bulkAddExpenses, updateExpense, deleteExpense, addCardType, removeCardType, addExpenseCategory, removeExpenseCategory,
    savings, savingCategories,
    addSaving, updateSaving, deleteSaving, addSavingCategory, removeSavingCategory,
    getIncome, setIncome,
  } = useExpenses();

  const {
    templates,
    addTemplate, updateTemplate, deleteTemplate, toggleTemplate,
    generateForMonth,
  } = useFixedExpenses();

  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [annualYear, setAnnualYear] = useState(now.getFullYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [defaultCostType, setDefaultCostType] = useState('');
  const [savingModalOpen, setSavingModalOpen] = useState(false);
  const [editingSaving,   setEditingSaving]   = useState(null);
  const [toast,      setToast]     = useState('');
  const [toastTimer, setToastTimer] = useState(null);
  const [activeTab,  setActiveTab] = useState('expenses'); // 'expenses' | 'savings' | 'charts'
  const [darkMode,   setDarkMode]  = useState(() => localStorage.getItem('theme') === 'dark');
  const [view,       setView]      = useState('home'); // 'home' | 'month' | 'permanentFixed'

  // Income editing state
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput,   setIncomeInput]   = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // ── Month key ────────────────────────────────────────────
  const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  // ── Auto-generate permanent fixed expenses ───────────────
  useEffect(() => {
    generateForMonth(monthKey, bulkAddExpenses);
  }, [monthKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Month filter ─────────────────────────────────────────
  const monthExpenses = useMemo(() =>
    expenses.filter(e => {
      const [y, m] = e.date.split('-');
      return parseInt(y) === viewYear && parseInt(m) - 1 === viewMonth;
    }),
  [expenses, viewYear, viewMonth]);

  const monthSavings = useMemo(() =>
    savings.filter(sv => {
      const [y, m] = sv.date.split('-');
      return parseInt(y) === viewYear && parseInt(m) - 1 === viewMonth;
    }),
  [savings, viewYear, viewMonth]);

  // ── Summary ──────────────────────────────────────────────
  const income      = getIncome(monthKey);
  const totalExp    = monthExpenses.reduce((s, e) => s + e.price, 0);
  const totalSav    = monthSavings.reduce((s, sv) => s + sv.price, 0);
  const remaining   = income - totalExp - totalSav;
  const cardTotal   = monthExpenses.filter(e => e.cardPay === 'Yes').reduce((s, e) => s + e.price, 0);
  const cashTotal   = totalExp - cardTotal;

  // ── Navigation ───────────────────────────────────────────
  function goHome() {
    setView('home');
  }

  function goToMonth(year, month) {
    setViewYear(year);
    setViewMonth(month);
    setView('month');
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // ── Toast ────────────────────────────────────────────────
  function showToast(msg) {
    setToast(msg);
    if (toastTimer) clearTimeout(toastTimer);
    const t = setTimeout(() => setToast(''), 2400);
    setToastTimer(t);
  }

  // ── Expense CRUD ─────────────────────────────────────────
  function openAdd(costType = '') { setDefaultCostType(costType); setEditing(null); setModalOpen(true); }
  function openAddFixed() { openAdd('fixed'); }
  function openEdit(exp) { setDefaultCostType(''); setEditing(exp); setModalOpen(true); }

  function handleSave(data) {
    if (editing) {
      updateExpense(editing.id, data);
      showToast('Expense updated.');
    } else {
      addExpense(data);
      showToast('Expense added.');
    }
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this expense?')) return;
    deleteExpense(id);
    showToast('Expense deleted.');
  }

  // ── Saving CRUD ──────────────────────────────────────────
  function openAddSaving() { setEditingSaving(null); setSavingModalOpen(true); }
  function openEditSaving(sv) { setEditingSaving(sv); setSavingModalOpen(true); }

  function handleSaveSaving(data) {
    if (editingSaving) {
      updateSaving(editingSaving.id, data);
      showToast('Saving updated.');
    } else {
      addSaving(data);
      showToast('Saving added.');
    }
  }

  function handleDeleteSaving(id) {
    if (!window.confirm('Delete this saving?')) return;
    deleteSaving(id);
    showToast('Saving deleted.');
  }

  // ── Income editing ───────────────────────────────────────
  function startEditIncome() {
    setIncomeInput(income > 0 ? income.toLocaleString('es-CO') : '');
    setEditingIncome(true);
  }

  function formatIncomeInput(raw) {
    const digits = raw.replace(/\D/g, '');
    return digits ? parseInt(digits, 10).toLocaleString('es-CO') : '';
  }

  function commitIncome() {
    const val = parseInt(incomeInput.replace(/\D/g, '') || '0', 10);
    setIncome(monthKey, val);
    setEditingIncome(false);
  }

  // ── Header button ────────────────────────────────────────
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const headerAction = (view === 'month' && activeTab === 'savings')
    ? { label: 'Add Saving', fn: openAddSaving, color: 'var(--savings)' }
    : { label: 'Add Expense', fn: openAdd, color: 'var(--accent)' };

  // ── Shared header + modals ───────────────────────────────
  const sharedHeader = (
    <Header
      onAdd={headerAction.fn}
      addLabel={headerAction.label}
      btnColor={headerAction.color}
      darkMode={darkMode}
      onToggleDark={() => setDarkMode(d => !d)}
      onOpenPermanent={() => setView('permanentFixed')}
    />
  );

  const sharedModals = (
    <>
      <ExpenseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        cardTypes={cardTypes}
        onAddCard={addCardType}
        onRemoveCard={removeCardType}
        expenseCategories={expenseCategories}
        onAddCategory={addExpenseCategory}
        onRemoveCategory={removeExpenseCategory}
        editing={editing}
        defaultCostType={defaultCostType}
      />
      <SavingModal
        open={savingModalOpen}
        onClose={() => setSavingModalOpen(false)}
        onSave={handleSaveSaving}
        cardTypes={cardTypes}
        onAddCard={addCardType}
        onRemoveCard={removeCardType}
        savingCategories={savingCategories}
        onAddCategory={addSavingCategory}
        onRemoveCategory={removeSavingCategory}
        editing={editingSaving}
      />
      {toast && <div style={s.toast}>{toast}</div>}
    </>
  );

  // ── Permanent Fixed Costs page ───────────────────────────
  if (view === 'permanentFixed') {
    return (
      <>
        {sharedHeader}
        <FixedExpensesPage
          templates={templates}
          onAdd={addTemplate}
          onUpdate={updateTemplate}
          onDelete={deleteTemplate}
          onToggle={toggleTemplate}
          cardTypes={cardTypes}
          onAddCard={addCardType}
          onRemoveCard={removeCardType}
          expenseCategories={expenseCategories}
          onAddCategory={addExpenseCategory}
          onRemoveCategory={removeExpenseCategory}
          onBack={() => setView('home')}
        />
        {sharedModals}
      </>
    );
  }

  return (
    <>
      {sharedHeader}

      <div style={s.layout}>
        {/* ── Left sidebar ── */}
        <Sidebar
          view={view}
          viewYear={viewYear}
          viewMonth={viewMonth}
          onHome={goHome}
          onSelectMonth={goToMonth}
          expenses={expenses}
          savings={savings}
        />

        {/* ── Main content ── */}
        <div style={s.content}>

          {/* ── Home / Annual view ── */}
          {view === 'home' && (
            <AnnualDashboard
              year={annualYear}
              expenses={expenses}
              savings={savings}
              getIncome={getIncome}
              onPrevYear={() => setAnnualYear(y => y - 1)}
              onNextYear={() => setAnnualYear(y => y + 1)}
            />
          )}

          {/* ── Month view ── */}
          {view === 'month' && (
            <main style={s.main}>

              {/* Month nav */}
              <div style={s.monthBar}>
                <button style={s.navBtn} onClick={prevMonth}>&#8249;</button>
                <div style={s.monthLabel}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                  {isCurrentMonth && <span style={s.currentBadge}>Current</span>}
                </div>
                <button style={s.navBtn} onClick={nextMonth}>&#8250;</button>
              </div>

              {/* Tab bar */}
              <div style={s.tabBar}>
                <TabBtn label="Expenses"  active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} color="var(--accent)" />
                <TabBtn label="Savings"   active={activeTab === 'savings'}  onClick={() => setActiveTab('savings')}  color="var(--savings)" />
                <TabBtn label="Analytics" active={activeTab === 'charts'}   onClick={() => setActiveTab('charts')}   color="var(--analytics)" />
              </div>

              {/* Income banner */}
              <div style={s.incomeBanner}>
                <div style={s.incomeLeft}>
                  <span style={s.incomeIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                    </svg>
                  </span>
                  <div>
                    <div style={s.incomeTitle}>Monthly Income</div>
                    {editingIncome ? (
                      <div style={s.incomeEditRow}>
                        <input
                          type="text"
                          inputMode="numeric"
                          style={s.incomeInput}
                          value={incomeInput}
                          autoFocus
                          onChange={e => setIncomeInput(formatIncomeInput(e.target.value))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitIncome();
                            if (e.key === 'Escape') setEditingIncome(false);
                          }}
                        />
                        <button style={s.incomeConfirmBtn} onClick={commitIncome}>Set</button>
                        <button style={s.incomeCancelBtn} onClick={() => setEditingIncome(false)}>&#x2715;</button>
                      </div>
                    ) : (
                      <div style={s.incomeValue}>
                        {income > 0 ? fmtCOP(income) : <span style={s.incomeEmpty}>Not set — click to add</span>}
                      </div>
                    )}
                  </div>
                </div>
                {!editingIncome && (
                  <button style={s.incomeEditBtn} onClick={startEditIncome} title="Edit income">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Summary cards */}
              <div style={s.summaryRow}>
                <SummaryCard label="Total Expenses"  value={fmtCOP(totalExp)} color="var(--danger)" />
                <SummaryCard label="Total Savings"   value={fmtCOP(totalSav)} color="var(--savings)" />
                <SummaryCard label="Paid by Card"    value={fmtCOP(cardTotal)} color="var(--accent)" />
                <SummaryCard label="Cash / Other"    value={fmtCOP(cashTotal)} color="var(--warning)" />
                <SummaryCard
                  label="Remaining"
                  value={income > 0 ? fmtCOP(remaining) : '—'}
                  color={income > 0 ? (remaining >= 0 ? 'var(--success)' : 'var(--danger)') : undefined}
                />
              </div>

              {/* Expenses tab */}
              {activeTab === 'expenses' && (
                <ExpenseTable
                  expenses={monthExpenses}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onAddFixed={openAddFixed}
                />
              )}

              {/* Savings tab */}
              {activeTab === 'savings' && (
                <SavingTable
                  savings={monthSavings}
                  onEdit={openEditSaving}
                  onDelete={handleDeleteSaving}
                />
              )}

              {/* Analytics tab */}
              {activeTab === 'charts' && (
                <>
                  <div style={s.chartsGrid}>
                    <CardVsCashChart expenses={monthExpenses} />
                    <ByCardTypeChart expenses={monthExpenses} />
                  </div>
                  <div style={s.chartsGrid}>
                    <ByPersonChart expenses={monthExpenses} />
                    <MonthlyTrendChart expenses={expenses} />
                  </div>
                </>
              )}
            </main>
          )}
        </div>
      </div>

      {sharedModals}
    </>
  );
}

// ── Small components ─────────────────────────────────────────
function SummaryCard({ label, value, color }) {
  return (
    <div style={s.summaryCard}>
      <div style={s.summaryLabel}>{label}</div>
      <div style={{ ...s.summaryValue, ...(color ? { color } : {}) }}>{value}</div>
    </div>
  );
}

function TabBtn({ label, active, onClick, color }) {
  const activeColor = color ?? 'var(--accent)';
  return (
    <button
      style={{
        ...s.tabBtn,
        ...(active ? { ...s.tabBtnActive, background: activeColor } : {}),
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// ── Styles ───────────────────────────────────────────────────
const s = {
  layout: {
    display: 'flex',
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    minWidth: 0,
    overflowX: 'hidden',
  },
  main: {
    maxWidth: 1000,
    margin: '0 auto',
    padding: '28px 24px 80px',
  },
  monthBar: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: '50%', border: 'none',
    background: 'var(--surface)', boxShadow: 'var(--shadow-sm)',
    cursor: 'pointer', fontSize: 22, color: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit',
  },
  monthLabel: {
    fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px',
    flex: 1, display: 'flex', alignItems: 'center', gap: 10,
  },
  currentBadge: {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.5px', background: 'var(--accent-light)',
    color: 'var(--accent)', padding: '3px 9px', borderRadius: 20,
  },

  // Income banner
  incomeBanner: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'var(--surface)', borderRadius: 'var(--radius-md)',
    padding: '16px 20px', boxShadow: 'var(--shadow-sm)',
    marginBottom: 16, gap: 12,
  },
  incomeLeft: {
    display: 'flex', alignItems: 'center', gap: 14, flex: 1,
  },
  incomeIcon: {
    width: 40, height: 40, borderRadius: '50%',
    background: 'var(--accent-light)', color: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  incomeTitle: {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.6px', color: 'var(--text-secondary)', marginBottom: 4,
  },
  incomeValue: {
    fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px',
    color: 'var(--accent)',
  },
  incomeEmpty: {
    fontSize: 15, fontWeight: 500, color: 'var(--text-tertiary)',
  },
  incomeEditRow: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  incomeInput: {
    fontFamily: 'inherit', fontSize: 18, fontWeight: 700,
    background: 'var(--bg)', border: '1.5px solid var(--accent)',
    borderRadius: 'var(--radius-sm)', padding: '6px 12px',
    color: 'var(--text-primary)', outline: 'none', width: 200,
  },
  incomeConfirmBtn: {
    padding: '7px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
    background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  incomeCancelBtn: {
    width: 30, height: 30, borderRadius: '50%', border: 'none',
    background: 'var(--bg)', color: 'var(--text-secondary)',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  incomeEditBtn: {
    width: 34, height: 34, borderRadius: '50%', border: '1.5px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text-secondary)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 14, marginBottom: 24,
  },
  summaryCard: {
    background: 'var(--surface)', borderRadius: 'var(--radius-md)',
    padding: '18px 20px', boxShadow: 'var(--shadow-sm)',
  },
  summaryLabel: {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.6px', color: 'var(--text-secondary)', marginBottom: 6,
  },
  summaryValue: {
    fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px',
    color: 'var(--text-primary)',
  },
  tabBar: {
    display: 'flex', gap: 8, marginBottom: 20,
    background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
    padding: 4, boxShadow: 'var(--shadow-sm)', width: 'fit-content',
  },
  tabBtn: {
    padding: '8px 20px', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 500, cursor: 'pointer',
    background: 'transparent', color: 'var(--text-secondary)',
    fontFamily: 'inherit', transition: 'all .15s',
  },
  tabBtnActive: {
    background: 'var(--accent)', color: '#fff', fontWeight: 600,
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 16, marginBottom: 16,
  },
  toast: {
    position: 'fixed', bottom: 32, left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--text-primary)', color: 'var(--bg)',
    padding: '12px 22px', borderRadius: 30,
    fontSize: 14, fontWeight: 500, zIndex: 500,
    boxShadow: 'var(--shadow-md)',
    animation: 'fadeInUp .3s ease',
  },
};
