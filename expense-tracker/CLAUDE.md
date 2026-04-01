# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:5173
npm run build      # Production build → dist/
npm run preview    # Serve the dist/ build locally
npm run lint       # ESLint (js/jsx files, dist excluded)
```

No test suite is configured.

## Architecture

This is a **React 19 + Vite** single-page expense tracker. All data is persisted in `localStorage` — there is no backend or database.

### Data layer (`src/hooks/useExpenses.js`)

Single custom hook that owns all state. It reads from and writes to two `localStorage` keys:
- `expensetrack_v1` — array of expense objects
- `expensetrack_cards_v1` — array of card type strings (default: `["Davivienda"]`)

Every mutating function (`addExpense`, `updateExpense`, `deleteExpense`, `addCardType`) updates both React state and `localStorage` atomically. All components receive data and callbacks from `App.jsx` via props — there is no context or global store.

### Expense object shape

```js
{
  id: string,           // uid() — timestamp + random base36
  date: string,         // ISO format "YYYY-MM-DD"
  desc: string,
  category: string,
  price: number,        // integer, Colombian pesos
  cardPay: "Yes" | "No",
  whoPaid: string,
  cardType: string,     // empty string if cardPay is "No"
  costType: "fixed" | "variable",  // legacy records without this field are treated as variable
}
```

### Component responsibilities

- **`App.jsx`** — month navigation state, tab state (Transactions / Analytics), summary calculations, CRUD orchestration. Passes filtered `monthExpenses` to the table and charts.
- **`components/Charts.jsx`** — exports four named chart components (`CardVsCashChart`, `ByCardTypeChart`, `ByPersonChart`, `MonthlyTrendChart`). Each is self-contained and receives the relevant `expenses` array as the only prop. Uses Recharts with a shared `TooltipBox` component and a shared `COLORS` palette.
- **`components/ExpenseModal.jsx`** — controlled form for add/edit. Manages its own local form state; resets via `useEffect` on `open` prop change. Price input auto-formats with `es-CO` locale separators. Validates required fields before calling `onSave`.
- **`components/ExpenseTable.jsx`** — purely presentational, sorts by date descending.
- **`utils/format.js`** — `fmtCOP(n)`, `fmtDate(iso)`, `uid()`, `todayISO()`, month name arrays.

### Styling

All styles are written as **inline JS style objects** (no CSS modules, no Tailwind). The design uses CSS custom properties defined in `src/index.css` (Apple-inspired: `--accent #007aff`, `--success #34c759`, `--danger #ff3b30`, etc.). Recharts charts use these same CSS variables for consistency.

### Adding a new chart

1. Compute the derived data inside the new component (derive from the `expenses` prop).
2. Wrap it in `<ChartCard title="...">` (exported from `Charts.jsx`).
3. Import and place it in `App.jsx` inside the `activeTab === 'charts'` block.
