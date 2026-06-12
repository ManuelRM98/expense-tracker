import { useNavigate } from 'react-router-dom';
import FixedExpensesPage from '../components/FixedExpensesPage';
import { useFixedExpenses } from '../hooks/useFixedExpenses';

/**
 * DEBT-02: Route-level component for /settings/fixed-expenses.
 * Owns its own useFixedExpenses hook.
 */
export default function FixedExpensesView({
  cardTypes, cardColors, addCardType, removeCardType,
  expenseCategories, expenseCategoryColors, addExpenseCategory, removeExpenseCategory, renameExpenseCategory,
  showToast,
}) {
  const navigate = useNavigate();
  const {
    templates,
    addTemplate, updateTemplate, deleteTemplate, toggleTemplate,
  } = useFixedExpenses();

  return (
    <FixedExpensesPage
      templates={templates}
      onAdd={addTemplate}
      onUpdate={updateTemplate}
      onDelete={deleteTemplate}
      onToggle={toggleTemplate}
      cardTypes={cardTypes}
      cardColors={cardColors}
      onAddCard={addCardType}
      onRemoveCard={removeCardType}
      expenseCategories={expenseCategories}
      expenseCategoryColors={expenseCategoryColors}
      onAddCategory={addExpenseCategory}
      onRemoveCategory={removeExpenseCategory}
      onRenameCategory={async (oldName, newName) => {
        try { await renameExpenseCategory(oldName, newName); showToast('Category renamed.'); }
        catch (err) { showToast(`Error: ${err.message ?? 'Could not rename category.'}`); }
      }}
      showToast={showToast}
      onBack={() => navigate('/settings')}
    />
  );
}
