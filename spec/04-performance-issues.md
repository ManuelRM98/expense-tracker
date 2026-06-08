# 04 — Performance Issues

*Verified against codebase on 2026-06-08.*

---

## PERF-01: N+1 Query Pattern in `GET /debts`

**Severity**: High
**File**: `expense-tracker-api/routers/debts.py`, lines 47–50

### Description

```python
@router.get("", response_model=list[schemas.DebtOut])
def get_debts(db: Session = Depends(get_db)):
    debts = db.query(models.Debt).order_by(models.Debt.created_date.desc()).all()
    return [_build_debt_out(d, _get_payments(db, d.id)) for d in debts]
```

`_get_payments` (lines 38–44) issues a separate `SELECT ... FROM debt_payments WHERE debt_id = ?` for every debt row returned. With N debts, this produces N+1 database round-trips. For a user with 50 debts, this is 51 queries per page load.

There is no `relationship` defined between `Debt` and `DebtPayment` in `models.py`, so SQLAlchemy cannot use lazy or eager loading automatically.

### Correction Pattern

Perform a single bulk payment query, then group in Python:

```python
from collections import defaultdict

def get_debts(db: Session = Depends(get_db)):
    debts = db.query(models.Debt).order_by(models.Debt.created_date.desc()).all()
    debt_ids = [d.id for d in debts]
    all_payments = db.query(models.DebtPayment).filter(
        models.DebtPayment.debt_id.in_(debt_ids)
    ).order_by(models.DebtPayment.date.asc()).all()
    payments_by_debt = defaultdict(list)
    for p in all_payments:
        payments_by_debt[p.debt_id].append(p)
    return [_build_debt_out(d, payments_by_debt[d.id]) for d in debts]
```

This reduces N+1 queries to exactly 2 queries regardless of the number of debts.

---

## PERF-02: `GET /analytics/trend` Issues 2×N Database Queries in a Python Loop

**Severity**: High
**File**: `expense-tracker-api/routers/analytics.py`, lines 127–163

### Description

```python
for i in range(months - 1, -1, -1):
    ...
    exp_total = sum(
        e.price for e in db.query(models.Expense).filter(
            models.Expense.date.like(f"{month_key}%")
        ).all()
    )
    sav_total = sum(
        s.price for s in db.query(models.Saving).filter(
            models.Saving.date.like(f"{month_key}%")
        ).all()
    )
```

For the default `months=12`, this is 24 separate `SELECT` queries. Each uses a `LIKE` prefix scan on the `date` column, which has no index defined in `models.py` — only the `id` and `month_key` fields have `index=True`. On a growing dataset, this endpoint will degrade linearly with data volume.

### Correction Pattern

Replace the loop with a single aggregation query per entity type using `func.strftime` and `func.sum`:

```python
from sqlalchemy import func

def expense_trend(months: int = 12, db: Session = Depends(get_db)):
    exp_rows = (
        db.query(
            func.strftime('%Y-%m', models.Expense.date).label('month'),
            func.sum(models.Expense.price).label('total'),
        )
        .group_by('month')
        .all()
    )
    # Map into a dict for O(1) lookup, then build points list
```

This reduces 24 queries to 2 queries regardless of the months parameter.

---

## PERF-03: Frontend Fetches All Expenses and Savings Without Month Filter

**Severity**: High
**File**: `expense-tracker/src/hooks/useExpenses.js`, lines 16–25; `expense-tracker/src/services/api.js` lines 107–110

### Description

```js
// useExpenses.js lines 16-17
api.getExpenses(),   // GET /expenses — no ?month= filter, returns ALL rows
api.getSavings(),    // GET /savings — no ?month= filter, returns ALL rows
```

On mount, the frontend fetches the entire `expenses` and `savings` tables. Both API endpoints support `?month=YYYY-MM` query parameter filtering (implemented in `expenses.py` line 21 and `savings.py` line 19), but neither is used by the hooks. All month filtering is performed client-side via `useMemo` in `App.jsx` (lines 155–168).

As the dataset grows over years of use, the payload and browser memory usage grow without bound. A user with 36 months of daily expenses (~1,100 records) transfers and parses all of them on every page load, with the vast majority discarded after filtering.

### Correction Pattern

Fetch only the current and adjacent months on initial load; fetch additional months lazily when the user navigates. The server-side filtering is already implemented and correct (including the `billing_month` OR logic in `expenses.py`).

---

## PERF-04: Monthly Summary Aggregates Recomputed on Every Render

**Severity**: Medium
**File**: `expense-tracker/src/App.jsx`, lines 171–179

### Description

```js
const income        = getIncome(monthKey);         // useCallback — re-filters incomeEntries
const totalExp      = monthExpenses.reduce((s, e) => s + e.price, 0);
const remaining     = income - totalExp - totalSav;
const cardTotal     = monthExpenses.filter(e => e.cardPay === 'Yes').reduce((s, e) => s + e.price, 0);
const cashTotal     = totalExp - cardTotal;
const totalFixed    = monthExpenses.filter(e => e.costType === 'fixed').reduce((s, e) => s + e.price, 0);
const totalVariable = monthExpenses.filter(e => e.costType !== 'fixed').reduce((s, e) => s + e.price, 0);
```

`monthExpenses` and `monthSavings` are correctly memoized with `useMemo`. However, the seven derived aggregates computed from them are computed inline (not wrapped in `useMemo`), so they rerun on every render of `App.jsx` — including renders triggered by unrelated state changes: modal open/close, toast show, dark mode toggle, or any `useState` update anywhere in the component.

`getIncome` is a `useCallback` that filters the full `incomeEntries` array on every call. It is called three times per render: once for the income banner (line 171), once in the savings summary row (line 517), and once implicitly via the `remaining` calculation. Each call re-filters the full `incomeEntries` array.

---

## PERF-05: `LIKE`-Based Date Filtering on Unindexed Column

**Severity**: Medium
**File**: `expense-tracker-api/routers/expenses.py` line 31; `routers/savings.py` line 23; `routers/analytics.py` lines 20, 23, 68, 72, 149, 153

### Description

Date-range filtering uses `LIKE` prefix patterns on the `date` column:

```python
models.Expense.date.like(f"{month_key}%")
models.Saving.date.like(f"{month_key}%")
```

The `date` column in `Expense`, `Saving`, `FixedExpenseTemplate`, and `Debt` is defined as `Column(Date, nullable=False)` with no `index=True`. SQLite stores `Date` columns as TEXT and can use an index for a LIKE prefix scan only when an index exists. Without an explicit index, every date-filtered query performs a full table scan.

For the billing_month OR filter in `expenses.py` (line 28–33):

```python
q = q.filter(
    or_(
        models.Expense.billing_month == month,
        (models.Expense.billing_month == None) & models.Expense.date.like(f"{month}%"),
    )
)
```

SQLite cannot use a single index efficiently across both branches of an `OR`. Adding a composite index on `(billing_month, date)` would help, but the `OR` still requires a full scan on the second branch where `billing_month IS NULL`.

### Correction

Add `index=True` to `date` columns in the affected models. For the billing_month filter, consider a generated column or a denormalized `effective_month` column that stores `billing_month ?? date[:7]` as an indexed VARCHAR.

---

## PERF-06: Income Entries Only Loaded for Current Year — Prior Years Show Zero

**Severity**: Low
**File**: `expense-tracker/src/hooks/useExpenses.js`, lines 15–16 and 22

### Description

```js
const currentYear = new Date().getFullYear();
// ...
api.getAllIncomeEntries(currentYear)  // Only fetches year=YYYY
```

`getAllIncomeEntries(year)` calls `GET /income?year=2026`, which returns only entries matching `month_key LIKE "2026-%"`. When a user navigates to a month in a previous year (e.g., December 2025), `getIncome("2025-12")` returns 0 because no entries for 2025 are in the `incomeEntries` array. This affects:

- The income banner on the month view
- All summary calculations (remaining, savings target)
- The `AnnualDashboard` when navigated to a prior year
- The `ensureSalaryForMonth` guard (it reads `incomeEntries` to check for an existing salary entry before creating one)

This is the same finding as PERF-06 and STATE-01 in the prior audit — it is a functional bug, not just a performance issue.
