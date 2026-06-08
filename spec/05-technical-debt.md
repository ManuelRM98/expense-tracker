# 05 — Technical Debt

*Verified against codebase on 2026-06-08.*

---

## DEBT-01: Ad-Hoc SQL Migrations in `main.py` — No Migration Tooling

**Severity**: High
**File**: `expense-tracker-api/main.py`, lines 35–45

### Description

```python
def run_migrations():
    with engine.connect() as conn:
        for sql in [
            "ALTER TABLE card_types ADD COLUMN cut_off_day INTEGER",
            "ALTER TABLE expenses ADD COLUMN billing_month VARCHAR",
        ]:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # column already exists
```

Schema migrations are expressed as raw `ALTER TABLE` statements executed at application startup with bare `except Exception: pass` to suppress "column already exists" errors. Problems:

1. **No history**: There is no record of which migrations have been applied. If a migration partially executes and fails mid-statement (disk full, lock contention), the `except: pass` silently swallows the failure.
2. **No rollback**: Schema changes are permanent with no down-migration path.
3. **Scaling ceiling**: Only `ADD COLUMN` is supported. Data transformations (renaming columns, changing types, backfilling data) cannot be expressed this way.
4. **Exception over-catching**: `except Exception: pass` catches syntax errors, type errors, and connection failures — not just "column already exists" errors.
5. **Module-level execution**: `run_migrations()` is called at line 47, before the FastAPI app object is constructed. Any test that imports `main` will trigger migration attempts against the database.

Alembic is the standard migration tool for SQLAlchemy projects and trivially supports both SQLite and PostgreSQL.

---

## DEBT-02: `App.jsx` Is a 924-Line God Component

**Severity**: High
**File**: `expense-tracker/src/App.jsx`

### Description

`App.jsx` is 924 lines and is responsible for:

- URL parsing and view derivation (8 named views: `home`, `month`, `debts`, `settings`, `cards`, `budgetAllocation`, `globalSalary`, `permanentFixed`)
- All modal open/close state (at least 6 modals: expense, saving, income entry, confirm dialog, plus edit/clone variants)
- All CRUD orchestration for expenses, savings, income, debts (calling into hooks and wiring results to toasts)
- Toast notification management
- Confirm dialog management
- Theme management (dark mode toggle + localStorage persistence)
- All monthly summary calculations (7 inline aggregates, lines 171–179)
- The entire render tree for every view — all 8 views are rendered/hidden conditionally inside one component
- 204 lines of inline style objects (`const s = { ... }`, lines 721–924)

This violates the Single Responsibility Principle at every layer. The component is difficult to test, reason about, or modify in isolation.

**Observation**: React Router v7 is installed but `<Routes>` and `<Route>` are never used. The routing library is used only as an imperative history/location manager (`useNavigate`, `useLocation`). The natural fix for the god component is to introduce actual routes — each view becomes a `<Route>` element with its own component file.

---

## DEBT-03: `useExpenses` Hook Owns Too Many Concerns

**Severity**: High
**File**: `expense-tracker/src/hooks/useExpenses.js`

### Description

The `useExpenses` hook manages seven distinct domains in a single 224-line file:

1. Expenses (CRUD: add, bulkAdd, update, delete)
2. Card types (CRUD: add, remove, updateCutOff)
3. Expense categories (CRUD: add, remove)
4. Savings (CRUD: add, update, delete)
5. Saving categories (CRUD: add, remove)
6. Income entries (CRUD: add, update, delete + getIncome + getIncomeEntries)
7. Base salary (read from GlobalConfig, auto-create salary entries per month, propagate to future months)

The hook's return object exposes 22 values. Splitting into `useExpenses`, `useSavings`, `useIncome`, and `useCategories` would improve testability, co-location of related logic, and readability.

---

## DEBT-04: Frontend Generation Logic Is Now Dead Code

**Severity**: Medium
**File**: `expense-tracker/src/hooks/useFixedExpenses.js`

### Description

The prior spec version of this finding documented that generation logic was duplicated between frontend and backend. The current `useFixedExpenses.js` (lines 40–45) has been correctly updated: it simply calls `api.generateForMonth(monthKey)` and delegates entirely to the server. There is no local generation logic in the frontend hook.

**However**, the comment on line 35–38 says "The server replicates all generation logic" — this is backwards. The server is the authoritative implementation; the comment should say the server owns the logic. The `CLAUDE.md` file still describes the original `localStorage`-based architecture with no backend, further confusing the history.

**Status**: The duplication is resolved. The remaining issue is documentation accuracy.

---

## DEBT-05: `who_paid` Is a Free-Text Field with No Reference Data

**Severity**: Medium
**File**: `expense-tracker-api/models.py` (Expense line 14, Saving — absent, FixedExpenseTemplate line 61); `expense-tracker/src/components/ExpenseModal.jsx`

### Description

`who_paid` is stored as an arbitrary string. The `ByPersonChart` in `Charts.jsx` (lines 112–133) groups expenses by `e.whoPaid` using an object key accumulator:

```js
expenses.forEach(e => { map[e.whoPaid] = (map[e.whoPaid] || 0) + e.price; });
```

A typo (`"me"` vs `"Me"` vs `"Manuel"`) silently creates separate chart segments. Unlike `category` and `card_type`, which have managed reference tables (`expense_categories`, `card_types`), `who_paid` has no such table. The frontend does not provide a dropdown for this field — it is a free-text input.

---

## DEBT-06: `billing_month` Stored as Unvalidated String

**Severity**: Low
**File**: `expense-tracker-api/models.py` line 17; `expense-tracker-api/schemas.py` line 17

### Description

```python
billing_month: str | None = None   # "YYYY-MM"; None = use date for month filtering
```

`billing_month` is stored as a `VARCHAR` with no format enforcement. The Pydantic schema annotates it as `str | None` with no regex validator. An invalid value like `"not-a-month"` or `"2025-13"` would be stored and silently cause month-filtering queries to never match — neither the OR condition in `expenses.py` nor the client-side `billingMonth ?? e.date.substring(0, 7)` would behave correctly.

**Correction**: Add a Pydantic field validator:

```python
from pydantic import field_validator
import re

@field_validator('billing_month')
@classmethod
def validate_billing_month(cls, v):
    if v is not None and not re.match(r'^\d{4}-\d{2}$', v):
        raise ValueError("billing_month must be in YYYY-MM format")
    return v
```

---

## DEBT-07: Inline Styles — No Media Queries, No Responsive Layout

**Severity**: Low
**File**: All component files (`App.jsx`, `Charts.jsx`, `AnnualDashboard.jsx`, etc.)

### Description

All styling uses inline JS objects (`style={{ ... }}`). Practical costs:

- **No media queries**: The layout uses a fixed `flex` direction with no `flex-wrap` or breakpoint handling. On small screens, the sidebar and content area will overflow horizontally.
- **No pseudo-classes**: `:hover`, `:focus`, `:active` states require `onMouseEnter`/`onMouseLeave` event handlers — none are implemented in the current codebase.
- **Duplication**: Common values (border radii, shadows, spacing) are repeated literally across files rather than composed from constants or a shared theme object.
- **Performance (minor)**: Each render creates new object references for style props, which can force unnecessary DOM reconciliation. In practice React batches these and the impact is negligible at this scale.

---

## DEBT-08: `venv/pyvenv.cfg` Tracks Only Config, But Is Still Unnecessary

**Severity**: Low
**File**: `expense-tracker-api/venv/pyvenv.cfg`

### Description

Confirmed via `git ls-files`: the `venv/` directory itself contains `pyvenv.cfg` tracked in git. The venv uses Python 3.14.2 locally while the Dockerfile uses `python:3.11-slim` — a three-major-version gap.

`pyvenv.cfg` contains the full absolute path to the local Python interpreter:
```
command = /opt/homebrew/opt/python@3.14/bin/python3.14 -m venv ...
```

This path is machine-specific and meaningless to any other developer or CI environment. The file should be in `.gitignore`.

---

## DEBT-09: CLAUDE.md Is Completely Outdated — Documents a Different Architecture

**Severity**: Medium
**File**: `expense-tracker/CLAUDE.md`

### Description

The `CLAUDE.md` file documents the **original localStorage-only architecture** that predates the FastAPI backend. Specific inaccuracies:

- "All data is persisted in `localStorage` — there is no backend or database." (This is false — the backend is the data layer)
- Documents `expensetrack_v1` and `expensetrack_cards_v1` as the storage keys (these no longer exist)
- Documents `uid()` from `format.js` as the ID strategy (actual IDs are `uuid4()` from the Python backend)
- `useExpenses.js` description says "reads from and writes to two localStorage keys" (it now makes HTTP API calls)
- Charts.jsx description lists only 4 chart components (`CardVsCashChart`, `ByCardTypeChart`, `ByPersonChart`, `MonthlyTrendChart`) — the actual file exports 9 chart components

This document will actively mislead any contributor or AI assistant that reads it. It needs a complete rewrite to reflect the current FastAPI + SQLite + React architecture.
