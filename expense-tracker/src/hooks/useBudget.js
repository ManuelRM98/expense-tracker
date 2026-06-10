import { useState, useCallback, useEffect } from 'react';
import * as api from '../services/api';

const FALLBACK = { monthKey: 'default', fixedPct: 50, variablePct: 30, savingsPct: 20, isOverride: false };

export function useBudget() {
  const [defaultBudget,   setDefaultBudget]   = useState(FALLBACK);
  // map of "YYYY-MM" -> MonthBudget (only overrides, not inherited defaults)
  const [monthOverrides,  setMonthOverrides]   = useState({});
  const [budgetLoaded,    setBudgetLoaded]     = useState(false);
  // STATE-07: expose load error so App can surface a toast/banner
  const [budgetLoadError, setBudgetLoadError]  = useState(null);

  useEffect(() => {
    Promise.all([
      api.getDefaultBudget(),
      api.getAllBudgetOverrides(),
    ])
      .then(([def, overrides]) => {
        setDefaultBudget(def);
        const map = {};
        overrides.forEach(o => { map[o.monthKey] = o; });
        setMonthOverrides(map);
        setBudgetLoadError(null);
      })
      .catch((err) => {
        // STATE-07: surface error instead of silently swallowing — fallback values will be used
        setBudgetLoadError(err?.message ?? 'Could not load budget configuration. Using default values.');
      })
      .finally(() => setBudgetLoaded(true));
  }, []);

  /** Returns the effective budget for a month (override if exists, else default). */
  const getBudgetForMonth = useCallback((monthKey) => {
    return monthOverrides[monthKey] ?? defaultBudget;
  }, [monthOverrides, defaultBudget]);

  /** Saves new global default percentages. Past months without an override are
   *  snapshotted at the current default before it changes, mirroring salary behavior. */
  const saveDefaultBudget = useCallback(async (pcts, knownMonthKeys = []) => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const pastMonthsToSnapshot = knownMonthKeys.filter(
      mk => mk < currentMonthKey && !monthOverrides[mk]
    );

    if (pastMonthsToSnapshot.length > 0) {
      const snapPcts = {
        fixedPct:    defaultBudget.fixedPct,
        variablePct: defaultBudget.variablePct,
        savingsPct:  defaultBudget.savingsPct,
      };
      await Promise.all(pastMonthsToSnapshot.map(mk => api.setMonthBudget(mk, snapPcts)));
      setMonthOverrides(prev => {
        const next = { ...prev };
        pastMonthsToSnapshot.forEach(mk => {
          next[mk] = { monthKey: mk, ...snapPcts, isOverride: true };
        });
        return next;
      });
    }

    const saved = await api.setDefaultBudget(pcts);
    setDefaultBudget(saved);
    return saved;
  }, [defaultBudget, monthOverrides]);

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
    budgetLoadError,
    getBudgetForMonth,
    saveDefaultBudget,
    saveMonthBudget,
    clearMonthBudget,
    loadMonthBudget,
  };
}
