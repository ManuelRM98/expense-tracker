import { useState, useCallback, useEffect } from 'react';
import * as api from '../services/api';

export function useFixedExpenses() {
  const [templates, setTemplates] = useState([]);

  // ── Load templates on mount ────────────────────────────────────────────────
  useEffect(() => {
    api.getTemplates().then(setTemplates).catch(err => {
      console.error('useFixedExpenses: failed to load templates:', err);
    });
  }, []);

  // ── Template CRUD ──────────────────────────────────────────────────────────

  const addTemplate = useCallback(async (data) => {
    const created = await api.createTemplate(data);
    setTemplates(prev => [...prev, created]);
  }, []);

  const updateTemplate = useCallback(async (id, data) => {
    const updated = await api.updateTemplate(id, data);
    setTemplates(prev => prev.map(t => t.id === id ? updated : t));
  }, []);

  const deleteTemplate = useCallback(async (id) => {
    await api.deleteTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  }, []);

  const toggleTemplate = useCallback(async (id) => {
    const updated = await api.toggleTemplate(id);
    setTemplates(prev => prev.map(t => t.id === id ? updated : t));
  }, []);

  // ── Auto-generation ────────────────────────────────────────────────────────
  // DEBT-04: the SERVER owns all generation logic (future-month guard, createdAt gate,
  // day clamping, duplicate log check). The frontend delegates entirely via POST.
  // On success the server returns the newly created expense objects (complete, with IDs).
  // bulkAddExpenses merges them into local state without an extra API round-trip.

  const generateForMonth = useCallback(async (monthKey, bulkAddExpenses) => {
    const generated = await api.generateForMonth(monthKey);
    if (generated.length > 0) {
      bulkAddExpenses(generated);
    }
  }, []);

  return {
    templates,
    addTemplate, updateTemplate, deleteTemplate, toggleTemplate,
    generateForMonth,
  };
}
