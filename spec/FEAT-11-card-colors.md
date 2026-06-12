# FEAT-11 — Per-card color customization

## Goal

Each card type gets a user-selectable color. The color is chosen in **Settings → Cards**
(CardsSettingsPage) and is used to tint the "card type" badge wherever it renders:
ExpenseTable, SavingTable, FixedExpensesPage. Badges keep the existing pill shape,
12px **bold (600)** font, and tinted-background/colored-text pattern
(today: `background: var(--accent-light)`, `color: var(--accent)`).

## Design decision: palette + free picker

Any color **is** technically possible via the native `<input type="color">` (zero
dependencies). But for Apple-like consistency and badge legibility, the UI offers:

1. A curated palette of 8 Apple system colors rendered as round swatches:
   `#007aff` (blue/default), `#34c759` (green), `#ff9500` (orange), `#ff3b30` (red),
   `#af52de` (purple), `#ff2d55` (pink), `#5ac8fa` (teal), `#a2845e` (brown).
2. A final "custom" swatch (rainbow ring) that opens the native color input —
   so the user can still pick literally any color.

Badge rendering derives both tones from the single stored color:
`color: <hex>` for the text, `background: <hex> + '1A'` (≈10% alpha tint) — same
relationship as `--accent` / `--accent-light`. `color = null` falls back to the
current accent vars, so existing data renders unchanged.

## Backend contract (the coordination artifact)

### Model

`models.CardType` gains: `color = Column(String, nullable=True)` — `#rrggbb`
lowercase hex or `NULL` (= default accent). Needs an **Alembic migration**
(add nullable column; PostgreSQL-compatible — no SQLite-only DDL).

### Schemas

- `CardOut`: add `color: str | None`
- `CardCreate`: add `color: str | None = None`
- `CardCutOffUpdate` → generalize to `CardUpdate` with optional fields
  `cut_off_day: int | None` and `color: str | None`; the PATCH handler must use
  `payload.model_dump(exclude_unset=True)` so PATCHing only `color` does **not**
  reset `cut_off_day` (and vice versa).
- Color validation (Pydantic validator): `None` or regex `^#[0-9a-fA-F]{6}$`,
  normalized to lowercase. Invalid → 422.

### Endpoints (no new routes; extend existing in `routers/categories.py`)

- `GET /cards` → `CardOut[]` now includes `color`.
- `POST /cards` → accepts optional `color`.
- `PATCH /cards/{name}` → body `{"cut_off_day"?: int|null, "color"?: str|null}`,
  partial update semantics (exclude_unset). Returns full `CardOut[]` like today.
- `PUT /cards/{name}/rename` — unchanged; color rides along with the row
  (expenses reference cards by name, color lives only on `card_types`).

### Tests (pytest, `tests/test_categories.py` or new `tests/test_card_colors.py`)

1. New card defaults to `color: null`; POST with color persists it.
2. PATCH color only → cut_off_day untouched; PATCH cut_off_day only → color untouched.
3. PATCH `color: null` clears it.
4. Invalid colors (`"red"`, `"#fff"`, `"#zzzzzz"`, `"007aff"`) → 422.
5. Rename keeps the color.
6. GET /cards returns color for all rows.

## Frontend touchpoints

1. **`src/services/api.js`** — `toCard` mapper adds `color: d.color ?? null`;
   add `updateCardColor(name, color)` → `PATCH /cards/{name}` body `{ color }`;
   `addCardType` sends `color: null`.
2. **`src/hooks/useCards.js`** — add `updateCardColor` following the existing
   pattern (call api, `setCardTypes(types)`).
3. **`src/components/CardsSettingsPage.jsx`** — per row, next to the card name:
   a small round color dot (current color; accent if null). Clicking it expands an
   inline swatch row (palette + custom swatch wrapping a hidden
   `<input type="color">`). Selecting calls `onUpdateCardColor(name, hex)`.
   Keep the existing iOS-style grouped list, dividers, inline style objects, and
   CSS custom properties. Also tint each row's `cardIcon` circle with the card's
   color (tint bg / color fg) so the setting is visible at a glance.
4. **`App.jsx` (composition root)** — build `cardColors` lookup
   (`useMemo`: `{ [name]: color }` from `cardTypes`) and pass to ExpenseTable,
   SavingTable, FixedExpensesPage; wire `updateCardColor` down to CardsSettingsPage.
   Keep additions minimal (DEBT-02: don't grow App.jsx beyond the wiring).
5. **`ExpenseTable.jsx` / `SavingTable.jsx` / `FixedExpensesPage.jsx`** — badge:
   `style={{ ...s.badgeCard, ...(color ? { background: color + '1A', color } : {}) }}`.
   No color for that name (or prop missing) → exactly today's appearance.

## Acceptance criteria

- [ ] Each card row in Settings → Cards shows its color and lets the user pick from
      the palette **or** any custom color; change persists across reload.
- [ ] Card-type badges in expenses, savings, and fixed-expense tables use the card's
      color (tinted bg + colored bold text); unset color renders identical to today.
- [ ] PATCHing color never clobbers cut-off day and vice versa.
- [ ] Renaming a card keeps its color; deleting a card removes it cleanly.
- [ ] `python -m pytest` green; `npm run lint` and `npm run build` green.
- [ ] No SQLite-specific SQL; migration runs on both SQLite and PostgreSQL.
