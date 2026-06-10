import { useNavigate } from 'react-router-dom';
import GlobalSalaryPage from '../components/GlobalSalaryPage';

/**
 * DEBT-02: Route-level component for /settings/salary.
 */
export default function GlobalSalaryView({ baseSalary, saveBaseSalary }) {
  const navigate = useNavigate();
  return (
    <GlobalSalaryPage
      baseSalary={baseSalary}
      onSave={saveBaseSalary}
      onBack={() => navigate('/settings')}
    />
  );
}
