import { useNavigate } from 'react-router-dom';
import CategoriesSettingsPage from '../components/CategoriesSettingsPage';

/**
 * FEAT-12: Route-level component for /settings/categories.
 */
export default function CategoriesView({
  expenseCategoryObjects,
  savingCategoryObjects,
  onAddExpenseCategory,
  onRemoveExpenseCategory,
  onRenameExpenseCategory,
  onUpdateExpenseCategoryColor,
  onAddSavingCategory,
  onRemoveSavingCategory,
  onRenameSavingCategory,
  onUpdateSavingCategoryColor,
}) {
  const navigate = useNavigate();
  return (
    <CategoriesSettingsPage
      expenseCategoryObjects={expenseCategoryObjects}
      savingCategoryObjects={savingCategoryObjects}
      onAddExpenseCategory={onAddExpenseCategory}
      onRemoveExpenseCategory={onRemoveExpenseCategory}
      onRenameExpenseCategory={onRenameExpenseCategory}
      onUpdateExpenseCategoryColor={onUpdateExpenseCategoryColor}
      onAddSavingCategory={onAddSavingCategory}
      onRemoveSavingCategory={onRemoveSavingCategory}
      onRenameSavingCategory={onRenameSavingCategory}
      onUpdateSavingCategoryColor={onUpdateSavingCategoryColor}
      onBack={() => navigate('/settings')}
    />
  );
}
