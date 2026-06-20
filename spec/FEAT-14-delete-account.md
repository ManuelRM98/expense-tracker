# FEAT-14 — Delete account

**Status:** SPEC
**Depends on:** AUTH-01 (multi-user auth, per-user data isolation)

## Summary

Let an authenticated user permanently delete **their own** account from the Account
page. Deletion is **full**: it wipes every Postgres row owned by the user *and* removes
the Supabase Auth identity itself (via the Admin API), then signs the user out. The
email becomes free to register again as a brand-new empty account.

## Decision: full delete (data + auth)

Chosen by the user over a softer "data-only" delete. Consequence: the backend must call
the Supabase Auth Admin endpoint `DELETE /auth/v1/admin/users/{id}`, which requires the
**service-role** key. This introduces a new backend secret:

- New env var **`SUPABASE_SERVICE_ROLE_KEY`** (read in the backend only; never sent to
  the frontend). Document it in `.env` / `.env.example`.
- If the var is unset, the endpoint must still delete the local data but return a clear
  signal that the auth identity could not be removed (see error handling). It must
  **never** 500 silently or leave half-deleted state without reporting it.

## API contract (coordination artifact)

### `DELETE /account/me`

Auth: `Authorization: Bearer <supabase access token>` (same `get_current_user` as the
rest of the API). The user can only ever delete themselves — `current_user.id` is the
only id touched; no id is accepted from the client.

**Behaviour (in one DB transaction for the local data):**
1. Delete all rows owned by `current_user.id` across **every** user-scoped table, in
   FK-safe order (children before parents). Tables (13):
   `debt_payments`, `debts`, `fixed_expense_logs`, `fixed_expense_templates`,
   `income_entries`, `expenses`, `savings`, `month_budgets`, `global_config`,
   `expense_categories`, `saving_categories`, `card_types`, and finally the
   `app_users` row itself.
   - `debt_payments` reference `debts` → delete payments first.
   - Everything else FKs to `app_users.id` → delete the `app_users` row **last**.
2. Commit the local deletion.
3. Call Supabase Admin `DELETE {SUPABASE_URL}/auth/v1/admin/users/{current_user.id}`
   with headers `apikey` + `Authorization: Bearer <service_role_key>`. Treat HTTP
   200/204 **and** 404 (already gone) as success.

**Responses:**
- `204 No Content` — local data deleted **and** auth identity deleted (or already gone).
- `200 OK` `{ "detail": "...", "auth_deleted": false }` — local data deleted but the
  auth identity could **not** be removed (service-role key missing or Admin API error).
  This lets the frontend tell the user their data is gone but they may need manual
  cleanup. (Rationale: we already committed the irreversible local delete; failing the
  whole request would be misleading.)
- `401` — missing/invalid token (standard `get_current_user`).

No request body. No new Pydantic input schema needed.

### HTTP client

The backend currently has no `httpx`/`requests` in `requirements.txt`, but `httpx` is
already importable (FastAPI's `TestClient` depends on it). Add **`httpx`** as an
explicit direct dependency in `requirements.txt` (follow the existing comment style /
pin convention) and use it for the Admin API call, with a short timeout. Do not add
`requests`.

## Backend tasks (`backend-agent`)

- New route `DELETE /account/me` in `routers/account.py`.
- A helper that performs the cascade delete in FK-safe order (single transaction).
- A helper `delete_supabase_auth_user(user_id) -> bool` that reads
  `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL`, calls the Admin API, returns whether the
  auth user was deleted (True on 2xx/404, False on missing key or error). Must **not**
  raise out of the endpoint — network/admin failure → `auth_deleted: false`, not a 500.
- `httpx` added to `requirements.txt`.
- `.env` / `.env.example`: add `SUPABASE_SERVICE_ROLE_KEY=` with a comment that it is the
  service-role secret used only for account deletion (admin), keep it server-side.
- **pytest** (`tests/test_account_delete.py`), all on the `db-test` PostgreSQL:
  - Seed user A with rows in several tables (expense, saving, income, debt + payment,
    fixed template + log, budget, config, a custom category/card). `DELETE /account/me`
    → assert response, then assert **zero** rows remain for A in every table incl.
    `app_users`.
  - **Isolation**: user B's rows are untouched after A deletes themselves.
  - Auth-deletion is mocked (monkeypatch the `delete_supabase_auth_user` helper or the
    httpx call) — tests must not hit the network. Cover both branches: helper returns
    True → `204`; helper returns False (e.g. no service-role key) → `200` with
    `auth_deleted: false`.
  - `401` when unauthenticated (no dependency override).
  - Follow existing `conftest.py` fixtures (`set_auth_user`, `USER_A`, `USER_B`, the
    PostgreSQL safety asserts).

## Frontend tasks (`frontend-agent`)

- `api.js`: add `export async function deleteAccountMe()` → `request('DELETE',
  '/account/me')`. The `request()` helper currently returns parsed JSON; ensure a
  `204 No Content` is handled gracefully (no body). Return the parsed body when present
  (so the caller can read `auth_deleted`), or `null`/`undefined` on 204.
- `AccountPage.jsx`: add a **"Danger zone"** section at the bottom with a red
  **"Delete account"** button (use the existing `--danger` token; mirror the section /
  button styling already in the file — do not introduce CSS modules/Tailwind).
- Confirmation: reuse the existing `ConfirmDialog` component (title e.g. "Delete
  account?", message explaining this is **permanent** and wipes all data). Because this
  is irreversible and high-stakes, gate the confirm button behind the user typing their
  email (or the word `DELETE`) — implement either inline in the danger section or by
  extending the danger-zone UI; keep `ConfirmDialog` itself generic. (If extending
  `ConfirmDialog` adds complexity, an inline typed-confirmation in the danger section is
  acceptable.)
- On confirm: call `deleteAccountMe()`, then:
  - success → `await signOut()` from `useAuth()` (redirects to `/login`); optionally a
    toast before redirect.
  - if the response indicates `auth_deleted === false`, still sign out, but show a toast
    noting the login record may need manual removal.
  - on error → `try/catch`, surface via `showToast` (QUAL-01); button returns to idle.
- `signOut` is already exposed by `AuthContext`. No new context wiring needed.
- Respect conventions: all HTTP via `api.js`, loading/disabled state on the button while
  deleting, error handled via toast.

## Acceptance criteria

1. A logged-in user can open Account → Danger zone → Delete account, confirm, and is
   signed out and returned to `/login`.
2. After deletion, **no** Postgres row anywhere references that `user_id`, and the
   `app_users` row is gone.
3. The Supabase Auth user is removed when `SUPABASE_SERVICE_ROLE_KEY` is configured;
   when it is not, local data is still deleted and the user is informed.
4. Deleting user A leaves user B's data fully intact (isolation).
5. The client cannot delete any account other than the caller's own (no id parameter).
6. Endpoint is unreachable without a valid token (`401`).
7. pytest (PostgreSQL `db-test`), `npm run lint`, and `npm run build` all pass.
