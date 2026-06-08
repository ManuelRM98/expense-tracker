# 09 — Data Flow and State Management

*Verified against codebase on 2026-06-08.*

---

## STATE-01: Income Data From Prior Years Is Never Fetched

**Severity**: High
**File**: `expense-tracker/src/hooks/useExpenses.js`, lines 15–16 and 22; `expense-tracker/src/services/api.js` line 179

### Description

On mount, the hook fetches income entries for only the current year:

```js
const currentYear = new Date().getFullYear();
// ...
api.getAllIncomeEntries(currentYear)  // GET /income?year=2026
```

`getAllIncomeEntries(year)` calls `GET /income?year=YYYY`, which filters by `month_key LIKE "{year}-%"`. When a user navigates to a month in any prior year:

- `getIncome("2025-12")` returns 0 (no 2025 entries in memory)
- `ensureSalaryForMonth("2025-12")` finds no existing salary entry (checking in-memory `incomeEntries`) and creates a new one, even if one already exists in the database — potentially creating duplicate salary entries
- `AnnualDashboard` for year 2025 shows zero income in all monthly rows and the totals card

The backend `/income` endpoint supports both `?month_key=YYYY-MM` and `?year=YYYY` filtering (verified in `income.py` lines 13–23), but the frontend never fetches prior years.

---

## STATE-02: `generateForMonth` Race Condition Can Add Duplicate Expenses to UI

**Severity**: Medium
**File**: `expense-tracker/src/App.jsx`, lines 148–152; `expense-tracker/src/hooks/useFixedExpenses.js`, lines 40–45

### Description

```js
// App.jsx
useEffect(() => {
  generateForMonth(monthKey, bulkAddExpenses);  // async, returns generated[]
  ensureSalaryForMonth(monthKey);
  loadMonthBudget(monthKey);
}, [monthKey]);
```

```js
// useFixedExpenses.js
const generateForMonth = useCallback(async (monthKey, bulkAddExpenses) => {
  const generated = await api.generateForMonth(monthKey);
  if (generated.length > 0) {
    bulkAddExpenses(generated);
  }
}, []);
```

If the user navigates away from a month and back before the first `api.generateForMonth` call resolves (e.g., navigating rapidly with arrow keys), two calls may be in-flight simultaneously. The backend's `FixedExpenseLog` prevents double-insert in the database. However:

- The first call resolves and calls `bulkAddExpenses(generated)`, adding expenses to UI state
- The second call also resolves with the same data (since the log was written by the first) — but the backend returns an **empty array** on the second call (all templates already logged), so `bulkAddExpenses` is not called

Actually the second call returns `[]` because the log prevents regeneration — so duplicates in the UI **do not occur** from this specific race. However, if both calls fire before the first `db.commit()` completes (very unlikely with SQLite's serialized writes), both might succeed and return the same rows, which would cause `bulkAddExpenses` to be called twice with the same expense IDs. React would render duplicates in the UI (since the expense list uses `[...prev, ...completedExpenses]` without deduplication by ID).

The risk is extremely low in practice but the correctness relies on SQLite's implicit serialization, which would not hold with PostgreSQL.

---

## STATE-03: Three API Calls Fire on Every Month Navigation

**Severity**: Medium
**File**: `expense-tracker/src/App.jsx`, lines 148–152

### Description

```js
useEffect(() => {
  generateForMonth(monthKey, bulkAddExpenses);  // POST /fixed-expenses/generate/{month_key}
  ensureSalaryForMonth(monthKey);               // may POST /income
  loadMonthBudget(monthKey);                    // GET /budget/{month_key}
}, [monthKey]);
```

Every time the user clicks the previous/next month arrow, three API calls are fired:

1. `POST /fixed-expenses/generate/{month_key}` — no-op for already-generated months, but still incurs a round-trip
2. `POST /income` (inside `ensureSalaryForMonth`) — only fires if no salary entry exists for the month and `baseSalary > 0`
3. `GET /budget/{month_key}` — fetches the effective budget

For historical months already fully populated, calls 1 and 2 are no-ops on the server. A user rapidly clicking through 12 months fires 36 requests. The `generateForMonth` and `ensureSalaryForMonth` calls could be guarded by a client-side `Set` of "already initialized" month keys:

```js
const initializedMonths = useRef(new Set());

useEffect(() => {
  if (!initializedMonths.current.has(monthKey)) {
    initializedMonths.current.add(monthKey);
    generateForMonth(monthKey, bulkAddExpenses);
    ensureSalaryForMonth(monthKey);
  }
  loadMonthBudget(monthKey);  // always fetch — budget may have changed
}, [monthKey]);
```

---

## STATE-04: Budget Snapshot Misses Months That Have Expenses But No Income

**Severity**: Medium
**File**: `expense-tracker/src/hooks/useBudget.js`, lines 34–60; `expense-tracker/src/App.jsx`, lines 384–388

### Description

```js
// App.jsx — saveDefaultBudget call
const knownMonthKeys = [...new Set(incomeEntries.map(e => e.monthKey))];
return saveDefaultBudget(pcts, knownMonthKeys);
```

```js
// useBudget.js — saveDefaultBudget
const pastMonthsToSnapshot = knownMonthKeys.filter(
  mk => mk < currentMonthKey && !monthOverrides[mk]
);
```

When the user changes the global default budget, the system snapshots past months that don't yet have an override, preserving their current effective budget. The list of "known" past months comes exclusively from months that have at least one income entry.

A month that has expenses but no income entry (e.g., a month where the user only recorded variable expenses, without adding a salary entry) is invisible to this logic and will retroactively reflect the new default budget allocation. Historical budget analysis for those months will silently change.

---

## STATE-05: Deleted Expenses Leave Dangling `linked_expense_id` in Debts

**Severity**: Low
**File**: `expense-tracker/src/App.jsx`, lines 249–254; `expense-tracker-api/models.py` line 112

### Description

```js
// App.jsx — handleDelete
function handleDelete(id) {
  askConfirm({
    title: 'Delete expense',
    message: 'This action cannot be undone.',
    onConfirm: () => { closeConfirm(); deleteExpense(id); showToast('Expense deleted.'); },
  });
}
```

When an expense is deleted, no action is taken on any `Debt` that has `linked_expense_id` pointing to that expense. The `Debt` model stores `linked_expense_id` as a plain `String` with no foreign key constraint (only a comment "optional FK to expenses.id" in the model, line 112). After deletion:

- The database retains the debt with a stale `linked_expense_id`
- The frontend's `debts` state (loaded once on mount from `useDebts`) continues to show the link
- `DebtsPage` may display a link that references a non-existent expense

This is an accepted trade-off for a personal tool without referential integrity enforcement, but it is undocumented.

---

## STATE-06: `toastTimer` Stored in State — Extra Renders and Stale Closure

**Severity**: Low
**File**: `expense-tracker/src/App.jsx`, lines 115, 211–216

### Description

```js
const [toastTimer, setToastTimer] = useState(null);  // line 115

function showToast(msg) {
  setToast(msg);
  if (toastTimer) clearTimeout(toastTimer);  // toastTimer is stale if called rapidly
  const t = setTimeout(() => setToast(''), 2400);
  setToastTimer(t);  // second render per toast
}
```

Documented in BUG-05 as well. Summary of the two problems:

1. **Extra render**: `setToastTimer(t)` triggers a second re-render for every `showToast` call — once for `setToast(msg)` and once for `setToastTimer(t)`. In React 18+, both state updates in the same synchronous function are batched, so this actually only causes one render. However, `showToast` is a regular function (not inside a hook), so the batching behavior is less predictable.

2. **Stale closure**: `showToast` captures `toastTimer` at the time the function body is evaluated. If `showToast` is called twice in rapid succession before the first `setToastTimer` re-render completes, the second call reads the old `toastTimer` value (the one from before the first call's `setToastTimer` executed) and may fail to clear the first timer.

**Correction**: Use `useRef` for the timer handle. See BUG-05 for the fix pattern.

---

## STATE-07: `useBudget` Initial Load Swallows All Errors Silently

**Severity**: Medium
**File**: `expense-tracker/src/hooks/useBudget.js`, lines 12–25

### Description

```js
useEffect(() => {
  Promise.all([
    api.getDefaultBudget(),
    api.getAllBudgetOverrides(),
  ])
    .then(([def, overrides]) => {
      setDefaultBudget(def);
      const map = {};
      overrides.forEach(o => { map[o.monthKey] = o; });
      setMonthOverrides(map);
    })
    .catch(() => {})   // swallows ALL errors
    .finally(() => setBudgetLoaded(true));
}, []);
```

The `.catch(() => {})` silently discards any error from the initial budget load. If the API is down or returns an error, the hook silently falls back to the hardcoded `FALLBACK` values (`{ fixed_pct: 50, variable_pct: 30, savings_pct: 20 }`). The user sees the app load normally with default budget values, with no indication that their configured budget could not be loaded.

This is especially problematic for users who have configured custom budget overrides — they will see wrong numbers without any warning.
