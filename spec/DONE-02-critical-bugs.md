# 02 — Critical Bugs

*Verified against codebase on 2026-06-08.*

---

## BUG-01: `models.Income` Does Not Exist — Analytics Endpoints Crash at Runtime

**Severity**: Critical
**File**: `expense-tracker-api/routers/analytics.py`, lines 26–27, 30, 74–76, 80, 90
**Status**: Confirmed — latent crash on every call to the analytics endpoints

### Description

The analytics router references `models.Income` in four distinct places:

```python
# Line 26-27 (_month_summary function)
income_row = db.query(models.Income).filter(
    models.Income.month_key == month_key
).first()

# Line 30
income = income_row.amount if income_row else 0

# Line 74-76 (annual_summary function)
income_rows = db.query(models.Income).filter(
    models.Income.month_key.like(f"{year}-%")
).all()

# Line 80
total_income = sum(r.amount for r in income_rows)

# Line 90
income_map = {r.month_key: r.amount for r in income_rows}
```

The actual model is `IncomeEntry` (defined in `models.py` line 40), and the income field is `amount_cop` (line 50), not `amount`. There is no `Income` class anywhere in the codebase. The `_month_summary` helper is called by both `GET /analytics/monthly/{month_key}` and `GET /analytics/annual/{year}`.

### Impact

Every call to these three endpoints raises `AttributeError: module 'models' has no attribute 'Income'`:
- `GET /analytics/monthly/{month_key}`
- `GET /analytics/annual/{year}`

The `/analytics/trend` endpoint is unaffected (it does not reference income).

Additionally, even when `models.Income` is fixed to `models.IncomeEntry`, the `.amount` field references must be changed to `.amount_cop`, and the single-row `.first()` assumption in `_month_summary` must be replaced with aggregation across all entries for the month — `IncomeEntry` allows multiple entries per month (salary, bonus, other).

### Root Cause

The model was renamed from `Income` to `IncomeEntry` when multi-entry income was introduced, but `analytics.py` was never updated.

---

## BUG-02: `ensureSalaryForMonth` Fires Before `baseSalary` Is Loaded

**Severity**: High
**File**: `expense-tracker/src/App.jsx` line 150; `expense-tracker/src/hooks/useExpenses.js` lines 14–34 and 151–153

### Description

`App.jsx` calls `ensureSalaryForMonth(monthKey)` inside a `useEffect` that fires on every `monthKey` change (line 148–152):

```js
useEffect(() => {
  generateForMonth(monthKey, bulkAddExpenses);
  ensureSalaryForMonth(monthKey);  // line 150
  loadMonthBudget(monthKey);
}, [monthKey]); // eslint-disable-line react-hooks/exhaustive-deps
```

`baseSalary` is initialized to `0` (line 11 of `useExpenses.js`) and is only set after the `Promise.all` in the `useEffect` at line 14 resolves. On initial mount, the `monthKey` effect fires on the same tick as the data-loading effect, before the API responds.

`ensureSalaryForMonth` guards with `if (baseSalary <= 0) return;` (line 152), so the first call silently no-ops. The salary entry for the current month is never auto-created on first page load.

### Impact

A user who navigates directly to any month on first load will not have the salary entry auto-created. They must manually reload or navigate away and back after the data loads. This is a silent data integrity issue — no error is shown.

### Root Cause

No loading gate coordinates `baseSalary` readiness with the `monthKey` effect.

---

## BUG-03: Analytics Monthly and Annual Endpoints Ignore `billing_month` Override

**Severity**: High
**File**: `expense-tracker-api/routers/analytics.py`, lines 20–21, 68–70, 83–86

### Description

The `_month_summary` function and the annual summary both filter expenses using only the `date` column:

```python
# _month_summary (line 20-21)
expenses = db.query(models.Expense).filter(
    models.Expense.date.like(f"{month_key}%")
).all()

# annual_summary (line 68-70)
expenses = db.query(models.Expense).filter(
    models.Expense.date.like(f"{year}-%")
).all()

# Annual grouping (line 83-86)
for e in expenses:
    exp_by_month[str(e.date)[:7]] += e.price
```

The `expenses.py` router (lines 28–33) and the frontend `monthExpenses` memo in `App.jsx` (lines 155–161) both respect `billing_month` when set: an expense with `date = 2025-01-15` and `billing_month = 2025-02` appears in February in all other views, but appears in January in analytics views. This is a permanent inconsistency between the analytics endpoints and every other view in the application.

### Impact

The analytics endpoints return figures that do not match what the user sees in the monthly view. Credit card expenses (which commonly have billing dates different from transaction dates) will be systematically misattributed in analytics.

---

## BUG-04: Deleted Debt Payments — Cascade Not Active in SQLite

**Severity**: Medium
**File**: `expense-tracker-api/routers/debts.py`, lines 73–77; `expense-tracker-api/models.py` line 122; `expense-tracker-api/database.py`

### Description

```python
# debts.py line 72-78
@router.delete("/{debt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_debt(debt_id: str, db: Session = Depends(get_db)):
    debt = _get_debt_or_404(db, debt_id)
    db.query(models.DebtPayment).filter(models.DebtPayment.debt_id == debt_id).delete()
    db.delete(debt)
    db.commit()
```

The `DebtPayment` model declares `ForeignKey("debts.id", ondelete="CASCADE")` (models.py line 122). However, `database.py` creates the SQLite engine without a connection event that sets `PRAGMA foreign_keys = ON`. SQLite does not enforce foreign key constraints (including CASCADE behavior) by default. The explicit manual delete on line 75 is the only thing preventing orphaned payment rows.

This is currently not a bug in practice (the manual delete works), but the intent of the `ondelete="CASCADE"` declaration is misleading: it only takes effect in PostgreSQL or when `PRAGMA foreign_keys = ON` is explicitly set for each SQLite connection. If the explicit delete line is ever removed (assuming CASCADE handles it), orphaned rows will silently accumulate.

### Correction Required

Add a SQLAlchemy connection event to enable `PRAGMA foreign_keys = ON` for SQLite connections:

```python
from sqlalchemy import event

if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
```

---

## BUG-05: `toastTimer` State Causes Memory Leak and Stale Closure in StrictMode

**Severity**: Low
**File**: `expense-tracker/src/App.jsx`, lines 115 and 211–216

### Description

```js
const [toastTimer, setToastTimer] = useState(null);  // line 115

function showToast(msg) {
  setToast(msg);
  if (toastTimer) clearTimeout(toastTimer);  // reads state captured at definition time
  const t = setTimeout(() => setToast(''), 2400);
  setToastTimer(t);  // triggers a second render
}
```

`toastTimer` is stored as React state. This causes two problems:

1. **Stale closure**: The `toastTimer` value read inside `showToast` is the value captured when the function was last defined. If `showToast` is called in rapid succession, the closure may read a stale timer ID and fail to clear the previous timer, resulting in two simultaneous timers fighting to clear the toast.

2. **Double render**: Every `showToast` call triggers two renders: one for `setToast(msg)` and one for `setToastTimer(t)`. In React StrictMode (active in `main.jsx`), effects and state setters are double-invoked in development, making this behavior harder to reason about.

The correct pattern is a `useRef` for the timer handle, which holds the current value across renders without triggering re-renders:

```js
const toastTimerRef = useRef(null);

function showToast(msg) {
  setToast(msg);
  if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  toastTimerRef.current = setTimeout(() => setToast(''), 2400);
}
```

---

## BUG-06: `AnnualDashboard` Ignores `billing_month` — Expenses Appear in Wrong Month

**Severity**: Medium
**File**: `expense-tracker/src/components/AnnualDashboard.jsx`, lines 17–19 and 31

### Description

```js
const yearExpenses = useMemo(() =>
  expenses.filter(e => parseInt(e.date.split('-')[0]) === year),
  [expenses, year]
);

// Line 31 — groups by date month index
const mExp = yearExpenses.filter(e => parseInt(e.date.split('-')[1]) === m);
```

`AnnualDashboard` filters and groups expenses exclusively by `e.date`, never by `e.billingMonth`. The `monthExpenses` memo in `App.jsx` (lines 155–161) correctly uses `e.billingMonth ?? e.date.substring(0, 7)`. A credit card expense with `date = 2025-01-15` and `billingMonth = 2025-02` will appear in January in the annual dashboard but in February in the monthly view — a permanent, silent inconsistency between the two views.

This is a frontend-only analog of BUG-03 (which is the same inconsistency on the backend analytics side).

---

## BUG-07: `MonthlyTrendChart` Ignores `billing_month` — Same Inconsistency in Charts

**Severity**: Low
**File**: `expense-tracker/src/components/Charts.jsx`, lines 147–153

### Description

```js
const data = months.map(m => {
  const total = expenses
    .filter(e => {
      const [y, mo] = e.date.split('-');  // uses e.date, not billingMonth
      return parseInt(y) === m.year && parseInt(mo) - 1 === m.month;
    })
    .reduce((s, e) => s + e.price, 0);
```

`MonthlyTrendChart` groups expenses by `e.date`, not by `e.billingMonth`. The same credit-card-vs-transaction-date inconsistency from BUG-06 applies here. `SavingsTrendChart` (lines 389–395) has the same pattern, though savings do not use `billing_month`.
