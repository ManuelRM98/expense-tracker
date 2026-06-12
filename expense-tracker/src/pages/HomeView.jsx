import { useState, useEffect } from 'react';
import AnnualDashboard from '../components/AnnualDashboard';
import ExpenseModal from '../components/ExpenseModal';

const now = new Date();

/**
 * DEBT-02: Route-level component for the home/annual dashboard view (path: /).
 *
 * FINDING 2: triggers loads for all 12 months of the selected year so
 * AnnualDashboard always has data regardless of which months were previously
 * visited. loadExpensesForMonth/loadSavingsForMonth are cached/deduped inside
 * their hooks (fetched-month refs), so revisiting months is a no-op.
 */
export default function HomeView({
  getIncome,
  expensesByMonth, savingsByMonth,
  loadExpensesForMonth, loadSavingsForMonth,
  fetchIncomeForYear,
  // Header "Add Expense" integration
  addRef,
  addExpense,
  cardTypes,
  addCardType,
  removeCardType,
  expenseCategories,
  addExpenseCategory,
  removeExpenseCategory,
  renameExpenseCategory,
  people,
  showToast,
  addDebt,
}) {
  const [annualYear, setAnnualYear] = useState(now.getFullYear());
  const [modalOpen, setModalOpen]   = useState(false);

  // Register the header callback each render so the closure stays fresh.
  // Intentionally runs every render (no dependency array) — mirrors MonthView's pattern.
  useEffect(() => {
    if (addRef) {
      addRef.current = () => setModalOpen(true);
    }
    return () => { if (addRef) addRef.current = null; };
  });

  // Trigger loads for all 12 months of the selected year.
  // The hooks deduplicate via internal refs so this is cheap on revisit.
  useEffect(() => {
    fetchIncomeForYear(annualYear);
    for (let m = 1; m <= 12; m++) {
      const monthKey = `${annualYear}-${String(m).padStart(2, '0')}`;
      loadExpensesForMonth(monthKey);
      loadSavingsForMonth(monthKey);
    }
  }, [annualYear, fetchIncomeForYear, loadExpensesForMonth, loadSavingsForMonth]);

  // Build flat arrays from month-scoped caches for AnnualDashboard
  const expenses = Object.values(expensesByMonth).flat();
  const savings  = Object.values(savingsByMonth).flat();

  // QUAL-01: async handler with try/catch + toast, matching MonthView's add branch.
  async function handleSave({ debtEntries, ...data }) {
    try {
      const created = await addExpense(data);
      const expenseId = created?.id;
      showToast('Expense added.');
      // Mirror MonthView's debt-linking logic exactly: create a debt entry for
      // each debtEntry that was filled in by the user in ExpenseModal.
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
      setModalOpen(false);
    } catch (err) {
      showToast(`Error: ${err.message ?? 'Could not save expense.'}`);
    }
  }

  return (
    <>
      <AnnualDashboard
        year={annualYear}
        expenses={expenses}
        savings={savings}
        getIncome={getIncome}
        onPrevYear={() => setAnnualYear(y => y - 1)}
        onNextYear={() => setAnnualYear(y => y + 1)}
      />

      {/* ExpenseModal — add-only (no editing/cloning on the annual view) */}
      <ExpenseModal
        key={`home-expense-${modalOpen ? 'new' : 'closed'}`}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        cardTypes={cardTypes ?? []}
        onAddCard={addCardType}
        onRemoveCard={removeCardType}
        expenseCategories={expenseCategories ?? []}
        onAddCategory={addExpenseCategory}
        onRemoveCategory={removeExpenseCategory}
        onRenameCategory={async (oldName, newName) => {
          try { await renameExpenseCategory(oldName, newName); showToast('Category renamed.'); }
          catch (err) { showToast(`Error: ${err.message ?? 'Could not rename category.'}`); }
        }}
        editing={null}
        cloning={null}
        defaultCostType=""
        people={people ?? []}
      />
    </>
  );
}
