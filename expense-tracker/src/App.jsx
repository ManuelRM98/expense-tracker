import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { useAppData } from './hooks/useAppData';
import { useFixedExpenses } from './hooks/useFixedExpenses';
import { useBudget } from './hooks/useBudget';
import { useDebts } from './hooks/useDebts';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ConfirmDialog from './components/ConfirmDialog';

// Route-level page components (DEBT-02)
import HomeView            from './pages/HomeView';
import MonthView           from './pages/MonthView';
import DebtsView           from './pages/DebtsView';
import SettingsView        from './pages/SettingsView';
import CardsView           from './pages/CardsView';
import BudgetAllocationView from './pages/BudgetAllocationView';
import GlobalSalaryView    from './pages/GlobalSalaryView';
import FixedExpensesView   from './pages/FixedExpensesView';

const MONTH_URL_NAMES = [
  'january','february','march','april','may','june',
  'july','august','september','october','november','december',
];

/**
 * QUAL-05: single URL-parsing function — determines the "view" name and
 * whether we are in the month view, for the benefit of Header and Sidebar.
 */
function parsePath(path) {
  const parts = path.split('/').filter(Boolean);
  if (parts.length >= 2 && !isNaN(parseInt(parts[0]))) {
    const y = parseInt(parts[0]);
    const m = MONTH_URL_NAMES.indexOf(parts[1]?.toLowerCase());
    if (!isNaN(y) && m !== -1) {
      return { view: 'month', isMonthPath: true, parts };
    }
  }
  const view = parts[0] === 'settings' && parts[1] === 'fixed-expenses' ? 'permanentFixed'
    : parts[0] === 'settings' && parts[1] === 'salary'                  ? 'globalSalary'
    : parts[0] === 'settings' && parts[1] === 'budget'                  ? 'budgetAllocation'
    : parts[0] === 'settings' && parts[1] === 'cards'                   ? 'cards'
    : parts[0] === 'settings'                                            ? 'settings'
    : parts[0] === 'debts'                                               ? 'debts'
    : 'home';
  return { view, isMonthPath: false, parts };
}

/**
 * DEBT-02 + DEP-06: App.jsx reduced to layout shell + route table.
 * Each view is a separate <Route> / page component.
 * Shared state (toast, confirm, dark mode) stays here.
 * All data hooks live in useAppData (DEBT-03).
 */
export default function App() {
  const appData = useAppData();
  const { generateForMonth } = useFixedExpenses();
  const budgetHook = useBudget();
  const debtsHook  = useDebts();

  const navigate = useNavigate();
  const location = useLocation();

  // ── Dark mode ──────────────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // ── Toast (BUG-05: useRef avoids stale-closure and extra renders) ──────────
  const [toast, setToast] = useState('');
  const toastTimerRef     = useRef(null);

  function showToast(msg) {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 2400);
  }

  // ── Confirm dialog ─────────────────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });

  function askConfirm({ title, message, onConfirm }) {
    setConfirmDialog({ open: true, title, message, onConfirm });
  }
  function closeConfirm() {
    setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
  }

  // ── Navigation helpers ─────────────────────────────────────────────────────
  function goHome()                { navigate('/'); }
  function goToMonth(year, month)  { navigate(`/${year}/${MONTH_URL_NAMES[month]}`); }

  // ── Derive view name + month info for Header/Sidebar ────────────────────────
  const { view, isMonthPath, parts: pathParts } = parsePath(location.pathname);

  // Extract year/month for Sidebar highlight
  const sidebarYear  = isMonthPath ? parseInt(pathParts[0]) : NaN;
  const sidebarMonth = isMonthPath ? MONTH_URL_NAMES.indexOf(pathParts[1]?.toLowerCase()) : NaN;

  // ── Header action ──────────────────────────────────────────────────────────
  // Always "Add Expense" — MonthView's addRef switches to the correct modal
  // (expense vs saving) based on the active tab at call time.
  const headerAction = { label: 'Add Expense', color: 'var(--accent)' };

  // Month-view ref for triggering "add" from the header
  const monthViewAddRef = useRef(null);

  // ── Build flat arrays for Sidebar (it needs all expenses/savings for the month strip) ─
  const allExpenses = Object.values(appData.expensesByMonth).flat();
  const allSavings  = Object.values(appData.savingsByMonth).flat();

  // ── Shared mutation callbacks for debts (needed in MonthView via addDebt) ──
  const { addDebt } = debtsHook;

  // ── Cards rename + category rename wrappers (with toast) ──────────────────
  async function handleRenameCard(oldName, newName) {
    try { await appData.renameCard(oldName, newName); showToast('Card renamed.'); }
    catch (err) { showToast(`Error: ${err.message ?? 'Could not rename card.'}`); }
  }

  return (
    <>
      <Header
        onAdd={() => monthViewAddRef.current?.()}
        addLabel={headerAction.label}
        btnColor={headerAction.color}
        onHome={goHome}
      />

      <div className="app-layout">
        <Sidebar
          view={view}
          viewYear={sidebarYear}
          viewMonth={sidebarMonth}
          onHome={goHome}
          onSelectMonth={goToMonth}
          expenses={allExpenses}
          savings={allSavings}
          onOpenSettings={() => navigate('/settings')}
          onOpenDebts={() => navigate('/debts')}
        />

        <div className="app-content">
          <Routes>
            {/* Home — annual dashboard */}
            <Route path="/" element={
              <HomeView
                getIncome={appData.getIncome}
                expensesByMonth={appData.expensesByMonth}
                savingsByMonth={appData.savingsByMonth}
                loadExpensesForMonth={appData.loadExpensesForMonth}
                loadSavingsForMonth={appData.loadSavingsForMonth}
                fetchIncomeForYear={appData.fetchIncomeForYear}
              />
            } />

            {/* Month view */}
            <Route path="/:year/:monthName" element={
              <MonthView
                // Expenses
                getExpensesForMonth={appData.getExpensesForMonth}
                loadExpensesForMonth={appData.loadExpensesForMonth}
                addExpense={appData.addExpense}
                bulkAddExpenses={appData.bulkAddExpenses}
                updateExpense={appData.updateExpense}
                deleteExpense={appData.deleteExpense}
                // Savings
                getSavingsForMonth={appData.getSavingsForMonth}
                loadSavingsForMonth={appData.loadSavingsForMonth}
                addSaving={appData.addSaving}
                updateSaving={appData.updateSaving}
                deleteSaving={appData.deleteSaving}
                // Cards
                cardTypes={appData.cardTypes}
                addCardType={appData.addCardType}
                removeCardType={appData.removeCardType}
                // Categories
                expenseCategories={appData.expenseCategories}
                addExpenseCategory={appData.addExpenseCategory}
                removeExpenseCategory={appData.removeExpenseCategory}
                renameExpenseCategory={appData.renameExpenseCategory}
                savingCategories={appData.savingCategories}
                addSavingCategory={appData.addSavingCategory}
                removeSavingCategory={appData.removeSavingCategory}
                renameSavingCategory={appData.renameSavingCategory}
                // Income
                getIncome={appData.getIncome}
                getIncomeEntries={appData.getIncomeEntries}
                fetchIncomeForYear={appData.fetchIncomeForYear}
                addIncomeEntry={appData.addIncomeEntry}
                updateIncomeEntry={appData.updateIncomeEntry}
                deleteIncomeEntry={appData.deleteIncomeEntry}
                ensureSalaryForMonth={appData.ensureSalaryForMonth}
                baseSalaryLoaded={appData.baseSalaryLoaded}
                // Budget
                getBudgetForMonth={budgetHook.getBudgetForMonth}
                saveMonthBudget={budgetHook.saveMonthBudget}
                clearMonthBudget={budgetHook.clearMonthBudget}
                loadMonthBudget={budgetHook.loadMonthBudget}
                // Misc
                people={appData.people}
                generateForMonth={generateForMonth}
                addDebt={addDebt}
                // Cross-cutting
                showToast={showToast}
                askConfirm={askConfirm}
                closeConfirm={closeConfirm}
                // Allow Header's "Add" to trigger MonthView's modal
                addRef={monthViewAddRef}
              />
            } />

            {/* Debts */}
            <Route path="/debts" element={
              <DebtsView
                debts={debtsHook.debts}
                onAdd={debtsHook.addDebt}
                onUpdate={debtsHook.updateDebt}
                onDelete={debtsHook.deleteDebt}
                onAddPayment={debtsHook.addPayment}
                onUpdatePayment={debtsHook.updatePayment}
                onDeletePayment={debtsHook.deletePayment}
              />
            } />

            {/* Settings hub */}
            <Route path="/settings" element={
              <SettingsView darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} />
            } />

            {/* Cards settings */}
            <Route path="/settings/cards" element={
              <CardsView
                cardTypes={appData.cardTypes}
                onAddCard={appData.addCardType}
                onRemoveCard={appData.removeCardType}
                onUpdateCardCutOff={appData.updateCardCutOff}
                onRenameCard={handleRenameCard}
              />
            } />

            {/* Budget allocation */}
            <Route path="/settings/budget" element={
              <BudgetAllocationView
                defaultBudget={budgetHook.defaultBudget}
                baseSalary={appData.baseSalary}
                saveDefaultBudget={budgetHook.saveDefaultBudget}
                incomeEntries={appData.incomeEntries}
                expensesByMonth={appData.expensesByMonth}
              />
            } />

            {/* Global salary */}
            <Route path="/settings/salary" element={
              <GlobalSalaryView baseSalary={appData.baseSalary} saveBaseSalary={appData.saveBaseSalary} />
            } />

            {/* Fixed expenses */}
            <Route path="/settings/fixed-expenses" element={
              <FixedExpensesView
                cardTypes={appData.cardTypes}
                addCardType={appData.addCardType}
                removeCardType={appData.removeCardType}
                expenseCategories={appData.expenseCategories}
                addExpenseCategory={appData.addExpenseCategory}
                removeExpenseCategory={appData.removeExpenseCategory}
                renameExpenseCategory={appData.renameExpenseCategory}
                showToast={showToast}
              />
            } />
          </Routes>
        </div>
      </div>

      {toast && <div style={toastStyle}>{toast}</div>}
      {/* STATE-07: surface budget load error inline */}
      {budgetHook.budgetLoadError && !toast && (
        <div style={{ ...toastStyle, background: 'var(--danger)' }}>{budgetHook.budgetLoadError}</div>
      )}
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

const toastStyle = {
  position: 'fixed', bottom: 32, left: '50%',
  transform: 'translateX(-50%)',
  background: 'var(--text-primary)', color: 'var(--bg)',
  padding: '12px 22px', borderRadius: 30,
  fontSize: 14, fontWeight: 500, zIndex: 500,
  boxShadow: 'var(--shadow-md)',
  animation: 'fadeInUp .3s ease',
};
