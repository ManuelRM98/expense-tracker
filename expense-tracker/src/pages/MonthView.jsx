import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fmtCOP, MONTH_NAMES } from '../utils/format';
import ExpenseTable from '../components/ExpenseTable';
import SavingTable from '../components/SavingTable';
import BudgetCards from '../components/BudgetCards';
import IncomeEntryModal from '../components/IncomeEntryModal';
import ExpenseModal from '../components/ExpenseModal';
import SavingModal from '../components/SavingModal';
import {
  CardVsCashChart,
  ByCardTypeChart,
  ByPersonChart,
  MonthlyTrendChart,
  ExpensesByCategoryChart,
  FixedVsVariableChart,
  SavingsByCategoryChart,
  SavingsTrendChart,
  CreditCardBreakdownChart,
  IncomeBreakdownChart,
} from '../components/Charts';
import * as sharedStyles from '../styles/shared';
import NavArrowButton from '../components/NavArrowButton';

const MONTH_URL_NAMES = [
  'january','february','march','april','may','june',
  'july','august','september','october','november','december',
];

const now = new Date();

export default function MonthView({
  // Data hooks
  getExpensesForMonth, loadExpensesForMonth,
  getSavingsForMonth,  loadSavingsForMonth,
  addExpense, bulkAddExpenses, updateExpense, deleteExpense,
  addSaving, updateSaving, deleteSaving,
  cardTypes, cardColors, addCardType, removeCardType,
  expenseCategories, addExpenseCategory, removeExpenseCategory, renameExpenseCategory,
  savingCategories, addSavingCategory, removeSavingCategory, renameSavingCategory,
  expenseCategoryColors, savingCategoryColors,
  getIncome, getIncomeEntries, fetchIncomeForYear,
  addIncomeEntry, updateIncomeEntry, deleteIncomeEntry,
  ensureSalaryForMonth, baseSalaryLoaded,
  getBudgetForMonth, saveMonthBudget, clearMonthBudget, loadMonthBudget,
  people,
  // Cross-cutting callbacks
  showToast, askConfirm, closeConfirm,
  // Debt helpers
  addDebt,
  // Fixed expense generation
  generateForMonth,
  // Ref for Header's "Add" button to trigger the correct modal
  addRef,
}) {
  const { year: yearParam, monthName } = useParams();
  const navigate = useNavigate();

  const viewYear  = parseInt(yearParam, 10);
  const viewMonth = MONTH_URL_NAMES.indexOf(monthName?.toLowerCase() ?? '');

  // Guard: invalid URL — redirect to home
  useEffect(() => {
    if (isNaN(viewYear) || viewMonth === -1) navigate('/');
  }, [viewYear, viewMonth, navigate]);

  const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  // ── Initialization guard (fire once per month per session) ────────────────
  const initializedMonthsRef = useRef(new Set());

  useEffect(() => {
    if (isNaN(viewYear) || viewMonth === -1) return;

    // Load expenses, savings, and budget for this month (cached/deduped in hooks)
    loadExpensesForMonth(monthKey);
    loadSavingsForMonth(monthKey);
    loadMonthBudget(monthKey);

    if (!initializedMonthsRef.current.has(monthKey)) {
      initializedMonthsRef.current.add(monthKey);
      generateForMonth(monthKey, bulkAddExpenses);

      // FINDING 3: await fetchIncomeForYear before ensureSalaryForMonth so that
      // the hook's incomeEntriesRef is up to date before the duplicate check runs.
      // ensureSalaryForMonth reads from the ref (not the stale-closure state),
      // so awaiting here ensures no duplicate salary entry is created.
      (async () => {
        await fetchIncomeForYear(viewYear);
        if (baseSalaryLoaded) {
          ensureSalaryForMonth(monthKey);
        }
      })();
    }
  }, [monthKey, baseSalaryLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // BUG-02: when baseSalaryLoaded flips true, ensure salary for the current month
  useEffect(() => {
    if (baseSalaryLoaded && monthKey) {
      ensureSalaryForMonth(monthKey);
    }
  }, [baseSalaryLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Month data ─────────────────────────────────────────────────────────────
  const monthExpenses = getExpensesForMonth(monthKey);
  const monthSavings  = getSavingsForMonth(monthKey);

  // PERF-04: memoize derived aggregates
  const income = useMemo(() => getIncome(monthKey), [getIncome, monthKey]);

  const { totalExp, totalSav, remaining, cardTotal, totalFixed, totalVariable } = useMemo(() => {
    const te  = monthExpenses.reduce((s, e) => s + e.price, 0);
    const ts  = monthSavings.reduce((s, sv) => s + sv.price, 0);
    const ct  = monthExpenses.filter(e => e.cardPay === 'Yes').reduce((s, e) => s + e.price, 0);
    const tf  = monthExpenses.filter(e => e.costType === 'fixed').reduce((s, e) => s + e.price, 0);
    const tv  = monthExpenses.filter(e => e.costType !== 'fixed').reduce((s, e) => s + e.price, 0);
    return { totalExp: te, totalSav: ts, remaining: income - te - ts, cardTotal: ct, totalFixed: tf, totalVariable: tv };
  }, [monthExpenses, monthSavings, income]);

  const monthBudget = getBudgetForMonth(monthKey);

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab,    setActiveTab]    = useState('expenses');
  const [analyticsTab, setAnalyticsTab] = useState('overview');

  // ── Expense modal ──────────────────────────────────────────────────────────
  const [modalOpen,        setModalOpen]        = useState(false);
  const [editing,          setEditing]          = useState(null);
  const [cloning,          setCloning]          = useState(null);
  const [defaultCostType,  setDefaultCostType]  = useState('');

  function openAdd(costType = '') { setDefaultCostType(costType); setEditing(null); setCloning(null); setModalOpen(true); }
  function openEdit(exp)         { setDefaultCostType(''); setEditing(exp); setCloning(null); setModalOpen(true); }
  function openCloneExpense(exp) { setDefaultCostType(''); setEditing(null); setCloning(exp); setModalOpen(true); }


  async function handleSave({ debtEntries, ...data }) {
    try {
      let expenseId;
      if (editing) {
        await updateExpense(editing.id, data);
        expenseId = editing.id;
        showToast('Expense updated.');
      } else {
        const created = await addExpense(data);
        expenseId = created?.id;
        showToast('Expense added.');
      }
      if (debtEntries?.length > 0 && expenseId) {
        for (const entry of debtEntries) {
          await addDebt({
            direction:       entry.direction,
            person:          entry.person,
            description:     data.desc,
            amount:          parseInt(String(entry.amount).replace(/\D/g, ''), 10),
            linkedExpenseId: expenseId,
            createdDate:     data.date,
          });
        }
      }
    } catch (err) {
      showToast(`Error: ${err.message ?? 'Could not save expense.'}`);
    }
  }

  function handleDelete(id) {
    askConfirm({
      title: 'Delete expense',
      message: 'This action cannot be undone.',
      onConfirm: async () => {
        try {
          closeConfirm();
          await deleteExpense(id);
          showToast('Expense deleted.');
        } catch (err) {
          showToast(`Error: ${err.message ?? 'Could not delete expense.'}`);
        }
      },
    });
  }

  // ── Saving modal ───────────────────────────────────────────────────────────
  const [savingModalOpen, setSavingModalOpen] = useState(false);
  const [editingSaving,   setEditingSaving]   = useState(null);
  const [cloningsSaving,  setCloningsSaving]  = useState(null);

  function openAddSaving()        { setEditingSaving(null); setCloningsSaving(null); setSavingModalOpen(true); }
  function openEditSaving(sv)     { setEditingSaving(sv); setCloningsSaving(null); setSavingModalOpen(true); }
  function openCloneSaving(sv)    { setEditingSaving(null); setCloningsSaving(sv); setSavingModalOpen(true); }

  async function handleSaveSaving(data) {
    try {
      if (editingSaving) {
        await updateSaving(editingSaving.id, data);
        showToast('Saving updated.');
      } else {
        await addSaving(data);
        showToast('Saving added.');
      }
    } catch (err) {
      showToast(`Error: ${err.message ?? 'Could not save saving.'}`);
    }
  }

  function handleDeleteSaving(id) {
    askConfirm({
      title: 'Delete saving',
      message: 'This action cannot be undone.',
      onConfirm: async () => {
        try {
          closeConfirm();
          await deleteSaving(id);
          showToast('Saving deleted.');
        } catch (err) {
          showToast(`Error: ${err.message ?? 'Could not delete saving.'}`);
        }
      },
    });
  }

  // ── Income modal ───────────────────────────────────────────────────────────
  const [incomeModalOpen,    setIncomeModalOpen]    = useState(false);
  const [editingIncomeEntry, setEditingIncomeEntry] = useState(null);

  function openAddIncome()      { setEditingIncomeEntry(null); setIncomeModalOpen(true); }
  function openEditIncome(entry){ setEditingIncomeEntry(entry); setIncomeModalOpen(true); }

  async function handleSaveIncome(data) {
    try {
      if (editingIncomeEntry) {
        await updateIncomeEntry(editingIncomeEntry.id, data);
        showToast('Income entry updated.');
      } else {
        await addIncomeEntry(data);
        showToast('Income entry added.');
      }
      setIncomeModalOpen(false);
    } catch (err) {
      showToast(`Error: ${err.message ?? 'Could not save income entry.'}`);
    }
  }

  async function handleDeleteIncome(id) {
    askConfirm({
      title: 'Delete income entry',
      message: 'This action cannot be undone.',
      onConfirm: async () => {
        try {
          closeConfirm();
          await deleteIncomeEntry(id);
          showToast('Income entry deleted.');
        } catch (err) {
          showToast(`Error: ${err.message ?? 'Could not delete income entry.'}`);
        }
      },
    });
  }

  // Expose openAdd/openAddSaving to parent (Header button) via ref.
  // Intentionally runs every render (no dependency array) to keep the ref
  // fresh with the current activeTab closure — this is the correct pattern.
  useEffect(() => {
    if (addRef) {
      addRef.current = () => {
        if (activeTab === 'savings') openAddSaving();
        else openAdd();
      };
    }
    return () => { if (addRef) addRef.current = null; };
  });

  // ── Navigation ─────────────────────────────────────────────────────────────
  function prevMonth() {
    const newYear  = viewMonth === 0 ? viewYear - 1 : viewYear;
    const newMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    navigate(`/${newYear}/${MONTH_URL_NAMES[newMonth]}`);
  }
  function nextMonth() {
    const newYear  = viewMonth === 11 ? viewYear + 1 : viewYear;
    const newMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    navigate(`/${newYear}/${MONTH_URL_NAMES[newMonth]}`);
  }

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  if (isNaN(viewYear) || viewMonth === -1) return null;

  return (
    <>
      <main style={s.main}>
        {/* Month nav */}
        <div style={s.monthBar}>
          <NavArrowButton direction="left" onClick={prevMonth} />
          <div style={s.monthLabel}>
            {MONTH_NAMES[viewMonth]} {viewYear}
            {isCurrentMonth && <span style={sharedStyles.badge}>Current</span>}
          </div>
          <NavArrowButton direction="right" onClick={nextMonth} />
        </div>

        {/* Tab bar */}
        <div style={sharedStyles.tabBar}>
          <TabBtn label="Expenses"  active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} color="var(--accent)" />
          <TabBtn label="Savings"   active={activeTab === 'savings'}  onClick={() => setActiveTab('savings')}  color="var(--savings)" />
          <TabBtn label="Analytics" active={activeTab === 'charts'}   onClick={() => setActiveTab('charts')}   color="var(--analytics)" />
        </div>

        {/* Income banner */}
        <IncomeBanner
          income={income}
          entries={getIncomeEntries(monthKey)}
          onAdd={openAddIncome}
          onEdit={openEditIncome}
          onDelete={handleDeleteIncome}
        />

        {/* Summary rows */}
        {activeTab === 'expenses' && (
          <div style={sharedStyles.summaryGrid}>
            <SummaryCard label="Total Expenses" value={fmtCOP(totalExp)}      color="var(--danger)" />
            <SummaryCard label="Fixed"          value={fmtCOP(totalFixed)}    color="var(--warning)" />
            <SummaryCard label="Variable"       value={fmtCOP(totalVariable)} color="var(--accent)" />
            <SummaryCard label="Paid by Card"   value={fmtCOP(cardTotal)}     color="var(--accent)" />
            <SummaryCard
              label="Remaining"
              value={income > 0 ? fmtCOP(remaining) : '—'}
              color={income > 0 ? (remaining >= 0 ? 'var(--success)' : 'var(--danger)') : undefined}
            />
          </div>
        )}

        {activeTab === 'savings' && (
          <div style={sharedStyles.summaryGrid}>
            <SummaryCard label="Total Savings" value={fmtCOP(totalSav)} color="var(--savings)" />
            <SummaryCard
              label="Savings Target"
              value={income > 0 && monthBudget?.savingsPct > 0 ? fmtCOP(Math.round(income * monthBudget.savingsPct / 100)) : '—'}
              color="var(--text-secondary)"
            />
            <SummaryCard
              label="Remaining"
              value={income > 0 ? fmtCOP(remaining) : '—'}
              color={income > 0 ? (remaining >= 0 ? 'var(--success)' : 'var(--danger)') : undefined}
            />
          </div>
        )}

        {activeTab === 'charts' && income > 0 && (
          <div style={s.rateStrip}>
            <RateCard label="Expense Rate" value={`${Math.round((totalExp / income) * 100)}%`}  color="var(--danger)" />
            <RateCard label="Savings Rate" value={`${Math.round((totalSav / income) * 100)}%`}  color="var(--savings)" />
            <RateCard label="Free Cash"    value={`${Math.max(0, Math.round(((income - totalExp - totalSav) / income) * 100))}%`} color="var(--accent)" />
          </div>
        )}

        {/* Expenses tab */}
        {activeTab === 'expenses' && (
          <>
            <BudgetCards
              variant="expenses"
              budget={monthBudget}
              income={income}
              totalFixed={totalFixed}
              totalVariable={totalVariable}
              totalSavings={totalSav}
              onSaveOverride={(pcts) => saveMonthBudget(monthKey, pcts)}
              onClearOverride={() => clearMonthBudget(monthKey)}
            />
            <ExpenseTable
              expenses={monthExpenses}
              cardColors={cardColors}
              categoryColors={expenseCategoryColors}
              onEdit={openEdit}
              onDelete={handleDelete}
              onClone={openCloneExpense}
              onAddFixed={() => openAdd('fixed')}
              onAddVariable={() => openAdd('variable')}
            />
          </>
        )}

        {/* Savings tab */}
        {activeTab === 'savings' && (
          <>
            <BudgetCards
              variant="savings"
              budget={monthBudget}
              income={income}
              totalFixed={totalFixed}
              totalVariable={totalVariable}
              totalSavings={totalSav}
              onSaveOverride={(pcts) => saveMonthBudget(monthKey, pcts)}
              onClearOverride={() => clearMonthBudget(monthKey)}
            />
            <SavingTable
              savings={monthSavings}
              cardColors={cardColors}
              categoryColors={savingCategoryColors}
              onEdit={openEditSaving}
              onDelete={handleDeleteSaving}
              onClone={openCloneSaving}
              onAdd={openAddSaving}
            />
          </>
        )}

        {/* Analytics tab */}
        {activeTab === 'charts' && (
          <>
            <div style={sharedStyles.subTabBar}>
              <SubTabBtn label="Overview" active={analyticsTab === 'overview'} onClick={() => setAnalyticsTab('overview')} />
              <SubTabBtn label="Expenses" active={analyticsTab === 'expenses'} onClick={() => setAnalyticsTab('expenses')} />
              <SubTabBtn label="Savings"  active={analyticsTab === 'savings'}  onClick={() => setAnalyticsTab('savings')} />
            </div>

            {analyticsTab === 'overview' && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <CreditCardBreakdownChart expenses={monthExpenses} />
                </div>
                {income > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <IncomeBreakdownChart income={income} totalExp={totalExp} totalSav={totalSav} />
                  </div>
                )}
                {/* PERF-03: MonthlyTrendChart uses backend trend endpoint, no all-data prop needed */}
                <div style={sharedStyles.chartsGrid}>
                  <MonthlyTrendChart />
                </div>
              </>
            )}

            {analyticsTab === 'expenses' && (
              <>
                <div style={sharedStyles.chartsGrid}>
                  <ExpensesByCategoryChart expenses={monthExpenses} />
                  <FixedVsVariableChart expenses={monthExpenses} />
                </div>
                <div style={sharedStyles.chartsGrid}>
                  <CardVsCashChart expenses={monthExpenses} />
                  <ByCardTypeChart expenses={monthExpenses} />
                </div>
                <div style={sharedStyles.chartsGrid}>
                  <ByPersonChart expenses={monthExpenses} />
                </div>
              </>
            )}

            {analyticsTab === 'savings' && (
              <div style={sharedStyles.chartsGrid}>
                <SavingsByCategoryChart savings={monthSavings} />
                {/* PERF-03: SavingsTrendChart uses backend trend endpoint */}
                <SavingsTrendChart />
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals — key forces remount so initial state is derived from props at mount time */}
      <ExpenseModal
        key={`expense-${modalOpen ? (editing?.id ?? cloning?.id ?? 'new') : 'closed'}-${defaultCostType}`}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setCloning(null); }}
        onSave={handleSave}
        cardTypes={cardTypes}
        onAddCard={addCardType}
        onRemoveCard={removeCardType}
        expenseCategories={expenseCategories}
        onAddCategory={addExpenseCategory}
        onRemoveCategory={removeExpenseCategory}
        onRenameCategory={async (oldName, newName) => {
          try { await renameExpenseCategory(oldName, newName); showToast('Category renamed.'); }
          catch (err) { showToast(`Error: ${err.message ?? 'Could not rename category.'}`); }
        }}
        editing={editing}
        cloning={cloning}
        defaultCostType={defaultCostType}
        people={people}
      />
      <SavingModal
        key={`saving-${savingModalOpen ? (editingSaving?.id ?? cloningsSaving?.id ?? 'new') : 'closed'}`}
        open={savingModalOpen}
        onClose={() => { setSavingModalOpen(false); setCloningsSaving(null); }}
        onSave={handleSaveSaving}
        cardTypes={cardTypes}
        onAddCard={addCardType}
        onRemoveCard={removeCardType}
        savingCategories={savingCategories}
        onAddCategory={addSavingCategory}
        onRemoveCategory={removeSavingCategory}
        onRenameCategory={async (oldName, newName) => {
          try { await renameSavingCategory(oldName, newName); showToast('Category renamed.'); }
          catch (err) { showToast(`Error: ${err.message ?? 'Could not rename category.'}`); }
        }}
        editing={editingSaving}
        cloning={cloningsSaving}
      />
      <IncomeEntryModal
        key={`income-${incomeModalOpen ? (editingIncomeEntry?.id ?? 'new') : 'closed'}`}
        open={incomeModalOpen}
        entry={editingIncomeEntry}
        monthKey={monthKey}
        onSave={handleSaveIncome}
        onClose={() => setIncomeModalOpen(false)}
      />
    </>
  );
}

// ── Income Banner ─────────────────────────────────────────────────────────────
function IncomeBanner({ income, entries, onAdd, onEdit, onDelete }) {
  return (
    <div style={s.incomeBanner}>
      <div style={s.incomeTop}>
        <div style={s.incomeLeft}>
          <span style={s.incomeIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
            </svg>
          </span>
          <div>
            <div style={s.incomeTitle}>Monthly Income</div>
            <div style={s.incomeValue}>
              {income > 0 ? fmtCOP(income) : <span style={s.incomeEmpty}>No income — add an entry</span>}
            </div>
          </div>
        </div>
        <button style={s.incomeAddBtn} onClick={onAdd} title="Add income entry">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
      </div>
      {entries.length > 0 && (
        <div style={s.incomeEntries}>
          {entries.map(entry => (
            <div key={entry.id} style={s.incomeEntry}>
              <div style={s.incomeEntryLeft}>
                <span style={s.incomeTypeBadge}>{entry.incomeType}</span>
                <span style={s.incomeEntryDesc}>{entry.description}</span>
                {entry.currency === 'USD' && (
                  <span style={s.incomeUsdNote}>USD {entry.originalAmount?.toLocaleString()} × {entry.exchangeRate?.toLocaleString()}</span>
                )}
              </div>
              <div style={s.incomeEntryRight}>
                <span style={s.incomeEntryCop}>{fmtCOP(entry.amountCop)}</span>
                <button style={s.incomeEntryBtn} onClick={() => onEdit(entry)} title="Edit">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
                <button style={{ ...s.incomeEntryBtn, color: 'var(--danger)' }} onClick={() => onDelete(entry.id)} title="Delete">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Small shared components ───────────────────────────────────────────────────
function SummaryCard({ label, value, color }) {
  return (
    <div style={sharedStyles.surfaceCard}>
      <div style={sharedStyles.cardLabel}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: color ?? 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function TabBtn({ label, active, onClick, color }) {
  const activeColor = color ?? 'var(--accent)';
  return (
    <button
      style={{ ...sharedStyles.tabBtn, ...(active ? { background: activeColor, color: '#fff', fontWeight: 600 } : {}) }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function SubTabBtn({ label, active, onClick }) {
  return (
    <button
      style={{ ...sharedStyles.subTabBtn, ...(active ? sharedStyles.subTabBtnActive : {}) }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function RateCard({ label, value, color }) {
  return (
    <div style={s.rateCard}>
      <div style={{ ...s.rateValue, color }}>{value}</div>
      <div style={s.rateLabel}>{label}</div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = {
  main: {
    maxWidth: 1000,
    margin: '0 auto',
    padding: '28px 24px 80px',
  },
  monthBar: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
  },
  monthLabel: {
    fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px',
    flex: 1, display: 'flex', alignItems: 'center', gap: 10,
  },
  incomeBanner: {
    background: 'var(--surface)', borderRadius: 'var(--radius-md)',
    padding: '16px 20px', boxShadow: 'var(--shadow-sm)', marginBottom: 16,
  },
  incomeTop: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  incomeLeft: {
    display: 'flex', alignItems: 'center', gap: 14, flex: 1,
  },
  incomeIcon: {
    width: 40, height: 40, borderRadius: '50%',
    background: 'var(--accent-light)', color: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  incomeTitle: {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.6px', color: 'var(--text-secondary)', marginBottom: 4,
  },
  incomeValue: {
    fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--accent)',
  },
  incomeEmpty: {
    fontSize: 15, fontWeight: 500, color: 'var(--text-tertiary)',
  },
  incomeAddBtn: {
    width: 34, height: 34, borderRadius: '50%', border: '1.5px solid var(--border)',
    background: 'var(--surface)', color: 'var(--accent)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  incomeEntries: {
    marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10,
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  incomeEntry: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 0',
  },
  incomeEntryLeft: {
    display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0,
  },
  incomeTypeBadge: {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
    padding: '2px 7px', borderRadius: 10, background: 'var(--accent-light)', color: 'var(--accent)', flexShrink: 0,
  },
  incomeEntryDesc: {
    fontSize: 13, color: 'var(--text-primary)', fontWeight: 500,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  incomeUsdNote: {
    fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0,
  },
  incomeEntryRight: {
    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
  },
  incomeEntryCop: {
    fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
  },
  incomeEntryBtn: {
    width: 28, height: 28, borderRadius: '50%',
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0, padding: 0,
    color: 'var(--text-secondary)', transition: 'background 0.15s',
  },
  rateStrip: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16,
  },
  rateCard: {
    background: 'var(--surface)', borderRadius: 'var(--radius-md)',
    padding: '20px', boxShadow: 'var(--shadow-sm)', textAlign: 'center',
  },
  rateValue: {
    fontSize: 36, fontWeight: 800, letterSpacing: '-1.5px',
  },
  rateLabel: {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.6px', color: 'var(--text-secondary)', marginTop: 6,
  },
};
