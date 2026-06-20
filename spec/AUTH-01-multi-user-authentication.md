# AUTH-01 — Multi-User Authentication & Per-User Data Isolation

## Status

Planned — not yet implemented. This document is the authoritative requirements/design
spec. Implementation should run through the `/feature` pipeline
(spec → `backend-agent` → `frontend-agent` → `qa-reviewer`), backend first.

## Goal

Turn the single-tenant expense tracker into a multi-user app. Anyone reaching the site
must log in before seeing any data; users can self-register; each user sees and edits
**only their own** data. The header gains a user menu (circle avatar → **Account** /
**Log out**) and there is an **Account** page for personal info. Sessions persist across
visits ("stay logged in") but are bounded for security. Everything works on laptop and
phone screens.

This is groundwork for opening the app to the public network in the future, including a
later "Sign in with Google / Apple" option.

## Decisions & hard constraints

- **Auth provider: Supabase Auth (GoTrue).** Chosen over a hand-rolled FastAPI JWT
  because the app is headed for public exposure and wants future social login. Supabase
  owns password hashing, breach detection, email verification, and password reset; social
  providers become a config toggle rather than a bespoke OAuth flow.
- **Open self-signup.** A "Create account" link on the login page. Lockable later (e.g.
  invite code or disabling signups in Supabase) without code changes to the data layer.
- **Existing data is assigned to a dedicated MOCK user**, not the owner's real account,
  so the owner can keep testing against realistic data without polluting their personal
  account (created fresh). New users start empty.
- **Session model: Supabase access + refresh tokens.** Short-lived access token (~1h) +
  silent refresh keeps users logged in; a configurable absolute timeout bounds the
  session. No long-lived bearer token is hand-managed.
- **Architecture invariant preserved for data:** the frontend talks to Supabase Auth
  *only* for login/signup/refresh, and to the FastAPI backend for *all* data. The
  frontend never touches the database directly.
- **Data isolation is enforced server-side.** The backend verifies every JWT and filters
  every query by `user_id`. CORS remains an allow-list, not the security boundary.
- **No SQLite-specific SQL** (per CLAUDE.md). The new `user_id` columns and composite
  keys must work on Supabase Postgres; tests run on the `db-test` Postgres.

## Architecture

```
Browser ──login/signup/refresh──▶ Supabase Auth (GoTrue)   ← supabase-js owns tokens
   │                                      │ issues JWT (sub = user UUID)
   │  Authorization: Bearer <access JWT>  │
   ▼                                      ▼
FastAPI ──verify JWT (JWKS or secret)──▶ get_current_user() → user_id
   │ every query filtered by user_id
   ▼
Supabase Postgres  (every data table gains user_id)
```

The existing shared `X-API-Key` middleware is **replaced** by per-request JWT bearer
auth. User identity = Supabase `sub` (UUID).

## Backend contract (`expense-tracker-api/`)

### New: `auth.py` — JWT verification
- Verify the Supabase access token on each request: signature (asymmetric keys via the
  Supabase JWKS endpoint, or the legacy project JWT secret — confirm which the project
  uses), plus `aud` and `exp` claims.
- Expose `get_current_user()` FastAPI dependency → authenticated user's UUID (`sub`) and
  email. Raise `401` on missing/invalid/expired token.
- New deps in `requirements.txt`: `pyjwt[crypto]` (or `python-jose[cryptography]`), and
  `httpx` + an in-process cache for the JWKS. No password-hashing lib (Supabase owns it).
- In `main.py` (~lines 93–127): **remove** the `X-API-Key` middleware; apply the JWT
  dependency to all data routers. Keep `/`, `/docs`, `/openapi.json`, `/redoc` public.
  Add `Authorization` to CORS `allow_headers`.

### `models.py` — ownership
- New `AppUser`: `id` (UUID PK, = auth `sub`), `email`, `display_name`, `created_at`. A
  thin app-side profile (Supabase `auth.users` lives in its own schema).
- Add `user_id` (UUID, FK → `app_users.id`, indexed, NOT NULL) to every user-owned table:
  `Expense`, `Saving`, `IncomeEntry`, `FixedExpenseTemplate`, `FixedExpenseLog`,
  `ExpenseCategory`, `SavingCategory`, `CardType`, `MonthBudget`, `Debt`, `DebtPayment`.
- `GlobalConfig`: PK becomes composite `(user_id, key)` — per-user `base_salary` /
  `salary_day`.
- `ExpenseCategory` / `SavingCategory` / `CardType`: name PKs become composite
  `(user_id, name)` (names are now scoped per user). The expense/saving string columns
  that reference these names are validated against the *current user's* set.

### Routers — per-user filtering (highest-risk surface)
Every read in `routers/*.py` gains `.filter(Model.user_id == current_user.id)`; every
create stamps `user_id`; every update/delete is scoped to the owner (a non-owned id
returns `404`). Files: `expenses.py`, `savings.py`, `income.py`, `debts.py`,
`analytics.py`, `categories.py`, `budget.py`, `fixed_expenses.py`, `config.py`.

> A single missed filter leaks another user's data — this is the critical correctness
> property, covered by the isolation tests below.

### New: `routers/account.py`
- `GET /account/me` → profile (email, display_name).
- `PUT /account/me` → edit `display_name`. Email/password changes are delegated to
  Supabase (frontend uses supabase-js / reset email).
- On the first authenticated request for a new `sub`: upsert the `AppUser` row **and**
  seed that user's default categories/cards (refactor `seed_defaults` in `main.py` to
  take a `user_id`; remove global seeding at startup).

### Migration + data backfill (`alembic/versions/`)
1. Create `app_users`; add nullable `user_id` columns + indexes; rewrite composite PKs
   for config/categories/cards.
2. Create a seeded **MOCK user** with a fixed UUID **and** a real Supabase auth account
   (so it can actually log in); `UPDATE` every existing row to that UUID.
3. Set `user_id` NOT NULL.

Follows the existing startup-migration pattern (`main.py` `_run_alembic_migrations`) and
the prior data-migration script.

### Tests (`tests/`)
- `conftest.py`: the `client` fixture provides an authenticated user by overriding
  `get_current_user` (parallels how `API_KEY=""` disabled auth before). Provide a helper
  to act as a second user.
- New `test_auth_isolation.py`: two users; assert user A cannot read/update/delete user
  B's expenses, savings, income, debts, categories, cards, budget, or config — and that
  analytics never aggregate across users.
- Update existing tests to create data under the authenticated test user.

## Frontend touchpoints (`expense-tracker/`)

- **Supabase client + context:** add `@supabase/supabase-js`; `src/services/supabase.js`
  (from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`). New
  `src/contexts/AuthContext.jsx` + `useAuth()` exposing `user`, `session`, `signIn`,
  `signUp`, `signOut`, `loading`; subscribe to `onAuthStateChange`. Supabase persists +
  auto-refreshes the session → "stay logged in" for free. Wrap `<App/>` in
  `<AuthProvider>` in `src/main.jsx` (first Context in the app).
- **Token on API calls** (`src/services/api.js`): replace the static `X-API-Key` header
  with `Authorization: Bearer ${session.access_token}` read before each request; on `401`
  sign out and redirect to `/login`. camelCase↔snake_case mappers unchanged (`user_id`
  is implicit from the token, never sent by the client).
- **Route protection** (`src/App.jsx`): new `src/components/ProtectedRoute.jsx` redirects
  to `/login` when `!user`; wrap all existing routes (`/`, `/:year/:monthName`, `/debts`,
  `/settings/*`, `/account`). Public routes `/login` and `/signup` render outside the app
  shell. Show a splash while `auth.loading` to avoid a login-page flash.
- **New pages:** `LoginPage.jsx`, `SignupPage.jsx` (centered card; email + password;
  cross-link; inline validation reusing the `IncomeEntryModal.jsx` error pattern + CSS
  vars). `AccountPage.jsx` (`/account`): edit display name (→ `PUT /account/me`), show
  email, "change password" via Supabase reset email; rendered inside the app shell.
- **User menu** (`src/components/Header.jsx`): circular avatar button (initial/icon) on
  the right after the Add button → dropdown with **Account** (→ `/account`) and **Log
  out** (`signOut()` → `/login`). Reuse the `scaleIn` dropdown animation; close on
  outside-click/Esc. On ≤640px render the menu as a bottom sheet
  (`utils/mobileModalStyles.js` + `DragHandle`); ensure it's reachable on phones (avatar
  in header and/or an entry in `BottomTabBar.jsx`).

## Responsive (laptop + phone)
- Login/Signup: single centered column on both; full-screen and comfortable tap targets
  on phone; respect `env(safe-area-inset-*)`.
- Header avatar: ~32–36px circle on desktop; equal/larger touch target on mobile;
  dropdown → bottom sheet at the existing 640px `useIsMobile` breakpoint.
- Account page: reuse the 2-col→1-col `modal-form-grid` responsive pattern.

## Security
- Supabase handles password storage/hashing/reset — not our code.
- Backend independently verifies every JWT and filters every query by `user_id`; the
  isolation tests are the guardrail.
- **TLS is a hard prerequisite for public launch.** Bearer tokens over plain HTTP are
  acceptable on the private LAN, but the app must sit behind HTTPS before internet
  exposure (reverse-proxy/TLS path in [DEPLOY-01](DEPLOY-01-production-lan-docker.md)).
- Future Google/Apple: enable the provider in Supabase + add an OAuth button; no backend
  changes beyond accepting the same JWT.

## Acceptance criteria
- [ ] Visiting any app route while logged out redirects to `/login`; no data is reachable.
- [ ] Self-signup creates an account and lands on an **empty** dashboard.
- [ ] Logging in as the **mock** user shows all migrated existing data — and only that
      user's data.
- [ ] User A cannot read or mutate user B's data via any endpoint (verified by
      `test_auth_isolation.py` and a two-browser manual check).
- [ ] Header avatar → **Account** (display-name edit persists) and **Log out** (returns
      to `/login`) work on desktop and mobile.
- [ ] Refresh / reopen browser keeps the session; the session ends after the configured
      absolute timeout.
- [ ] `pytest` (on `db-test` Postgres), `npm run lint`, and `npm run build` all pass.

## References
- Architecture & invariants: [CLAUDE.md](../CLAUDE.md)
- Database/credentials/SSL: [SUPABASE-MIGRATION.md](SUPABASE-MIGRATION.md)
- HTTPS / public-exposure path: [DEPLOY-01-production-lan-docker.md](DEPLOY-01-production-lan-docker.md)
- Agentic delivery pipeline: [AGENTIC_WORKFLOW.md](../AGENTIC_WORKFLOW.md), `/feature` skill
