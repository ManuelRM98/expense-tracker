import { useState, useCallback, useEffect } from 'react';
import * as api from '../services/api';

export function useDebts() {
  const [debts, setDebts] = useState([]);

  useEffect(() => {
    api.getDebts().then(setDebts);
  }, []);

  const addDebt = useCallback(async (data) => {
    const created = await api.createDebt(data);
    setDebts(prev => [created, ...prev]);
    return created;
  }, []);

  const updateDebt = useCallback(async (id, data) => {
    const updated = await api.updateDebt(id, data);
    setDebts(prev => prev.map(d => d.id === id ? updated : d));
    return updated;
  }, []);

  const deleteDebt = useCallback(async (id) => {
    await api.deleteDebt(id);
    setDebts(prev => prev.filter(d => d.id !== id));
  }, []);

  const addPayment = useCallback(async (debtId, data) => {
    const updated = await api.addDebtPayment(debtId, data);
    setDebts(prev => prev.map(d => d.id === debtId ? updated : d));
    return updated;
  }, []);

  const updatePayment = useCallback(async (debtId, paymentId, data) => {
    const updated = await api.updateDebtPayment(debtId, paymentId, data);
    setDebts(prev => prev.map(d => d.id === debtId ? updated : d));
    return updated;
  }, []);

  const deletePayment = useCallback(async (debtId, paymentId) => {
    const updated = await api.deleteDebtPayment(debtId, paymentId);
    setDebts(prev => prev.map(d => d.id === debtId ? updated : d));
    return updated;
  }, []);

  return { debts, addDebt, updateDebt, deleteDebt, addPayment, updatePayment, deletePayment };
}
