import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useExpenses } from './hooks/useExpenses';
import { useFixedExpenses } from './hooks/useFixedExpenses';
import { useBudget } from './hooks/useBudget';
import { fmtCOP, MONTH_NAMES } from './utils/format';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AnnualDashboard from './components/AnnualDashboard';
import ExpenseModal from './components/ExpenseModal';
import ExpenseTable from './components/ExpenseTable';
import SavingModal from './components/SavingModal';
import SavingTable from './components/SavingTable';
import FixedExpensesPage from './components/FixedExpensesPage';
import SettingsPage from './components/SettingsPage';
import CardsSettingsPage from './components/CardsSettingsPage';
import GlobalSalaryPage from './components/GlobalSalaryPage';
import BudgetAllocationPage from './components/BudgetAllocationPage';
import BudgetCards from './components/BudgetCards';
import IncomeEntryModal from './components/IncomeEntryModal';
import ConfirmDialog from './components/ConfirmDialog';
import {
  CardVsCashChart,
  ByCardTypeChart,
  ByPersonChart,
  MonthlyTrendChart,
  ExpensesByCategoryChart,
  FixedVsVariableChart,
  IncomeBreakdownChart,
  SavingsByCategoryChart,
  SavingsTrendChart,
} from './components/Charts';

const now = new Date();

const MONTH_URL_NAMES = [
  'january','february','march','april','may','june',
  'july','august','september','october','november','december',
];

function parseMonthFromPath(path) {
  const parts = path.split('/').filter(Boolean);
  if (parts.length >= 2 && !isNaN(parseInt(parts[0]))) {
    const y = parseInt(parts[0]);
    const m = MONTH_URL_NAMES.indexOf(parts[1].toLowerCase());
    if (!isNaN(y) && m !== -1) return { year: y, month: m };
  }
  return { year: now.getFullYear(), month: now.getMonth() };
}

export default function App() {
  const {
    expenses, cardTypes, expenseCategories,
    addExpense, bulkAddExpenses, updateExpense, deleteExpense, addCardType, removeCardType, updateCardCutOff, addExpenseCategory, removeExpenseCategory,
    savings, savingCategories,
    addSaving, updateSaving, deleteSaving, addSavingCategory, removeSavingCategory,
    incomeEntries, baseSalary, saveBaseSalary,
    getIncome, getIncomeEntries,
    addIncomeEntry, updateIncomeEntry, deleteIncomeEntry,
    ensureSalaryForMonth,
  } = useExpenses();

  const {
    templates,
    addTemplate, updateTemplate, deleteTemplate, toggleTemplate,
    generateForMonth,
  } = useFixedExpenses();

  const {
    defaultBudget,
    getBudgetForMonth,
    saveDefaultBudget,
    saveMonthBudget,
    clearMonthBudget,
    loadMonthBudget,
  } = useBudget();

  const navigate = useNavigate();
  const location = useLocation();

  // Derive current view from URL path
  const pathParts = location.pathname.split('/').filter(Boolean);
  const isMonthPath = pathParts.length >= 2
    && !isNaN(parseInt(pathParts[0]))
    && MONTH_URL_NAMES.includes(pathParts[1]?.toLowerCase());
  const view = isMonthPath                                                  ? 'month'
    : pathParts[0] === 'settings' && pathParts[1] === 'fixed-expenses'    ? 'permanentFixed'
    : pathParts[0] === 'settings' && pathParts[1] === 'salary'            ? 'globalSalary'
    : pathParts[0] === 'settings' && pathParts[1] === 'budget'            ? 'budgetAllocation'
    : pathParts[0] === 'settings' && pathParts[1] === 'cards'             ? 'cards'
    : pathParts[0] === 'settings'                                          ? 'settings'
    : 'home';

  // Initialize from URL so there's no flash on first load when deep-linking
  const initialMonth = parseMonthFromPath(location.pathname);
  const [viewYear,  setViewYear]  = useState(initialMonth.year);
  const [viewMonth, setViewMonth] = useState(initialMonth.month);
  const [annualYear, setAnnualYear] = useState(now.getFullYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [cloning,   setCloning]   = useState(null);
  const [defaultCostType, setDefaultCostType] = useState('');
  const [savingModalOpen, setSavingModalOpen] = useState(false);
  const [editingSaving,   setEditingSaving]   = useState(null);
  const [cloningsSaving,  setCloningsSaving]  = useState(null);
  const [toast,      setToast]     = useState('');
  const [toastTimer, setToastTimer] = useState(null);
  const [activeTab,    setActiveTab]    = useState('expenses'); // 'expenses' | 'savings' | 'charts'
  const [analyticsTab, setAnalyticsTab] = useState('overview'); // 'overview' | 'expenses' | 'savings'
  const [darkMode,   setDarkMode]  = useState(() => localStorage.getItem('theme') === 'dark');

  // Income entry modal state
  const [incomeModalOpen,    setIncomeModalOpen]    = useState(false);
  const [editingIncomeEntry, setEditingIncomeEntry] = useState(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Sync viewYear/viewMonth state when the URL changes (e.g. browser back/forward)
  useEffect(() => {
    if (view === 'month') {
      const y = parseInt(pathParts[0]);
      const m = MONTH_URL_NAMES.indexOf(pathParts[1]?.toLowerCase());
      if (!isNaN(y) && m !== -1 && (y !== viewYear || m !== viewMonth)) {
        setViewYear(y);
        setViewMonth(m);
      }
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Month key ────────────────────────────────────────────
  const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  // ── Auto-generate permanent fixed expenses + salary ──────
  useEffect(() => {
    generateForMonth(monthKey, bulkAddExpenses);
    ensureSalaryForMonth(monthKey);
    loadMonthBudget(monthKey);
  }, [monthKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Month filter ─────────────────────────────────────────
  const monthExpenses = useMemo(() =>
    expenses.filter(e => {
      const key = e.billingMonth ?? e.date.substring(0, 7);
      const [y, m] = key.split('-');
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
  const income        = getIncome(monthKey);
  const totalExp      = monthExpenses.reduce((s, e) => s + e.price, 0);
  const totalSav      = monthSavings.reduce((s, sv) => s + sv.price, 0);
  const remaining     = income - totalExp - totalSav;
  const cardTotal     = monthExpenses.filter(e => e.cardPay === 'Yes').reduce((s, e) => s + e.price, 0);
  const cashTotal     = totalExp - cardTotal;
  const totalFixed    = monthExpenses.filter(e => e.costType === 'fixed').reduce((s, e) => s + e.price, 0);
  const totalVariable = monthExpenses.filter(e => e.costType !== 'fixed').reduce((s, e) => s + e.price, 0);
  const monthBudget   = getBudgetForMonth(monthKey);

  // ── Navigation ───────────────────────────────────────────
  function goHome() {
    navigate('/');
  }

  function goToMonth(year, month) {
    navigate(`/${year}/${MONTH_URL_NAMES[month]}`);
  }

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

  // ── Confirm dialog helper ────────────────────────────────
  function askConfirm({ title, message, onConfirm }) {
    setConfirmDialog({ open: true, title, message, onConfirm });
  }
  function closeConfirm() {
    setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
  }

  // ── Toast ────────────────────────────────────────────────
  function showToast(msg) {
    setToast(msg);
    if (toastTimer) clearTimeout(toastTimer);
    const t = setTimeout(() => setToast(''), 2400);
    setToastTimer(t);
  }

  // ── Expense CRUD ─────────────────────────────────────────
  function openAdd(costType = '') { setDefaultCostType(costType); setEditing(null); setCloning(null); setModalOpen(true); }
  function openAddFixed() { openAdd('fixed'); }
  function openEdit(exp) { setDefaultCostType(''); setEditing(exp); setCloning(null); setModalOpen(true); }
  function openCloneExpense(exp) { setDefaultCostType(''); setEditing(null); setCloning(exp); setModalOpen(true); }

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
    askConfirm({
      title: 'Delete expense',
      message: 'This action cannot be undone.',
      onConfirm: () => { closeConfirm(); deleteExpense(id); showToast('Expense deleted.'); },
    });
  }

  // ── Saving CRUD ──────────────────────────────────────────
  function openAddSaving() { setEditingSaving(null); setCloningsSaving(null); setSavingModalOpen(true); }
  function openEditSaving(sv) { setEditingSaving(sv); setCloningsSaving(null); setSavingModalOpen(true); }
  function openCloneSaving(sv) { setEditingSaving(null); setCloningsSaving(sv); setSavingModalOpen(true); }

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
    askConfirm({
      title: 'Delete saving',
      message: 'This action cannot be undone.',
      onConfirm: () => { closeConfirm(); deleteSaving(id); showToast('Saving deleted.'); },
    });
  }

  // ── Income entries ───────────────────────────────────────
  function openAddIncome() { setEditingIncomeEntry(null); setIncomeModalOpen(true); }
  function openEditIncome(entry) { setEditingIncomeEntry(entry); setIncomeModalOpen(true); }

  async function handleSaveIncome(data) {
    if (editingIncomeEntry) {
      await updateIncomeEntry(editingIncomeEntry.id, data);
    } else {
      await addIncomeEntry(data);
    }
    setIncomeModalOpen(false);
  }

  async function handleDeleteIncome(id) {
    askConfirm({
      title: 'Delete income entry',
      message: 'This action cannot be undone.',
      onConfirm: async () => { closeConfirm(); await deleteIncomeEntry(id); },
    });
  }

  // ── Header button ────────────────────────────────────────
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const headerAction = (view === 'month' && activeTab === 'savings')
    ? { label: 'Add Saving', fn: openAddSaving, color: 'var(--savings)' }
    : { label: 'Add Expense', fn: openAdd, color: 'var(--accent)' };

  return (
    <>
      <Header
        onAdd={headerAction.fn}
        addLabel={headerAction.label}
        btnColor={headerAction.color}
        onHome={goHome}
      />

      <div style={s.layout}>
        <Sidebar
          view={view}
          viewYear={viewYear}
          viewMonth={viewMonth}
          onHome={goHome}
          onSelectMonth={goToMonth}
          expenses={expenses}
          savings={savings}
          onOpenSettings={() => navigate('/settings')}
        />

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

          {/* ── Settings ── */}
          {view === 'settings' && (
            <SettingsPage
              darkMode={darkMode}
              onToggleDark={() => setDarkMode(d => !d)}
              onOpenPermanent={() => navigate('/settings/fixed-expenses')}
              onOpenGlobalSalary={() => navigate('/settings/salary')}
              onOpenBudgetAllocation={() => navigate('/settings/budget')}
              onOpenCards={() => navigate('/settings/cards')}
            />
          )}

          {/* ── Cards Settings ── */}
          {view === 'cards' && (
            <CardsSettingsPage
              cardTypes={cardTypes}
              onAddCard={addCardType}
              onRemoveCard={removeCardType}
              onUpdateCardCutOff={updateCardCutOff}
              onBack={() => navigate('/settings')}
            />
          )}

          {/* ── Budget Allocation ── */}
          {view === 'budgetAllocation' && (
            <BudgetAllocationPage
              defaultBudget={defaultBudget}
              baseSalary={baseSalary}
              onSaveDefault={(pcts) => {
                const knownMonthKeys = [...new Set(incomeEntries.map(e => e.monthKey))];
                return saveDefaultBudget(pcts, knownMonthKeys);
              }}
              onBack={() => navigate('/settings')}
            />
          )}

          {/* ── Global Salary ── */}
          {view === 'globalSalary' && (
            <GlobalSalaryPage
              baseSalary={baseSalary}
              onSave={saveBaseSalary}
              onBack={() => navigate('/settings')}
            />
          )}

          {/* ── Permanent Fixed Costs ── */}
          {view === 'permanentFixed' && (
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
              onBack={() => navigate('/settings')}
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
                  <button style={s.incomeAddBtn} onClick={openAddIncome} title="Add income entry">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </button>
                </div>
                {/* Entries list */}
                {getIncomeEntries(monthKey).length > 0 && (
                  <div style={s.incomeEntries}>
                    {getIncomeEntries(monthKey).map(entry => (
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
                          <button style={s.incomeEntryBtn} onClick={() => openEditIncome(entry)} title="Edit">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                          </button>
                          <button style={{ ...s.incomeEntryBtn, color: 'var(--danger)' }} onClick={() => handleDeleteIncome(entry.id)} title="Delete">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
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
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onClone={openCloneExpense}
                    onAddFixed={openAddFixed}
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
                  <div style={s.subTabBar}>
                    <SubTabBtn label="Overview" active={analyticsTab === 'overview'} onClick={() => setAnalyticsTab('overview')} />
                    <SubTabBtn label="Expenses" active={analyticsTab === 'expenses'} onClick={() => setAnalyticsTab('expenses')} />
                    <SubTabBtn label="Savings"  active={analyticsTab === 'savings'}  onClick={() => setAnalyticsTab('savings')} />
                  </div>

                  {analyticsTab === 'overview' && (
                    <>
                      {income > 0 && (
                        <div style={s.rateStrip}>
                          <RateCard label="Expense Rate" value={`${Math.round((totalExp / income) * 100)}%`} color="var(--danger)" />
                          <RateCard label="Savings Rate" value={`${Math.round((totalSav / income) * 100)}%`} color="var(--savings)" />
                          <RateCard label="Free Cash"    value={`${Math.max(0, Math.round(((income - totalExp - totalSav) / income) * 100))}%`} color="var(--accent)" />
                        </div>
                      )}
                      <div style={s.chartsGrid}>
                        <IncomeBreakdownChart income={income} totalExp={totalExp} totalSav={totalSav} />
                        <MonthlyTrendChart expenses={expenses} />
                      </div>
                    </>
                  )}

                  {analyticsTab === 'expenses' && (
                    <>
                      <div style={s.chartsGrid}>
                        <ExpensesByCategoryChart expenses={monthExpenses} />
                        <FixedVsVariableChart expenses={monthExpenses} />
                      </div>
                      <div style={s.chartsGrid}>
                        <CardVsCashChart expenses={monthExpenses} />
                        <ByCardTypeChart expenses={monthExpenses} />
                      </div>
                      <div style={s.chartsGrid}>
                        <ByPersonChart expenses={monthExpenses} />
                      </div>
                    </>
                  )}

                  {analyticsTab === 'savings' && (
                    <div style={s.chartsGrid}>
                      <SavingsByCategoryChart savings={monthSavings} />
                      <SavingsTrendChart savings={savings} />
                    </div>
                  )}
                </>
              )}
            </main>
          )}
        </div>
      </div>

      {/* Modals */}
      <ExpenseModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setCloning(null); }}
        onSave={handleSave}
        cardTypes={cardTypes}
        onAddCard={addCardType}
        onRemoveCard={removeCardType}
        expenseCategories={expenseCategories}
        onAddCategory={addExpenseCategory}
        onRemoveCategory={removeExpenseCategory}
        editing={editing}
        cloning={cloning}
        defaultCostType={defaultCostType}
      />
      <SavingModal
        open={savingModalOpen}
        onClose={() => { setSavingModalOpen(false); setCloningsSaving(null); }}
        onSave={handleSaveSaving}
        cardTypes={cardTypes}
        onAddCard={addCardType}
        onRemoveCard={removeCardType}
        savingCategories={savingCategories}
        onAddCategory={addSavingCategory}
        onRemoveCategory={removeSavingCategory}
        editing={editingSaving}
        cloning={cloningsSaving}
      />
      <IncomeEntryModal
        open={incomeModalOpen}
        entry={editingIncomeEntry}
        monthKey={monthKey}
        onSave={handleSaveIncome}
        onClose={() => setIncomeModalOpen(false)}
      />
      {toast && <div style={s.toast}>{toast}</div>}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
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

function SubTabBtn({ label, active, onClick }) {
  return (
    <button
      style={{ ...s.subTabBtn, ...(active ? s.subTabBtnActive : {}) }}
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
    background: 'var(--surface)', borderRadius: 'var(--radius-md)',
    padding: '16px 20px', boxShadow: 'var(--shadow-sm)',
    marginBottom: 16,
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
  incomeAddBtn: {
    width: 34, height: 34, borderRadius: '50%', border: '1.5px solid var(--border)',
    background: 'var(--surface)', color: 'var(--accent)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  incomeEntries: {
    marginTop: 12,
    borderTop: '1px solid var(--border)',
    paddingTop: 10,
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  incomeEntry: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, padding: '6px 0',
  },
  incomeEntryLeft: {
    display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0,
  },
  incomeTypeBadge: {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
    padding: '2px 7px', borderRadius: 10,
    background: 'var(--accent-light)', color: 'var(--accent)',
    flexShrink: 0,
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
    width: 26, height: 26, borderRadius: '50%', border: 'none',
    background: 'transparent', color: 'var(--text-tertiary)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
  subTabBar: {
    display: 'flex',
    gap: 0,
    marginBottom: 20,
    borderBottom: '1.5px solid var(--border)',
  },
  subTabBtn: {
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
  },
  subTabBtnActive: {
    color: 'var(--accent)',
    fontWeight: 600,
    borderBottomColor: 'var(--accent)',
  },
  rateStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 14,
    marginBottom: 16,
  },
  rateCard: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    boxShadow: 'var(--shadow-sm)',
    textAlign: 'center',
  },
  rateValue: {
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: '-1.5px',
  },
  rateLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    color: 'var(--text-secondary)',
    marginTop: 6,
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
