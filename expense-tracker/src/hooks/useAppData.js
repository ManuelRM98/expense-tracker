import { useEffect, useMemo } from 'react';
import * as api from '../services/api';
import { useExpenses } from './useExpenses';
import { useSavings } from './useSavings';
import { useIncome } from './useIncome';
import { useCategories } from './useCategories';
import { useCards } from './useCards';

/**
 * DEBT-03: composition root that wires together the five domain hooks.
 * Performs the single initial Promise.all load (reference data + current-year
 * income) then distributes results via each hook's init callback.
 *
 * Returns a flat object merging all domain hook returns so call sites can
 * destructure exactly what they need without knowing the internal structure.
 */
export function useAppData() {
  const expensesHook   = useExpenses();
  const savingsHook    = useSavings();
  const incomeHook     = useIncome();
  const categoriesHook = useCategories();
  const cardsHook      = useCards();

  // ── Load reference data + current-year income on mount ─────────────────────
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    Promise.all([
      api.getCardTypes(),
      api.getExpenseCategories(),
      api.getSavingCategories(),
      api.getAllIncomeEntries(currentYear),
      api.getConfig(),
      api.getPeople(),
    ]).then(([cards, expCats, savCats, entries, config, ppl]) => {
      cardsHook.initCardTypes(cards);
      // expCats and savCats are now [{name, color}] objects (FEAT-12)
      categoriesHook.initExpenseCategories(expCats);
      categoriesHook.initSavingCategories(savCats);

      const salaryConfig = config.find(c => c.key === 'base_salary');
      const baseSalary = salaryConfig ? parseFloat(salaryConfig.value) : 0;
      incomeHook.initIncomeEntries(entries, baseSalary, currentYear);

      expensesHook.initPeople(ppl);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derive string[] from category objects so existing consumers need no changes ─
  // ExpenseModal, SavingModal, PermanentExpenseModal, FixedExpensesPage all expect string[].
  const expenseCategories = useMemo(
    () => categoriesHook.expenseCategories.map(c => c.name),
    [categoriesHook.expenseCategories]
  );
  const savingCategories = useMemo(
    () => categoriesHook.savingCategories.map(c => c.name),
    [categoriesHook.savingCategories]
  );

  // ── Flat merged return — same shape as the old useExpenses return ────────────
  return {
    // Expenses domain
    expensesByMonth:      expensesHook.expensesByMonth,
    people:               expensesHook.people,
    loadExpensesForMonth: expensesHook.loadExpensesForMonth,
    getExpensesForMonth:  expensesHook.getExpensesForMonth,
    isExpensesMonthLoaded: expensesHook.isExpensesMonthLoaded,
    addExpense:           expensesHook.addExpense,
    bulkAddExpenses:      expensesHook.bulkAddExpenses,
    updateExpense:        expensesHook.updateExpense,
    deleteExpense:        expensesHook.deleteExpense,

    // Savings domain
    savingsByMonth:        savingsHook.savingsByMonth,
    loadSavingsForMonth:   savingsHook.loadSavingsForMonth,
    getSavingsForMonth:    savingsHook.getSavingsForMonth,
    isSavingsMonthLoaded:  savingsHook.isSavingsMonthLoaded,
    addSaving:             savingsHook.addSaving,
    updateSaving:          savingsHook.updateSaving,
    deleteSaving:          savingsHook.deleteSaving,

    // Income domain
    incomeEntries:         incomeHook.incomeEntries,
    baseSalary:            incomeHook.baseSalary,
    baseSalaryLoaded:      incomeHook.baseSalaryLoaded,
    fetchIncomeForYear:    incomeHook.fetchIncomeForYear,
    getIncome:             incomeHook.getIncome,
    getIncomeEntries:      incomeHook.getIncomeEntries,
    addIncomeEntry:        incomeHook.addIncomeEntry,
    updateIncomeEntry:     incomeHook.updateIncomeEntry,
    deleteIncomeEntry:     incomeHook.deleteIncomeEntry,
    ensureSalaryForMonth:  incomeHook.ensureSalaryForMonth,
    saveBaseSalary:        incomeHook.saveBaseSalary,

    // Categories domain — string[] for backward-compatible consumers
    expenseCategories,
    savingCategories,
    addExpenseCategory:    categoriesHook.addExpenseCategory,
    removeExpenseCategory: categoriesHook.removeExpenseCategory,
    renameExpenseCategory: categoriesHook.renameExpenseCategory,
    addSavingCategory:     categoriesHook.addSavingCategory,
    removeSavingCategory:  categoriesHook.removeSavingCategory,
    renameSavingCategory:  categoriesHook.renameSavingCategory,

    // Categories domain — full objects + color mutation (FEAT-12 additions)
    expenseCategoryObjects:       categoriesHook.expenseCategories,
    savingCategoryObjects:        categoriesHook.savingCategories,
    updateExpenseCategoryColor:   categoriesHook.updateExpenseCategoryColor,
    updateSavingCategoryColor:    categoriesHook.updateSavingCategoryColor,

    // Cards domain
    cardTypes:         cardsHook.cardTypes,
    addCardType:       cardsHook.addCardType,
    removeCardType:    cardsHook.removeCardType,
    updateCardCutOff:  cardsHook.updateCardCutOff,
    updateCardColor:   cardsHook.updateCardColor,
    renameCard:        cardsHook.renameCard,
  };
}
