import { useState, useCallback } from 'react';
import * as api from '../services/api';

/**
 * DEBT-03: extracted from useExpenses — owns card types (add, remove, updateCutOff, rename).
 */
export function useCards({ initialCards = [] } = {}) {
  const [cardTypes, setCardTypes] = useState(initialCards);

  /** Called by the composition root after the initial Promise.all resolves. */
  const initCardTypes = useCallback((cards) => setCardTypes(cards), []);

  const addCardType = useCallback(async (name) => {
    const types = await api.addCardType(name);
    setCardTypes(types);
  }, []);

  const removeCardType = useCallback(async (name) => {
    const types = await api.removeCardType(name);
    setCardTypes(types);
  }, []);

  const updateCardCutOff = useCallback(async (name, cutOffDay) => {
    const types = await api.updateCardCutOff(name, cutOffDay);
    setCardTypes(types);
  }, []);

  const renameCard = useCallback(async (oldName, newName) => {
    const types = await api.renameCard(oldName, newName);
    setCardTypes(types);
  }, []);

  return {
    cardTypes,
    initCardTypes,
    addCardType,
    removeCardType,
    updateCardCutOff,
    renameCard,
  };
}
