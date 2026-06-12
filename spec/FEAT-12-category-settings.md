# FEAT-12 — Categories settings page (colors + add/rename/delete)

## Goal

A new **Settings → Categories** page that manages both expense categories and saving
categories in one place: add, rename, delete, and pick a per-category **color** —
the same UX as Settings → Cards (FEAT-11). The color tints the category badge
wherever it renders (ExpenseTable `badgeCat`, SavingTable, FixedExpensesPage),
using the same tinted-background/colored-text derivation as card badges:
`color: <hex>`, `background: <hex> + '1A'`; `color = null` falls back to the
current accent vars so existing data renders unchanged.

Add/rename/delete already exist as backend endpoints and are reachable today only
through pill editors inside ExpenseModal / SavingModal — those stay; this feature
adds the dedicated settings surface and the new color capability.

## Design decisions

1. **Categories become objects.** `GET /categories/expenses` and
   `/categories/savings` currently return `list[str]`. They change to
   `list[CategoryOut]` (`{name, color}`) — a **breaking contract change**, so
   api.js mappers and every hook consumer must be updated in the same change
   (per root CLAUDE.md, schema/mapper drift is the #1 failure mode).
2. **Color picker UI is reused from CardsSettingsPage**: 8-swatch Apple palette +
   "default" swatch (null) + custom swatch opening a hidden native
   `<input type="color">`. Same palette constants.
3. **Charts keep their own palette** — recoloring Recharts by category is out of
   scope for FEAT-12.

## Backend contract (the coordination artifact)

### Models (`models.py`)

`ExpenseCategory` and `SavingCategory` each gain:
`color = Column(String, nullable=True)` — `#rrggbb` lowercase hex or `NULL`
(= default accent). Needs an **Alembic migration** adding the nullable column to
both tables (PostgreSQL-compatible, like `b3c9d1e2f4a5` did for `card_types`).

### Schemas (`schemas.py`)

- `CategoryOut`: add `color: str | None` (keeps `from_attributes=True`)
- `CategoryCreate`: add `color: str | None = None`, validated with the existing
  `_validate_color` (reuse the FEAT-11 validator — normalizes to lowercase)
- New `CategoryUpdate`: `color: str | None = None` with the same validator;
  PATCH handler must use `model_dump(exclude_unset=True)` so an absent field is
  not confused with an explicit `null` (clear-to-default must work).

### Endpoints (`routers/categories.py`) — applies to BOTH

`/categories/expenses` and `/categories/savings`:

| Method | Path | Change |
|---|---|---|
| GET | `/categories/{kind}` | response becomes `list[CategoryOut]` |
| POST | `/categories/{kind}` | accepts optional `color`; response `list[CategoryOut]`; 409 on duplicate unchanged |
| PUT | `/categories/{kind}/{name}` | rename + cascade unchanged; response `list[CategoryOut]` |
| PATCH | `/categories/{kind}/{name}` | **new** — body `CategoryUpdate`, partial update (color); 404 if missing; returns `list[CategoryOut]` |
| DELETE | `/categories/{kind}/{name}` | unchanged logic (400 on last item, 404 missing); response `list[CategoryOut]` |

### Tests

Update `tests/test_categories.py` and `tests/test_rename_categories.py` for the
new response shape. Add coverage: POST with color, PATCH color set/clear/invalid
(422), PATCH on missing category (404), color persists across GET.

## Frontend

### `services/api.js`

- Category functions now resolve to `[{name, color}]` (snake/camel identical —
  still route through a mapper for convention).
- `addExpenseCategory(name, color?)` / `addSavingCategory(name, color?)` send color.
- New `updateExpenseCategoryColor(name, color)` and
  `updateSavingCategoryColor(name, color)` → `PATCH /categories/{kind}/{name}`
  body `{ color }` (explicit null allowed = reset to default).

### Hooks

- `useCategories`: state holds object arrays; add `updateExpenseCategoryColor` /
  `updateSavingCategoryColor` (state ← endpoint response, like the others).
- `useAppData`:
  - `expenseCategories` / `savingCategories` **stay `string[]`** (memoized
    `objects.map(c => c.name)`) so ExpenseModal, SavingModal,
    PermanentExpenseModal, FixedExpensesPage need no changes.
  - New `expenseCategoryObjects` / `savingCategoryObjects` (full objects) and the
    two update-color callbacks.

### Components / routing

- New `components/CategoriesSettingsPage.jsx` modeled on CardsSettingsPage:
  two sections ("Expense categories", "Saving categories"), each row with a
  tinted icon, name + inline rename, color well + swatch picker, delete button
  (disabled when only 1 left, mirroring backend MIN_ITEMS), and an "Add
  category" row per section. Keep it under control by extracting a shared
  per-section sub-component.
- New `pages/CategoriesView.jsx` wrapper (navigate-back to `/settings`),
  route `/settings/categories` in App.jsx.
- `SettingsPage.jsx`: new "Categories" row (tag/label icon, sub "Manage expense
  and saving categories and their colors") between Cards and Permanent Fixed
  Costs.
- App.jsx: toast-wrapped handlers for rename/color (mirror `handleRenameCard` /
  `handleUpdateCardColor`); build memoized `expenseCategoryColors` /
  `savingCategoryColors` `{name: color}` maps and pass down so:
  - ExpenseTable tints `badgeCat` (same pattern as `badgeCard` + `cardColors`)
  - SavingTable tints its category badge
  - FixedExpensesPage tints its category badge

### Conventions to respect

All HTTP via api.js; mutations `await`ed with try/catch surfacing toasts;
inline style objects + CSS vars; components ~150 lines → extract sub-components.

## Acceptance criteria

1. Settings shows a "Categories" entry; it opens `/settings/categories`.
2. The page lists expense and saving categories with their colors; add, rename,
   delete, and color change all persist (visible after reload).
3. Delete is blocked in UI and API when only one category of that kind remains.
4. Rename cascades to existing expenses/savings/templates (existing behavior preserved).
5. Category badges in ExpenseTable, SavingTable, and FixedExpensesPage render in
   the category color; categories without a color render exactly as today.
6. Setting a color back to "default" stores `null` and restores accent styling.
7. `python -m pytest`, `npm run lint`, `npm run build` all pass.
