import { useState, useCallback } from 'react';
import * as api from '../services/api';

/**
 * DEBT-03: extracted from useExpenses — owns expense categories and saving categories.
 * State holds [{name, color}] objects (FEAT-12: was string[]).
 */
export function useCategories({ initialExpCats = [], initialSavCats = [] } = {}) {
  const [expenseCategories,  setExpenseCategories]  = useState(initialExpCats);
  const [savingCategories,   setSavingCategories]   = useState(initialSavCats);

  // ── Init helpers (called by the composition root after Promise.all) ──────────

  const initExpenseCategories = useCallback((cats) => setExpenseCategories(cats), []);
  const initSavingCategories  = useCallback((cats) => setSavingCategories(cats), []);

  // ── Expense categories ────────────────────────────────────────────────────────

  const addExpenseCategory = useCallback(async (name, color = null) => {
    const cats = await api.addExpenseCategory(name, color);
    setExpenseCategories(cats);
  }, []);

  const removeExpenseCategory = useCallback(async (name) => {
    const cats = await api.removeExpenseCategory(name);
    setExpenseCategories(cats);
  }, []);

  const renameExpenseCategory = useCallback(async (oldName, newName) => {
    const cats = await api.renameExpenseCategory(oldName, newName);
    setExpenseCategories(cats);
  }, []);

  const updateExpenseCategoryColor = useCallback(async (name, color) => {
    const cats = await api.updateExpenseCategoryColor(name, color);
    setExpenseCategories(cats);
  }, []);

  // ── Saving categories ─────────────────────────────────────────────────────────

  const addSavingCategory = useCallback(async (name, color = null) => {
    const cats = await api.addSavingCategory(name, color);
    setSavingCategories(cats);
  }, []);

  const removeSavingCategory = useCallback(async (name) => {
    const cats = await api.removeSavingCategory(name);
    setSavingCategories(cats);
  }, []);

  const renameSavingCategory = useCallback(async (oldName, newName) => {
    const cats = await api.renameSavingCategory(oldName, newName);
    setSavingCategories(cats);
  }, []);

  const updateSavingCategoryColor = useCallback(async (name, color) => {
    const cats = await api.updateSavingCategoryColor(name, color);
    setSavingCategories(cats);
  }, []);

  return {
    expenseCategories,
    savingCategories,
    initExpenseCategories,
    initSavingCategories,
    addExpenseCategory,
    removeExpenseCategory,
    renameExpenseCategory,
    updateExpenseCategoryColor,
    addSavingCategory,
    removeSavingCategory,
    renameSavingCategory,
    updateSavingCategoryColor,
  };
}
