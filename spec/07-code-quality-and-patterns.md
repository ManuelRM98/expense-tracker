# 07 — Code Quality and Patterns

*Verified against codebase on 2026-06-08.*

---

## QUAL-01: No Error Handling in Frontend Hook Mutations — Failures Are Silent

**Severity**: High
**File**: `expense-tracker/src/hooks/useExpenses.js`, `useFixedExpenses.js`, `useDebts.js`, `App.jsx`

### Description

Every `useCallback` in the hooks performs `await api.someCall()` with no `try/catch`. Confirmed: `grep -n "try\|catch"` finds zero occurrences in all three hook files. Errors propagate as unhandled promise rejections.

The call sites in `App.jsx` also have no `try/catch`:

```js
// App.jsx lines 224-247 — handleSave
async function handleSave({ debtEntries, ...data }) {
  let expenseId;
  if (editing) {
    await updateExpense(editing.id, data);  // no try/catch
    expenseId = editing.id;
    showToast('Expense updated.');  // fires before knowing if the update succeeded
  } else {
    const created = await addExpense(data);  // no try/catch
    expenseId = created?.id;
    showToast('Expense added.');
  }
  // ...
}
```

Note: `showToast('Expense updated.')` fires **before** any failure would be detected — the await is above the toast, so if `updateExpense` throws, the "Expense updated." toast has not yet shown, but the modal has not closed either (closing happens at the call site in `onSave`). The result: the modal closes but no success or failure feedback is given if the API returns an error.

The only exception is `useBudget.js` (line 23): `.catch(() => {})` — which silently swallows errors, hiding failures entirely.

---

## QUAL-02: `import models` Duplicated at Module Level in `main.py`

**Severity**: Low
**File**: `expense-tracker-api/main.py`, lines 8 and 13

### Description

```python
import models  # noqa: F401 — line 8
from database import SessionLocal
import models  # line 13 — duplicate, no noqa comment
```

`models` is imported twice at module level. Python's import system returns the cached module on the second import, so this is harmless at runtime. However, it indicates the file was grown piece by piece without cleanup, and it suppresses linter detection (the first import has `# noqa: F401` for "imported but unused", which is needed because the import is a side-effect import — but the second import is silently redundant).

---

## QUAL-03: `seed_defaults()` and `run_migrations()` Execute at Import Time

**Severity**: Medium
**File**: `expense-tracker-api/main.py`, lines 47–48

### Description

```python
run_migrations()   # line 47
seed_defaults()    # line 48

app = FastAPI(...)  # line 51 — app constructed AFTER DB operations
```

Both functions are called at module level before the `FastAPI` app object is constructed. Consequences:

1. **Test pollution**: Any test that imports `main` will attempt a database connection and run migrations/seeding, even for tests that have nothing to do with startup behavior.
2. **Import cost**: Tooling that introspects the module (type checkers, `fastapi-cli`, documentation generators) will perform database operations.
3. **Alembic incompatibility**: If Alembic is introduced, it imports `main.py` to discover the app — triggering migrations twice.

**Correction**: Use FastAPI's `lifespan` context manager:

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()
    seed_defaults()
    yield

app = FastAPI(lifespan=lifespan, title="Expense Tracker API", ...)
```

---

## QUAL-04: `MonthlyTrendChart` Prop Naming Ambiguity

**Severity**: Medium
**File**: `expense-tracker/src/App.jsx` line 594; `expense-tracker/src/components/Charts.jsx` line 137

### Description

```jsx
<MonthlyTrendChart expenses={expenses} />  {/* all-time expenses, line 594 */}
```

`MonthlyTrendChart` receives the entire `expenses` array (all-time), while every other chart in the analytics sub-tabs receives `monthExpenses`:

```jsx
<ExpensesByCategoryChart expenses={monthExpenses} />
<FixedVsVariableChart expenses={monthExpenses} />
<CardVsCashChart expenses={monthExpenses} />
<ByCardTypeChart expenses={monthExpenses} />
<ByPersonChart expenses={monthExpenses} />
```

This is intentional — the trend chart shows multiple months. However, the prop name `expenses` does not distinguish between filtered and unfiltered arrays. `SavingsTrendChart` (line 618) similarly receives `savings` (all-time) while `SavingsByCategoryChart` receives `monthSavings`. This asymmetry is not documented and makes it easy for a future contributor to accidentally pass the wrong array.

---

## QUAL-05: URL Parsing Logic Exists in Three Locations

**Severity**: Low
**File**: `expense-tracker/src/App.jsx`, lines 43–51, 89–100, and 133–141

### Description

URL path-to-month parsing logic is scattered across three places in `App.jsx`:

1. **Line 43–51**: `parseMonthFromPath(path)` — used once for `initialMonth` on line 103
2. **Lines 89–100**: Inline derivation of `view` and `pathParts` — detects if the path is a month path via `MONTH_URL_NAMES.includes(...)`
3. **Lines 133–141**: Inside a `useEffect` that syncs `viewYear`/`viewMonth` state on URL changes — re-parses `pathParts` for the indices

All three use `MONTH_URL_NAMES`. The function on line 43 is called only once and could replace or be unified with the `useEffect` logic. If the URL structure ever changes (e.g., switching from `/:year/:monthName` to `/:year-:month`), all three sites must be updated.

---

## QUAL-06: `fmtDate` Crashes on `undefined` or Malformed Input

**Severity**: Low
**File**: `expense-tracker/src/utils/format.js`, lines 14–17

### Description

```js
export function fmtDate(iso) {
  const [y, m, d] = iso.split('-');  // TypeError if iso is undefined/null
  return `${MONTH_SHORT[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}
```

If `iso` is `undefined`, `null`, or not in `YYYY-MM-DD` format:
- `undefined.split` → `TypeError: Cannot read properties of undefined`
- `"not-a-date".split('-')` → destructures incorrectly; `parseInt(undefined, 10)` → `NaN`; `MONTH_SHORT[NaN - 1]` → `undefined`

`fmtDate` is called throughout `ExpenseTable` and `SavingTable`. A malformed date from the API would crash the component tree at the point of rendering with no user-facing error message.

---

## QUAL-07: `CardType` and `ExpenseCategory` PK Is the Name — Prevents Renaming

**Severity**: Medium
**File**: `expense-tracker-api/models.py`, lines 76–91

### Description

```python
class ExpenseCategory(Base):
    __tablename__ = "expense_categories"
    name = Column(String, primary_key=True)   # name is the PK

class CardType(Base):
    __tablename__ = "card_types"
    name = Column(String, primary_key=True)   # name is the PK
```

`Expense.category` stores the category name as a plain string (line 11). `Expense.card_type` stores the card type name as a plain string (line 15). Neither stores a foreign key to the reference table.

Consequences:

1. Renaming an `ExpenseCategory` does not update existing expenses — the old name becomes a dangling string reference.
2. Deleting a `CardType` does not cascade to expenses — existing expenses retain the deleted card type name.
3. No referential integrity is enforced at the database level for these fields.
4. There is no API endpoint to rename a category or card type; the only operations are add and delete.

---

## QUAL-08: No Test Suite Exists

**Severity**: High
**File**: Entire project

### Description

Confirmed: there are no test files anywhere in the repository. `expense-tracker/CLAUDE.md` explicitly states "No test suite is configured."

- No `pytest` files in `expense-tracker-api/`
- No Vitest/Jest files in `expense-tracker/src/`
- No `tests/` directory at any level
- No test dependencies in `requirements.txt` or `package.json` devDependencies

BUG-01 (`models.Income` does not exist) would be caught by a single `pytest` test that calls `GET /analytics/monthly/2025-01`. The crash has existed since the `Income` → `IncomeEntry` rename and was never detected because there are no tests.

FastAPI provides `TestClient` via `httpx` (installable as a dev dependency). A minimal test file covering each router's happy path would catch class of bugs like BUG-01 at development time.

---

## QUAL-09: `IncomeBreakdownChart` Is Exported But Never Used

**Severity**: Low
**File**: `expense-tracker/src/components/Charts.jsx`, lines 226–250

### Description

```js
// Charts.jsx line 226
export function IncomeBreakdownChart({ income, totalExp, totalSav }) {
  ...
}
```

`IncomeBreakdownChart` is a fully implemented chart component (donut chart showing income breakdown into expenses, savings, remaining) that is exported but never imported in `App.jsx` or any other file. It is dead code. It accepts `income`, `totalExp`, and `totalSav` props — suggesting it was planned for a view that was never completed or was removed.

Either the chart should be added to the analytics view (the `analyticsTab === 'overview'` section would be the logical home), or it should be deleted.

---

## QUAL-10: `handleSaveSaving` and `deleteSaving` Are Not Async in App.jsx

**Severity**: Low
**File**: `expense-tracker/src/App.jsx`, lines 262–278

### Description

```js
function handleSaveSaving(data) {   // not async
  if (editingSaving) {
    updateSaving(editingSaving.id, data);  // fire-and-forget
    showToast('Saving updated.');
  } else {
    addSaving(data);  // fire-and-forget
    showToast('Saving added.');
  }
}
```

Unlike `handleSave` (expenses, which uses `await`), `handleSaveSaving` calls `updateSaving` and `addSaving` as fire-and-forget calls. The toast fires immediately regardless of whether the API call succeeds. This is inconsistent with the expense handler and means saving CRUD errors are completely invisible to the user.

Similarly, `handleDeleteSaving` (line 272) calls `deleteSaving(id)` without awaiting the result. The confirm dialog closes and the toast shows before the deletion is confirmed by the server.
