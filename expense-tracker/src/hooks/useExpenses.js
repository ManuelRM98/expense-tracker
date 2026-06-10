import { useState, useCallback, useRef } from 'react';
import * as api from '../services/api';

/**
 * DEBT-03 + PERF-03: now owns only expenses CRUD with month-scoped lazy loading.
 * Income, categories, cards, and savings have been extracted to their own hooks.
 *
 * Cache strategy: expensesByMonth is an object keyed by "YYYY-MM" → Expense[].
 * On first visit to a month, fetch GET /expenses?month=YYYY-MM and store.
 * Mutations update the cached month(s) the entity belongs to.
 * The effective month for an expense is: billingMonth ?? date.substring(0,7).
 *
 * Consumers needing all-time trend data should use the backend analytics
 * endpoints (GET /analytics/trend) rather than this hook's per-month cache.
 */
export function useExpenses() {
  // Object<monthKey, Expense[]>
  const [expensesByMonth, setExpensesByMonth] = useState({});
  const [people, setPeople] = useState([]);  // distinct who_paid values (Part C.1)
  const fetchedMonthsRef = useRef(new Set());

  /** Called by the composition root once reference data is available. */
  const initPeople = useCallback((ppl) => setPeople(ppl), []);

  /**
   * PERF-03: fetch expenses for a month if not already cached.
   * Returns the array (from cache or freshly fetched).
   */
  const loadExpensesForMonth = useCallback(async (monthKey) => {
    if (fetchedMonthsRef.current.has(monthKey)) return expensesByMonth[monthKey] ?? [];
    fetchedMonthsRef.current.add(monthKey);

    const fetched = await api.getExpenses(monthKey);
    setExpensesByMonth(prev => ({ ...prev, [monthKey]: fetched }));
    return fetched;
  }, [expensesByMonth]);

  /** Returns the cached expenses for a month (empty array while loading). */
  const getExpensesForMonth = useCallback((monthKey) => {
    return expensesByMonth[monthKey] ?? [];
  }, [expensesByMonth]);

  /** True once the month has been fetched at least once. */
  const isExpensesMonthLoaded = useCallback((monthKey) => {
    return fetchedMonthsRef.current.has(monthKey);
  }, []);

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  const addExpense = useCallback(async (data) => {
    const created = await api.createExpense(data);
    // Effective month = billingMonth ?? date[:7]
    const month = created.billingMonth ?? created.date.substring(0, 7);
    setExpensesByMonth(prev => {
      if (!(month in prev)) return prev; // month not yet cached — will pick up on next load
      return { ...prev, [month]: [...prev[month], created] };
    });
    // Update people list with any new who_paid value
    if (created.whoPaid) {
      setPeople(prev => prev.includes(created.whoPaid) ? prev : [...prev, created.whoPaid]);
    }
    return created;
  }, []);

  /**
   * Bulk insert from generateForMonth — already-fetched month, so append to cache.
   * Accepts completed expense objects (with IDs from the DB).
   */
  const bulkAddExpenses = useCallback((completedExpenses) => {
    if (!completedExpenses.length) return;
    setExpensesByMonth(prev => {
      const next = { ...prev };
      for (const exp of completedExpenses) {
        const month = exp.billingMonth ?? exp.date.substring(0, 7);
        if (month in next) {
          // Avoid duplicates (idempotent bulk insert)
          const ids = new Set(next[month].map(e => e.id));
          if (!ids.has(exp.id)) {
            next[month] = [...next[month], exp];
          }
        }
      }
      return next;
    });
  }, []);

  const updateExpense = useCallback(async (id, data) => {
    const updated = await api.updateExpense(id, data);
    const newMonth = updated.billingMonth ?? updated.date.substring(0, 7);
    setExpensesByMonth(prev => {
      const next = { ...prev };
      // Remove from all cached months (in case effective month changed)
      for (const mk of Object.keys(next)) {
        next[mk] = next[mk].filter(e => e.id !== id);
      }
      // Add to new month if cached
      if (newMonth in next) {
        next[newMonth] = [...next[newMonth], updated];
      }
      return next;
    });
  }, []);

  const deleteExpense = useCallback(async (id) => {
    await api.deleteExpense(id);
    setExpensesByMonth(prev => {
      const next = { ...prev };
      for (const mk of Object.keys(next)) {
        next[mk] = next[mk].filter(e => e.id !== id);
      }
      return next;
    });
  }, []);

  return {
    expensesByMonth,
    people,
    initPeople,
    loadExpensesForMonth,
    getExpensesForMonth,
    isExpensesMonthLoaded,
    addExpense,
    bulkAddExpenses,
    updateExpense,
    deleteExpense,
  };
}
