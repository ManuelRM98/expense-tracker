import { useNavigate } from 'react-router-dom';
import CardsSettingsPage from '../components/CardsSettingsPage';

/**
 * DEBT-02: Route-level component for /settings/cards.
 */
export default function CardsView({ cardTypes, onAddCard, onRemoveCard, onUpdateCardCutOff, onUpdateCardColor, onRenameCard }) {
  const navigate = useNavigate();
  return (
    <CardsSettingsPage
      cardTypes={cardTypes}
      onAddCard={onAddCard}
      onRemoveCard={onRemoveCard}
      onUpdateCardCutOff={onUpdateCardCutOff}
      onUpdateCardColor={onUpdateCardColor}
      onRenameCard={onRenameCard}
      onBack={() => navigate('/settings')}
    />
  );
}
