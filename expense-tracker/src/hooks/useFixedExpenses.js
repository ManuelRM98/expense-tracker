import { useState, useCallback } from 'react';
import { uid } from '../utils/format';

const TEMPLATES_KEY = 'expensetrack_permanent_v1';
const LOG_KEY       = 'expensetrack_permanent_log_v1';

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

export function useFixedExpenses() {
  const [templates,     setTemplates]     = useState(() => load(TEMPLATES_KEY, []));
  const [generationLog, setGenerationLog] = useState(() => load(LOG_KEY, {}));

  const persistTemplates = useCallback((next) => {
    setTemplates(next);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next));
  }, []);

  const persistLog = useCallback((next) => {
    setGenerationLog(next);
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
  }, []);

  // ── Template CRUD ────────────────────────────────────────────────────────────

  const addTemplate = useCallback((data) => {
    const now = new Date();
    // Record the month this template was created so it never back-fills months
    // before it existed.
    const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    persistTemplates([...templates, { id: uid(), isActive: true, createdAt, ...data }]);
  }, [templates, persistTemplates]);

  const updateTemplate = useCallback((id, data) => {
    persistTemplates(templates.map(t => t.id === id ? { ...t, ...data } : t));
  }, [templates, persistTemplates]);

  const deleteTemplate = useCallback((id) => {
    persistTemplates(templates.filter(t => t.id !== id));
  }, [templates, persistTemplates]);

  const toggleTemplate = useCallback((id) => {
    persistTemplates(templates.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));
  }, [templates, persistTemplates]);

  // ── Auto-generation ──────────────────────────────────────────────────────────

  /**
   * Generates expense entries for all active permanent templates for a given month.
   *
   * Rules:
   *  • Future months  — never generate (can't prefill what hasn't happened).
   *  • Current month  — generate only when the template's dayOfMonth ≤ today's date,
   *                     i.e. the scheduled day has arrived or passed this month.
   *  • Past months    — always generate; all days in the month have elapsed.
   *  • createdAt gate — a template only applies to months ≥ its createdAt month,
   *                     preventing it from retroactively filling months before it existed.
   *  • Generation log — once a (templateId, monthKey) pair is logged, the entry won't
   *                     be re-generated even if the user later deletes the expense.
   *                     The user must manually re-add if they want the entry back.
   *
   * @param {string}   monthKey        – "YYYY-MM", e.g. "2026-03"
   * @param {Function} bulkAddExpenses – batch expense creator from useExpenses
   */
  const generateForMonth = useCallback((monthKey, bulkAddExpenses) => {
    const today = new Date();
    const currentMonthKey =
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    // Never pre-fill future months
    if (monthKey > currentMonthKey) return;

    const [year, month] = monthKey.split('-').map(Number);
    const isCurrentMonth = monthKey === currentMonthKey;

    const toAdd      = [];
    const newLog     = { ...generationLog };
    let   logChanged = false;

    for (const template of templates) {
      if (!template.isActive) continue;

      // Skip months before this template was created
      if (monthKey < template.createdAt) continue;

      const logKey = `${template.id}_${monthKey}`;
      if (newLog[logKey]) continue; // already processed for this month

      // For the current month, wait until the scheduled day has actually arrived
      if (isCurrentMonth && template.dayOfMonth > today.getDate()) continue;

      // Clamp the day to the real last day of the target month
      // (handles edge cases like dayOfMonth=31 in February → Feb 28/29)
      const maxDay    = new Date(year, month, 0).getDate();
      const actualDay = Math.min(template.dayOfMonth, maxDay);
      const dateStr   = `${year}-${String(month).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;

      toAdd.push({
        date:     dateStr,
        desc:     template.name,
        category: template.category,
        price:    template.amount,
        cardPay:  template.cardPay,
        whoPaid:  template.whoPaid,
        cardType: template.cardType,
        costType: 'fixed', // permanent templates always land in the Fixed Costs section
      });

      newLog[logKey] = true;
      logChanged     = true;
    }

    if (toAdd.length > 0) bulkAddExpenses(toAdd);
    if (logChanged)       persistLog(newLog);
  }, [templates, generationLog, persistLog]);

  return {
    templates,
    addTemplate, updateTemplate, deleteTemplate, toggleTemplate,
    generateForMonth,
  };
}
