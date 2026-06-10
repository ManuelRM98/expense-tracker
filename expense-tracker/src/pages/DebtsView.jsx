import DebtsPage from '../components/DebtsPage';

/**
 * DEBT-02: Route-level component for /debts.
 * Debt operations are passed down from App.jsx (single useDebts instance)
 * to avoid a second fetch when a user also adds debts from the ExpenseModal.
 */
export default function DebtsView({
  debts,
  onAdd, onUpdate, onDelete,
  onAddPayment, onUpdatePayment, onDeletePayment,
}) {
  return (
    <DebtsPage
      debts={debts}
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onAddPayment={onAddPayment}
      onUpdatePayment={onUpdatePayment}
      onDeletePayment={onDeletePayment}
    />
  );
}
