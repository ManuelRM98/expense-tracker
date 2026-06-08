# 01 — Architecture Overview

*Verified against codebase on 2026-06-08.*

## Summary

The expense-tracker is a personal finance SPA with a React 19 / Vite frontend and a FastAPI / SQLAlchemy backend. Data is stored in SQLite by default with a documented migration path to PostgreSQL (commented out in `.env`).

## Repository Layout

```
expense-tracker/                  (monorepo root)
├── docker-compose.yml
├── expense-tracker/              (frontend — React 19 + Vite)
│   ├── src/
│   │   ├── App.jsx               (monolithic root component, 924 lines)
│   │   ├── components/           (21 component files)
│   │   ├── hooks/                (4 custom hooks)
│   │   ├── services/api.js       (HTTP client + camelCase/snake_case mappers)
│   │   └── utils/format.js
│   ├── Dockerfile
│   └── package.json
└── expense-tracker-api/          (backend — FastAPI + SQLAlchemy)
    ├── main.py                   (app factory, seeding, inline migrations — all at module level)
    ├── models.py                 (10 SQLAlchemy models)
    ├── schemas.py                (Pydantic v2 schemas)
    ├── database.py               (engine, session factory, get_db)
    ├── routers/                  (9 router files)
    └── Dockerfile
```

**Correction from prior version:** The component count is 21 files (not 22), and models.py contains 10 models (not 9). `IncomeBreakdownChart` is defined in `Charts.jsx` but never imported in `App.jsx` — it is a dead export.

## Architectural Layers

### Backend

- **Transport**: FastAPI 0.115.0 with automatic OpenAPI docs (`/docs`)
- **ORM**: SQLAlchemy 2.0.36 (using 1.x-style `Session.query()` throughout — not the 2.x `select()` style)
- **Database**: SQLite file (`expense_tracker.db`) — single-file, no migrations tooling (Alembic absent)
- **Validation**: Pydantic v2 models in `schemas.py` (pydantic is a transitive dependency, not explicitly pinned)
- **Seeding / migrations**: Executed unconditionally at module import time in `main.py` via `run_migrations()` and `seed_defaults()` — before the FastAPI `app` object is even constructed (lines 47–48)
- **Startup model**: `Base.metadata.create_all(bind=engine)` runs at import time on line 9; this is also before the app object exists

### Frontend

- **Framework**: React 19 with `StrictMode` and `BrowserRouter`
- **Bundler**: Vite 8.0.1
- **State**: Component-local `useState` inside custom hooks; no global store (no Context, Redux, Zustand)
- **Data fetching**: Plain `fetch()` inside `src/services/api.js` with a `request()` helper that throws on non-2xx responses; no caching layer (no React Query, SWR)
- **API base URL**: Configurable via `VITE_API_URL` env var; defaults to `http://localhost:8000`. No `.env.example` file documents this variable.
- **Routing**: React Router v7 with URL-derived state (month navigation encoded as `/:year/:monthName`). `BrowserRouter` is used (legacy mode) rather than `createBrowserRouter`. No `<Routes>` or `<Route>` components exist — Router is used solely as an imperative history/location manager.
- **Styling**: Inline JS style objects throughout + CSS custom properties in `index.css`; no CSS modules, no Tailwind, no media queries

## Domain Model (10 models)

| Entity | Table | Notes |
|---|---|---|
| Expense | expenses | Variable or fixed, optional `billing_month` override |
| Saving | savings | Card or cash |
| IncomeEntry | income_entries | Multi-entry per month; COP or USD with exchange rate |
| FixedExpenseTemplate | fixed_expense_templates | Generates expense rows on navigation |
| FixedExpenseLog | fixed_expense_logs | Idempotency log; PK is `"{template_id}_{YYYY-MM}"` |
| Debt / DebtPayment | debts, debt_payments | Partial-payment tracking; DebtPayment has FK with `ondelete="CASCADE"` (not active in SQLite without PRAGMA) |
| MonthBudget | month_budgets | Percentage allocations; `month_key='default'` is global |
| GlobalConfig | global_config | Key/value: `base_salary`, `salary_day` (whitelist enforced in router) |
| ExpenseCategory / SavingCategory / CardType | expense_categories, saving_categories, card_types | Reference data; name is PK — not a surrogate key |

## Patterns in Use

- Repository pattern is absent; routers directly access `Session`
- No service layer between routers and the ORM
- Mapper pattern present in `api.js` for camelCase ↔ snake_case translation — consistent and complete across all 10 entity types
- Optimistic UI updates absent; state is updated only after API confirms (except `deleteExpense`/`deleteSaving`/`deleteDebt` which optimistically remove from local state after the API call resolves)
- `useCallback` used consistently in all hooks for mutation functions; `useMemo` used in `App.jsx` for filtered expense/saving arrays

## Known Structural Anomalies

1. **Dead export**: `IncomeBreakdownChart` is exported from `Charts.jsx` (line 226) but is never imported or rendered anywhere in the application.
2. **CLAUDE.md is stale**: The file at `expense-tracker/CLAUDE.md` describes the original `localStorage`-only architecture (pre-API). It documents `expensetrack_v1` localStorage keys, no-backend, and a `uid()` function that is no longer the ID strategy. The actual ID strategy is `uuid4()` on the backend. This documentation divergence will mislead contributors.
3. **Module-level side effects**: `Base.metadata.create_all()`, `run_migrations()`, and `seed_defaults()` all execute at Python module import time, before the `FastAPI` app object is constructed.
