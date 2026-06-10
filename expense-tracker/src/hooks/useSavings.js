import { useState, useCallback, useRef } from 'react';
import * as api from '../services/api';

/**
 * DEBT-03 + PERF-03: extracted from useExpenses — owns savings CRUD with
 * month-scoped lazy loading.
 *
 * Cache strategy: savingsByMonth is a Map<monthKey, Saving[]>.
 * On first visit to a month we fetch GET /savings?month=YYYY-MM and store the
 * result.  Mutations update the cached month(s) the entity belongs to.
 * Components that need broader data (trend charts) use the backend analytics
 * endpoints directly; they do not consume this hook's per-month cache.
 */
export function useSavings() {
  // Map<monthKey, Saving[]>  — null means "not yet fetched"
  const [savingsByMonth, setSavingsByMonth] = useState({});
  const fetchedMonthsRef = useRef(new Set());

  /**
   * Fetch savings for a month if not already cached.
   * Returns the array (from cache or freshly fetched).
   */
  const loadSavingsForMonth = useCallback(async (monthKey) => {
    if (fetchedMonthsRef.current.has(monthKey)) return savingsByMonth[monthKey] ?? [];
    fetchedMonthsRef.current.add(monthKey);

    // api.getSavings accepts an optional ?month= query param
    const fetched = await api.getSavings(monthKey);
    setSavingsByMonth(prev => ({ ...prev, [monthKey]: fetched }));
    return fetched;
  }, [savingsByMonth]);

  /** Returns the cached savings for a month (empty array while loading). */
  const getSavingsForMonth = useCallback((monthKey) => {
    return savingsByMonth[monthKey] ?? [];
  }, [savingsByMonth]);

  /** True once the month has been fetched at least once. */
  const isSavingsMonthLoaded = useCallback((monthKey) => {
    return fetchedMonthsRef.current.has(monthKey);
  }, []);

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  const addSaving = useCallback(async (data) => {
    const created = await api.createSaving(data);
    // Effective month for a saving is its date month
    const month = created.date.substring(0, 7);
    setSavingsByMonth(prev => {
      if (!(month in prev)) return prev; // month not yet cached — will pick up on next load
      return { ...prev, [month]: [...prev[month], created] };
    });
    return created;
  }, []);

  const updateSaving = useCallback(async (id, data) => {
    const updated = await api.updateSaving(id, data);
    const newMonth = updated.date.substring(0, 7);
    setSavingsByMonth(prev => {
      const next = { ...prev };
      // Remove from all cached months (in case month changed)
      for (const mk of Object.keys(next)) {
        next[mk] = next[mk].filter(s => s.id !== id);
      }
      // Add to the new month if that month is cached
      if (newMonth in next) {
        next[newMonth] = [...next[newMonth], updated];
      }
      return next;
    });
  }, []);

  const deleteSaving = useCallback(async (id) => {
    await api.deleteSaving(id);
    setSavingsByMonth(prev => {
      const next = { ...prev };
      for (const mk of Object.keys(next)) {
        next[mk] = next[mk].filter(s => s.id !== id);
      }
      return next;
    });
  }, []);

  return {
    savingsByMonth,
    loadSavingsForMonth,
    getSavingsForMonth,
    isSavingsMonthLoaded,
    addSaving,
    updateSaving,
    deleteSaving,
  };
}
