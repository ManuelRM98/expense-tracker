import { useState, useCallback, useEffect } from 'react';
import * as api from '../services/api';

export function useExpenses() {
  const [expenses,          setExpenses]          = useState([]);
  const [cardTypes,         setCardTypes]          = useState([]);
  const [expenseCategories, setExpenseCategories]  = useState([]);
  const [savings,           setSavings]            = useState([]);
  const [savingCategories,  setSavingCategories]   = useState([]);
  const [incomeMap,         setIncomeMap]          = useState({});

  // ── Load all data on mount ─────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.getExpenses(),
      api.getCardTypes(),
      api.getExpenseCategories(),
      api.getSavings(),
      api.getSavingCategories(),
      api.getAllIncome(),
    ]).then(([exps, cards, expCats, savs, savCats, incomes]) => {
      setExpenses(exps);
      setCardTypes(cards);
      setExpenseCategories(expCats);
      setSavings(savs);
      setSavingCategories(savCats);
      // Convert [{ month_key, amount }] array to { "YYYY-MM": amount } map
      const map = {};
      incomes.forEach(({ month_key, amount }) => { map[month_key] = amount; });
      setIncomeMap(map);
    });
  }, []);

  // ── Expenses ───────────────────────────────────────────────────────────────

  const addExpense = useCallback(async (data) => {
    const created = await api.createExpense(data);
    setExpenses(prev => [...prev, created]);
  }, []);

  // Called by generateForMonth with expenses already created in the DB.
  // Only updates local state — no API call needed.
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

  const getIncome = useCallback((yearMonth) => {
    return incomeMap[yearMonth] ?? 0;
  }, [incomeMap]);

  const setIncome = useCallback(async (yearMonth, amount) => {
    await api.setIncome(yearMonth, amount);
    setIncomeMap(prev => ({ ...prev, [yearMonth]: amount }));
  }, []);

  return {
    expenses, cardTypes, expenseCategories,
    addExpense, bulkAddExpenses, updateExpense, deleteExpense,
    addCardType, removeCardType, addExpenseCategory, removeExpenseCategory,
    savings, savingCategories,
    addSaving, updateSaving, deleteSaving, addSavingCategory, removeSavingCategory,
    getIncome, setIncome,
  };
}
