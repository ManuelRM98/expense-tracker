# FEAT-13 — Mobile-responsive layout (phone-first navigation)

## Goal

The app must offer a **really good experience on a cellphone** (~375–430px wide)
while keeping the laptop experience **exactly as it is today**. Currently, at
phone widths the sidebar blocks/covers page content. This spec documents the
diagnosis, the chosen approach, the alternatives considered, and the hard
constraints every agent must respect while implementing.

**Frontend-only feature.** No backend, api.js, or contract changes.

## Hard constraints (read before writing any code)

1. **Do not break the laptop/desktop layout.** Every change must be gated behind
   the mobile breakpoint (matchMedia hook and/or `@media (max-width: …)`).
   At ≥ 641px the app must render pixel-identical to today: sticky sidebar with
   collapse/expand hamburger, sticky frosted header, same spacing, same
   components. Verify desktop after every change, not only mobile.
2. **Respect the existing Apple design style.** Frosted glass surfaces
   (`--surface-glass` + `backdrop-filter: saturate(180%) blur(20px)`), the
   CSS custom properties in `src/index.css` (radii, shadows, accent vars),
   SF system font stack, and both light/dark themes. New mobile chrome (tab
   bar, sheets) must look like a native iOS app built from the same design
   tokens — no new colors, fonts, or shadow values outside `index.css` vars.
3. **Existing components must keep working.** Tables, modals, charts, settings
   pages, debts page, annual dashboard — none may regress on desktop. Mobile
   adaptations wrap or branch; they do not rewrite shared logic.
4. Frontend conventions still apply: inline JS style objects + CSS vars (no
   Tailwind/CSS modules), Recharts only, components ~150 lines → extract.

## Diagnosis (why the navbar blocks content)

- `Sidebar.jsx` is `position: sticky` with
  `height: calc(100vh - var(--header-h) - 2 * var(--panel-gap))` — a desktop
  side panel.
- The only mobile handling today is the `@media (max-width: 640px)` rule in
  `src/index.css` (`.app-layout` → `flex-direction: column`). That stacks the
  full-viewport-height sticky sidebar **on top of** the content, covering it.
- Structural limitation: styling is inline JS style objects, and **inline
  styles cannot contain media queries** — so a responsive system needs a JS
  mechanism to branch rendering, not just CSS.

## Design decisions

### D1 — Mobile navigation pattern: iOS-style bottom tab bar (chosen)

On mobile, the sidebar is **not rendered at all**. Instead:

- A **fixed bottom tab bar** (frosted glass, same treatment as the header) with
  the sidebar's four destinations: **Home** (annual summary), **Months**,
  **Debts**, **Settings**. Active tab tinted with `var(--accent)`.
- The **Months** tab opens a **slide-up bottom sheet** containing the year
  selector (existing `NavArrowButton`s) and a thumb-friendly 12-month grid —
  the same data/highlight logic the sidebar uses (active month, current-month
  dot, dimmed months without data). Sheet dismisses on selection, backdrop tap,
  or swipe-down affordance.

Alternatives considered and rejected:

- *Off-canvas drawer* (hamburger opens the existing sidebar as an overlay):
  smaller change, but hides month navigation behind a tap and feels web-like,
  not app-like.
- *Forced collapsed icon rail*: cheapest, but permanently consumes ~52px of a
  ~375px screen and the small month cells are poor touch targets.

### D2 — Technical mechanism: `useIsMobile` hook + minimal CSS (chosen)

- New hook `src/hooks/useIsMobile.js` (or `useMediaQuery(query)`): wraps
  `window.matchMedia('(max-width: 640px)')` with a change listener; SSR-safe
  guard not required (Vite SPA). **Single source of truth for the breakpoint**
  — export the breakpoint constant; do not hard-code 640 in components.
- Components use the hook for **structural** branches (render `Sidebar` vs.
  `BottomTabBar`, centered dialog vs. full-screen sheet) and for switching
  inline style variants.
- `index.css` keeps/extends the small set of layout classes (`.app-layout`,
  `.app-content`) for what CSS does better; everything else stays inline
  style objects per convention.

Alternative rejected: migrating all chrome styling to CSS classes with media
queries — breaks the inline-style convention and cannot restructure the
component tree anyway.

### D3 — Mobile-browser correctness

- Replace `100vh` in chrome (sidebar, sheets, modals) with `100dvh`
  (mobile Safari URL-bar collapse makes `100vh` unreliable).
- Bottom tab bar and bottom sheets pad with `env(safe-area-inset-bottom)`;
  header respects `env(safe-area-inset-top)` if needed (notched iPhones).
- `.app-content` must reserve space for the tab bar
  (`padding-bottom: calc(tabbar-height + safe-area)`) so the last rows of
  tables are never hidden behind it.
- The viewport meta tag in `index.html` is already correct — do not change it.

## Implementation phases

### Phase 1 — Navigation (fixes the blocking bug)

1. `useIsMobile` hook + exported breakpoint constant.
2. `BottomTabBar.jsx` + `MonthPickerSheet.jsx` components (frosted style,
   ≥ 44px touch targets, safe-area padding).
3. `App.jsx` layout branch: mobile → no `Sidebar`, render `BottomTabBar`;
   desktop → unchanged. Keep the branch thin — chrome choice only, no logic
   moved into App.jsx (it is already a known god component, DEBT-02).
4. `dvh` / safe-area fixes; remove or correct the now-obsolete part of the
   640px stacking rule in `index.css` that causes the overlap.
5. Header on mobile: same frosted bar; ensure title + action button fit at
   375px (button may become icon-only if the label overflows).

### Phase 2 — Content surfaces

1. **Tables** (`ExpenseTable`, `SavingTable`): horizontal-scroll wrapper as the
   baseline; optionally a card-per-row mobile layout if scroll proves clumsy.
   Desktop table markup unchanged.
2. **Modals** (`ExpenseModal`, `SavingModal`, `DebtModal`, `DebtPaymentModal`,
   `IncomeEntryModal`, `PermanentExpenseModal`, `ConfirmDialog`): on mobile,
   present as full-screen or bottom-sheet style with safe-area padding;
   desktop presentation unchanged. `ConfirmDialog` may stay a centered alert
   (matches iOS alerts).

### Phase 3 — Polish

1. Touch targets ≥ 44px for interactive controls reachable on mobile
   (month cells, nav arrows, tab buttons, table row actions).
2. `BudgetCards`, settings grids, and chart grids wrap to a single column;
   Recharts containers verified responsive at 375px.
3. Pass over `DebtsPage`, `FixedExpensesPage`, `BudgetAllocationPage`,
   `AnnualDashboard`, settings pages at 375px / 430px widths.

## Acceptance criteria

1. At ≤ 640px the sidebar is gone; a bottom tab bar provides Home / Months /
   Debts / Settings; the Months sheet selects any month of any year with data.
2. **No content is ever covered** by navigation chrome on mobile — including
   the last table row (tab-bar padding) and content under the notch/home
   indicator (safe areas).
3. At ≥ 641px the app is visually and behaviorally identical to before the
   change (sidebar, collapse mode, sticky header, all pages).
4. Mobile chrome uses the existing design tokens and frosted-glass style and
   renders correctly in **both light and dark themes**.
5. All pages and all modals are usable at 375px width without horizontal page
   scroll (tables may scroll internally).
6. The breakpoint is defined in exactly one place.
7. `npm run lint` and `npm run build` pass.

## Verification notes for qa-reviewer

- Test at 375px (iPhone SE/13 mini class), 430px (Pro Max class), 640px
  (boundary), 641px, and a desktop width — both themes.
- Specifically re-verify desktop sidebar collapse/expand, sticky header
  behavior, and the Add Expense header action after Phase 1.
