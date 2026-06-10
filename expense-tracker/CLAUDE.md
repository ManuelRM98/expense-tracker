# CLAUDE.md

This file provides guidance to Claude Code when working with the **frontend** of the
Expense Tracker. The repo root has its own CLAUDE.md covering the two-service layout.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:5173
npm run build      # Production build → dist/
npm run preview    # Serve the dist/ build locally
npm run lint       # ESLint (js/jsx files, dist excluded)
```

No frontend test suite is configured yet. The backend has pytest
(`expense-tracker-api/tests/`) — API-level behavior is tested there.

## Architecture

This is a **React 19 + Vite** single-page app (plain JavaScript, no TypeScript).
All data is persisted through the **FastAPI backend** at `http://localhost:8000`
(override with the `VITE_API_URL` env var). There is **no localStorage persistence** —
if you see docs claiming otherwise, they are stale.

Usually both services run via `docker-compose up` from the repo root (hot-reload
through volume mounts).

### Data layer

- **`src/services/api.js`** — the single HTTP client. Every backend call goes through
  its `request()` helper (throws an `Error` with the FastAPI `err.detail` message on
  non-2xx). It also owns the **camelCase ↔ snake_case mappers** for all 10 entity
  types. Never call `fetch()` from a component or hook — extend `api.js` instead.
  When the backend changes a schema, the mapper here must change in the same commit.
- **`src/hooks/`** — all data-fetching state lives in custom hooks, not components:
  `useExpenses` (currently owns several domains: expenses, savings, income, categories,
  cards, config — see DEBT-03), `useFixedExpenses`, `useBudget`, `useDebts`.
  New data domains get a new hook following the `useExpenses` pattern.
- No global store (no Context/Redux/Zustand) and no fetch-caching layer. `App.jsx`
  passes data and callbacks down via props.

### Entity IDs and dates

IDs are **backend-generated `uuid4()` strings** — the client never invents entity IDs.
Dates are ISO `"YYYY-MM-DD"` strings; month keys are `"YYYY-MM"`. Expenses may carry a
`billingMonth` override (credit-card cut-off handling) that takes priority over the
date's month for monthly grouping.

### Routing and App.jsx

React Router v7 in legacy `BrowserRouter` mode, used only as a history/location
manager: the current month is encoded in the URL as `/:year/:monthName`. There are no
`<Routes>`/`<Route>` components. `App.jsx` is a 924-line root component that owns month
navigation, tab state, summary calculations, and CRUD orchestration (known god
component — DEBT-02; don't add to it if a child component can own the logic).

### Components (`src/components/`)

Pages: `DebtsPage`, `FixedExpensesPage`, `BudgetAllocationPage`, `SettingsPage`,
`CardsSettingsPage`, `GlobalSalaryPage`, `AnnualDashboard`. Modals: `ExpenseModal`,
`SavingModal`, `IncomeEntryModal`, `DebtModal`, `DebtPaymentModal`,
`PermanentExpenseModal`, `ConfirmDialog`. Tables/charts: `ExpenseTable`, `SavingTable`,
`Charts.jsx` (named Recharts exports sharing `ChartCard`, `TooltipBox`, `COLORS`).
Chrome: `Header`, `Sidebar`, `BudgetCards`, `DatePicker`.

### Utilities (`src/utils/format.js`)

`fmtCOP(n)` (es-CO currency), `fmtDate(iso)`, `todayISO()`, `uid()` (legacy — only for
ephemeral client-side keys, never entity IDs), month name arrays.

## Conventions (enforced in review)

1. All HTTP through `api.js` via a hook — never direct `fetch`/axios in components.
2. All currency display through `fmtCOP`, all date display through `fmtDate` — never
   inline `Intl`/`toFixed`.
3. Every data-fetching operation handles **loading, error, and empty** states; every
   user-triggered mutation has `try/catch` surfacing failures via toast (QUAL-01).
   Async handlers must actually `await`.
4. Charts use **Recharts only** — no new chart library.
5. Styling is **inline JS style objects** + CSS custom properties from `src/index.css`
   (Apple-inspired: `--accent #007aff`, `--success #34c759`, `--danger #ff3b30`).
   No CSS modules, no Tailwind.
6. Components stay focused — past ~150 lines, extract sub-components.

## Known issues

The audit in `../spec/` documents frontend findings by ID (BUG-02/05/06/07, QUAL-01/
04/06/09/10, STATE-01…07, DEBT-02/03/07, PERF-03/04). Check
`../spec/10-findings-summary.md` before fixing something that may already be catalogued.
