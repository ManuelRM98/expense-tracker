import { useState, useCallback, useEffect } from 'react';
import * as api from '../services/api';

export function useExpenses() {
  const [expenses,          setExpenses]          = useState([]);
  const [cardTypes,         setCardTypes]          = useState([]);
  const [expenseCategories, setExpenseCategories]  = useState([]);
  const [savings,           setSavings]            = useState([]);
  const [savingCategories,  setSavingCategories]   = useState([]);
  const [incomeEntries,     setIncomeEntries]      = useState([]);   // IncomeEntry[]
  const [baseSalary,        setBaseSalary]         = useState(0);    // from GlobalConfig

  // ── Load all data on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    Promise.all([
      api.getExpenses(),
      api.getCardTypes(),
      api.getExpenseCategories(),
      api.getSavings(),
      api.getSavingCategories(),
      api.getAllIncomeEntries(currentYear),
      api.getConfig(),
    ]).then(([exps, cards, expCats, savs, savCats, entries, config]) => {
      setExpenses(exps);
      setCardTypes(cards);
      setExpenseCategories(expCats);
      setSavings(savs);
      setSavingCategories(savCats);
      setIncomeEntries(entries);
      const salaryConfig = config.find(c => c.key === 'base_salary');
      setBaseSalary(salaryConfig ? parseInt(salaryConfig.value, 10) : 0);
    });
  }, []);

  // ── Expenses ───────────────────────────────────────────────────────────────

  const addExpense = useCallback(async (data) => {
    const created = await api.createExpense(data);
    setExpenses(prev => [...prev, created]);
    return created;
  }, []);

  const bulkAddExpenses = useCallback((completedExpenses) => {
    setExpenses(prev => [...prev, ...completedExpenses]);
  }, []);

  const updateExpense = useCallback(async (id, data) => {
    const updated = await api.updateExpense(id, data);
    setExpenses(prev => prev.map(e => e.id === id ? updated : e));
  }, []);

  const deleteExpense = useCallback(async (id) => {
    await api.deleteExpense(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  // ── Card types ─────────────────────────────────────────────────────────────

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

  // ── Expense categories ─────────────────────────────────────────────────────

  const addExpenseCategory = useCallback(async (name) => {
    const cats = await api.addExpenseCategory(name);
    setExpenseCategories(cats);
  }, []);

  const removeExpenseCategory = useCallback(async (name) => {
    const cats = await api.removeExpenseCategory(name);
    setExpenseCategories(cats);
  }, []);

  // ── Savings ────────────────────────────────────────────────────────────────

  const addSaving = useCallback(async (data) => {
    const created = await api.createSaving(data);
    setSavings(prev => [...prev, created]);
  }, []);

  const updateSaving = useCallback(async (id, data) => {
    const updated = await api.updateSaving(id, data);
    setSavings(prev => prev.map(s => s.id === id ? updated : s));
  }, []);

  const deleteSaving = useCallback(async (id) => {
    await api.deleteSaving(id);
    setSavings(prev => prev.filter(s => s.id !== id));
  }, []);

  // ── Saving categories ──────────────────────────────────────────────────────

  const addSavingCategory = useCallback(async (name) => {
    const cats = await api.addSavingCategory(name);
    setSavingCategories(cats);
  }, []);

  const removeSavingCategory = useCallback(async (name) => {
    const cats = await api.removeSavingCategory(name);
    setSavingCategories(cats);
  }, []);

  // ── Income ─────────────────────────────────────────────────────────────────

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
    setIncomeEntries(prev => [...prev, created]);
    return created;
  }, []);

  const updateIncomeEntry = useCallback(async (id, data) => {
    const updated = await api.updateIncomeEntry(id, data);
    setIncomeEntries(prev => prev.map(e => e.id === id ? updated : e));
  }, []);

  const deleteIncomeEntry = useCallback(async (id) => {
    await api.deleteIncomeEntry(id);
    setIncomeEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  /**
   * Auto-creates a salary entry for the given month if none exists.
   * For future months, also updates an existing entry if the amount differs
   * from the current baseSalary (so changes to Global Salary are reflected).
   */
  const ensureSalaryForMonth = useCallback(async (yearMonth) => {
    if (baseSalary <= 0) return;
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const isFutureMonth = yearMonth > currentMonthKey;

    const existingEntry = incomeEntries.find(
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
  }, [baseSalary, incomeEntries, addIncomeEntry, updateIncomeEntry]);

  /** Saves baseSalary to GlobalConfig and updates all future-month salary entries. */
  const saveBaseSalary = useCallback(async (amount) => {
    await api.setConfig('base_salary', amount);
    setBaseSalary(amount);

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const futureSalaryEntries = incomeEntries.filter(
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
      setIncomeEntries(prev =>
        prev.map(e =>
          futureSalaryEntries.some(fe => fe.id === e.id)
            ? { ...e, amountCop: amount }
            : e
        )
      );
    }
  }, [incomeEntries]);

  return {
    expenses, cardTypes, expenseCategories,
    addExpense, bulkAddExpenses, updateExpense, deleteExpense,
    addCardType, removeCardType, updateCardCutOff, addExpenseCategory, removeExpenseCategory,
    savings, savingCategories,
    addSaving, updateSaving, deleteSaving, addSavingCategory, removeSavingCategory,
    incomeEntries, baseSalary,
    getIncome, getIncomeEntries,
    addIncomeEntry, updateIncomeEntry, deleteIncomeEntry,
    ensureSalaryForMonth, saveBaseSalary,
  };
}
