import { useState, useCallback } from 'react';
import { uid } from '../utils/format';

const STORAGE_KEY      = 'expensetrack_v1';
const CARDS_KEY        = 'expensetrack_cards_v1';
const EXPENSE_CATS_KEY = 'expensetrack_expense_cats_v1';
const SAVINGS_KEY      = 'expensetrack_savings_v1';
const SAVING_CATS_KEY  = 'expensetrack_saving_cats_v1';
const INCOME_KEY       = 'expensetrack_income_v1';

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

export function useExpenses() {
  const [expenses,           setExpenses]           = useState(() => load(STORAGE_KEY, []));
  const [cardTypes,          setCardTypes]           = useState(() => load(CARDS_KEY, ['Davivienda']));
  const [expenseCategories,  setExpenseCategories]   = useState(() => load(EXPENSE_CATS_KEY, ['Food', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Services']));
  const [savings,            setSavings]             = useState(() => load(SAVINGS_KEY, []));
  const [savingCategories,   setSavingCategories]    = useState(() => load(SAVING_CATS_KEY, ['Investment']));
  const [incomeMap,          setIncomeMap]           = useState(() => load(INCOME_KEY, {}));

  // ── Expenses ─────────────────────────────────────────────
  const persist = useCallback((next) => {
    setExpenses(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const persistCards = useCallback((next) => {
    setCardTypes(next);
    localStorage.setItem(CARDS_KEY, JSON.stringify(next));
  }, []);

  const addExpense = useCallback((data) => {
    persist([...expenses, { id: uid(), ...data }]);
  }, [expenses, persist]);

  // Adds multiple expenses in a single state update — used by the permanent
  // fixed expense auto-generation to avoid stale-closure overwrites.
  const bulkAddExpenses = useCallback((dataArray) => {
    persist([...expenses, ...dataArray.map(data => ({ id: uid(), ...data }))]);
  }, [expenses, persist]);

  const updateExpense = useCallback((id, data) => {
    persist(expenses.map(e => e.id === id ? { ...e, ...data } : e));
  }, [expenses, persist]);

  const deleteExpense = useCallback((id) => {
    persist(expenses.filter(e => e.id !== id));
  }, [expenses, persist]);

  const addCardType = useCallback((name) => {
    if (!cardTypes.includes(name)) {
      persistCards([...cardTypes, name]);
    }
  }, [cardTypes, persistCards]);

  const removeCardType = useCallback((name) => {
    persistCards(cardTypes.filter(c => c !== name));
  }, [cardTypes, persistCards]);

  const persistExpenseCats = useCallback((next) => {
    setExpenseCategories(next);
    localStorage.setItem(EXPENSE_CATS_KEY, JSON.stringify(next));
  }, []);

  const addExpenseCategory = useCallback((name) => {
    if (!expenseCategories.includes(name)) {
      persistExpenseCats([...expenseCategories, name]);
    }
  }, [expenseCategories, persistExpenseCats]);

  const removeExpenseCategory = useCallback((name) => {
    persistExpenseCats(expenseCategories.filter(c => c !== name));
  }, [expenseCategories, persistExpenseCats]);

  // ── Savings ──────────────────────────────────────────────
  const persistSavings = useCallback((next) => {
    setSavings(next);
    localStorage.setItem(SAVINGS_KEY, JSON.stringify(next));
  }, []);

  const persistSavingCats = useCallback((next) => {
    setSavingCategories(next);
    localStorage.setItem(SAVING_CATS_KEY, JSON.stringify(next));
  }, []);

  const addSaving = useCallback((data) => {
    persistSavings([...savings, { id: uid(), ...data }]);
  }, [savings, persistSavings]);

  const updateSaving = useCallback((id, data) => {
    persistSavings(savings.map(s => s.id === id ? { ...s, ...data } : s));
  }, [savings, persistSavings]);

  const deleteSaving = useCallback((id) => {
    persistSavings(savings.filter(s => s.id !== id));
  }, [savings, persistSavings]);

  const addSavingCategory = useCallback((name) => {
    if (!savingCategories.includes(name)) {
      persistSavingCats([...savingCategories, name]);
    }
  }, [savingCategories, persistSavingCats]);

  const removeSavingCategory = useCallback((name) => {
    persistSavingCats(savingCategories.filter(c => c !== name));
  }, [savingCategories, persistSavingCats]);

  // ── Income (per month key "YYYY-MM") ─────────────────────
  const persistIncome = useCallback((next) => {
    setIncomeMap(next);
    localStorage.setItem(INCOME_KEY, JSON.stringify(next));
  }, []);

  const getIncome = useCallback((yearMonth) => {
    return incomeMap[yearMonth] ?? 0;
  }, [incomeMap]);

  const setIncome = useCallback((yearMonth, amount) => {
    persistIncome({ ...incomeMap, [yearMonth]: amount });
  }, [incomeMap, persistIncome]);

  return {
    expenses, cardTypes, expenseCategories,
    addExpense, bulkAddExpenses, updateExpense, deleteExpense, addCardType, removeCardType, addExpenseCategory, removeExpenseCategory,
    savings, savingCategories,
    addSaving, updateSaving, deleteSaving, addSavingCategory, removeSavingCategory,
    getIncome, setIncome,
  };
}
