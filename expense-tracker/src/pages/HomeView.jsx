import { useState, useEffect } from 'react';
import AnnualDashboard from '../components/AnnualDashboard';

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
}) {
  const [annualYear, setAnnualYear] = useState(now.getFullYear());

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

  return (
    <AnnualDashboard
      year={annualYear}
      expenses={expenses}
      savings={savings}
      getIncome={getIncome}
      onPrevYear={() => setAnnualYear(y => y - 1)}
      onNextYear={() => setAnnualYear(y => y + 1)}
    />
  );
}
