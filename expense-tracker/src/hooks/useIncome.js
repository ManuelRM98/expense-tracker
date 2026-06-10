import { useState, useCallback, useRef } from 'react';
import * as api from '../services/api';

/**
 * DEBT-03: extracted from useExpenses — owns income entries, base salary,
 * lazy per-year fetching (STATE-01/PERF-06), and ensureSalaryForMonth (BUG-02).
 */
export function useIncome({ initialEntries = [], initialBaseSalary = 0, initialLoaded = false } = {}) {
  const [incomeEntries,    setIncomeEntries]    = useState(initialEntries);
  const [baseSalary,       setBaseSalary]       = useState(initialBaseSalary);
  // BUG-02: flag so ensureSalaryForMonth never fires before the initial fetch resolves
  const [baseSalaryLoaded, setBaseSalaryLoaded] = useState(initialLoaded);

  // STATE-01/PERF-06: track which years have been fetched to avoid duplicate requests
  const fetchedYearsRef = useRef(new Set());

  // FINDING 3: keep a ref in sync with incomeEntries state so ensureSalaryForMonth
  // always reads the latest entries even when called immediately after a fetch
  // (avoids stale-closure duplicate-salary bug).
  const incomeEntriesRef = useRef(initialEntries);

  // Wrapper: update both state and ref atomically
  const setIncomeEntriesAndRef = useCallback((updater) => {
    setIncomeEntries(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      incomeEntriesRef.current = next;
      return next;
    });
  }, []);

  /**
   * STATE-01/PERF-06: lazily fetches income entries for a year not yet loaded.
   * Safe to call on every navigation — idempotent via fetchedYearsRef.
   * Also keeps incomeEntriesRef up to date so ensureSalaryForMonth always sees
   * fresh data (FINDING 3: avoids duplicate-salary race condition).
   */
  const fetchIncomeForYear = useCallback(async (year) => {
    if (fetchedYearsRef.current.has(year)) return;
    fetchedYearsRef.current.add(year);
    const entries = await api.getAllIncomeEntries(year);
    if (entries.length > 0) {
      setIncomeEntriesAndRef(prev => {
        const existingIds = new Set(prev.map(e => e.id));
        const newEntries = entries.filter(e => !existingIds.has(e.id));
        return newEntries.length > 0 ? [...prev, ...newEntries] : prev;
      });
    }
  }, [setIncomeEntriesAndRef]);

  /** Merges freshly loaded entries from the initial Promise.all into state. */
  const initIncomeEntries = useCallback((entries, salary, currentYear) => {
    setIncomeEntriesAndRef(entries);
    setBaseSalary(salary);
    setBaseSalaryLoaded(true);
    fetchedYearsRef.current.add(currentYear);
  }, [setIncomeEntriesAndRef]);

  /** Returns total COP income for a given month (sum of all entries). */
  const getIncome = useCallback((yearMonth) => {
    return incomeEntries
      .filter(e => e.monthKey === yearMonth)
      .reduce((sum, e) => sum + e.amountCop, 0);
  }, [incomeEntries]);

  /** Returns all income entries for a given month. */
  const getIncomeEntries = useCallback((yearMonth) => {
    return incomeEntries.filter(e => e.monthKey === yearMonth);
  }, [incomeEntries]);

  const addIncomeEntry = useCallback(async (data) => {
    const created = await api.createIncomeEntry(data);
    setIncomeEntriesAndRef(prev => [...prev, created]);
    return created;
  }, [setIncomeEntriesAndRef]);

  const updateIncomeEntry = useCallback(async (id, data) => {
    const updated = await api.updateIncomeEntry(id, data);
    setIncomeEntriesAndRef(prev => prev.map(e => e.id === id ? updated : e));
  }, [setIncomeEntriesAndRef]);

  const deleteIncomeEntry = useCallback(async (id) => {
    await api.deleteIncomeEntry(id);
    setIncomeEntriesAndRef(prev => prev.filter(e => e.id !== id));
  }, [setIncomeEntriesAndRef]);

  /**
   * Auto-creates a salary entry for the given month if none exists.
   * For future months, also updates an existing entry if the amount differs
   * from the current baseSalary (so changes to Global Salary are reflected).
   *
   * FINDING 3: reads from incomeEntriesRef (not the stale-closure incomeEntries
   * state value) so that a fresh fetchIncomeForYear result is visible even when
   * this function is called in the same async tick as the fetch.
   */
  const ensureSalaryForMonth = useCallback(async (yearMonth) => {
    if (baseSalary <= 0) return;
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const isFutureMonth = yearMonth > currentMonthKey;

    // Read from ref so we always see the post-fetch entries (FINDING 3)
    const existingEntry = incomeEntriesRef.current.find(
      e => e.monthKey === yearMonth && e.incomeType === 'salary'
    );

    if (!existingEntry) {
      await addIncomeEntry({
        monthKey:    yearMonth,
        incomeType:  'salary',
        description: `Salary ${yearMonth}`,
        currency:    'COP',
        amountCop:   baseSalary,
      });
    } else if (isFutureMonth && existingEntry.amountCop !== baseSalary) {
      await updateIncomeEntry(existingEntry.id, {
        incomeType:     existingEntry.incomeType,
        description:    existingEntry.description,
        currency:       existingEntry.currency,
        originalAmount: existingEntry.originalAmount,
        exchangeRate:   existingEntry.exchangeRate,
        amountCop:      baseSalary,
      });
    }
  }, [baseSalary, addIncomeEntry, updateIncomeEntry]);

  /** Saves baseSalary to GlobalConfig and updates all future-month salary entries. */
  const saveBaseSalary = useCallback(async (amount) => {
    await api.setConfig('base_salary', amount);
    setBaseSalary(amount);

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    // Read from ref to avoid stale closure
    const futureSalaryEntries = incomeEntriesRef.current.filter(
      e => e.monthKey > currentMonthKey && e.incomeType === 'salary'
    );

    if (futureSalaryEntries.length > 0) {
      await Promise.all(futureSalaryEntries.map(entry =>
        api.updateIncomeEntry(entry.id, {
          incomeType:     entry.incomeType,
          description:    entry.description,
          currency:       entry.currency,
          originalAmount: entry.originalAmount,
          exchangeRate:   entry.exchangeRate,
          amountCop:      amount,
        })
      ));
      setIncomeEntriesAndRef(prev =>
        prev.map(e =>
          futureSalaryEntries.some(fe => fe.id === e.id)
            ? { ...e, amountCop: amount }
            : e
        )
      );
    }
  }, [setIncomeEntriesAndRef]);

  return {
    incomeEntries,
    baseSalary,
    baseSalaryLoaded,
    initIncomeEntries,
    fetchIncomeForYear,
    getIncome,
    getIncomeEntries,
    addIncomeEntry,
    updateIncomeEntry,
    deleteIncomeEntry,
    ensureSalaryForMonth,
    saveBaseSalary,
  };
}
