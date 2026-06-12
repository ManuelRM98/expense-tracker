import { useNavigate } from 'react-router-dom';
import SettingsPage from '../components/SettingsPage';

/**
 * DEBT-02: Route-level component for /settings.
 */
export default function SettingsView({ darkMode, onToggleDark }) {
  const navigate = useNavigate();
  return (
    <SettingsPage
      darkMode={darkMode}
      onToggleDark={onToggleDark}
      onOpenPermanent={() => navigate('/settings/fixed-expenses')}
      onOpenGlobalSalary={() => navigate('/settings/salary')}
      onOpenBudgetAllocation={() => navigate('/settings/budget')}
      onOpenCards={() => navigate('/settings/cards')}
      onOpenCategories={() => navigate('/settings/categories')}
    />
  );
}
