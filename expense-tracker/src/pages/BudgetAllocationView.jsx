import { useNavigate } from 'react-router-dom';
import BudgetAllocationPage from '../components/BudgetAllocationPage';

/**
 * DEBT-02: Route-level component for /settings/budget.
 * STATE-04: derives knownMonthKeys from BOTH income entries AND expenses.
 */
export default function BudgetAllocationView({
  defaultBudget,
  baseSalary,
  saveDefaultBudget,
  incomeEntries,
  expensesByMonth,
}) {
  const navigate = useNavigate();

  function handleSaveDefault(pcts) {
    // STATE-04: derive known months from BOTH income entries AND expenses
    // (effective month = billingMonth ?? date[:7]) to catch months with no income entry
    const fromIncome   = incomeEntries.map(e => e.monthKey);
    const allExpenses  = Object.values(expensesByMonth).flat();
    const fromExpenses = allExpenses.map(e => e.billingMonth ?? e.date.substring(0, 7));
    const knownMonthKeys = [...new Set([...fromIncome, ...fromExpenses])];
    return saveDefaultBudget(pcts, knownMonthKeys);
  }

  return (
    <BudgetAllocationPage
      defaultBudget={defaultBudget}
      baseSalary={baseSalary}
      onSaveDefault={handleSaveDefault}
      onBack={() => navigate('/settings')}
    />
  );
}
