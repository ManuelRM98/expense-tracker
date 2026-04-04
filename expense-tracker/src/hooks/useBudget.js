import { useState, useCallback, useEffect } from 'react';
import * as api from '../services/api';

const FALLBACK = { monthKey: 'default', fixedPct: 50, variablePct: 30, savingsPct: 20, isOverride: false };

export function useBudget() {
  const [defaultBudget,   setDefaultBudget]   = useState(FALLBACK);
  // map of "YYYY-MM" -> MonthBudget (only overrides, not inherited defaults)
  const [monthOverrides,  setMonthOverrides]   = useState({});
  const [budgetLoaded,    setBudgetLoaded]     = useState(false);

  useEffect(() => {
    api.getDefaultBudget()
      .then(b => setDefaultBudget(b))
      .catch(() => {})
      .finally(() => setBudgetLoaded(true));
  }, []);

  /** Returns the effective budget for a month (override if exists, else default). */
  const getBudgetForMonth = useCallback((monthKey) => {
    return monthOverrides[monthKey] ?? defaultBudget;
  }, [monthOverrides, defaultBudget]);

  /** Saves new global default percentages. */
  const saveDefaultBudget = useCallback(async (pcts) => {
    const saved = await api.setDefaultBudget(pcts);
    setDefaultBudget(saved);
    return saved;
  }, []);

  /** Saves a monthly override. */
  const saveMonthBudget = useCallback(async (monthKey, pcts) => {
    const saved = await api.setMonthBudget(monthKey, pcts);
    setMonthOverrides(prev => ({ ...prev, [monthKey]: saved }));
    return saved;
  }, []);

  /** Removes a monthly override so the month falls back to global default. */
  const clearMonthBudget = useCallback(async (monthKey) => {
    await api.deleteMonthBudget(monthKey);
    setMonthOverrides(prev => {
      const next = { ...prev };
      delete next[monthKey];
      return next;
    });
  }, []);

  /** Loads the effective budget for a specific month from the API (used on month navigation). */
  const loadMonthBudget = useCallback(async (monthKey) => {
    const b = await api.getMonthBudget(monthKey);
    if (b.isOverride) {
      setMonthOverrides(prev => ({ ...prev, [monthKey]: b }));
    }
    return b;
  }, []);

  return {
    defaultBudget,
    budgetLoaded,
    getBudgetForMonth,
    saveDefaultBudget,
    saveMonthBudget,
    clearMonthBudget,
    loadMonthBudget,
  };
}
