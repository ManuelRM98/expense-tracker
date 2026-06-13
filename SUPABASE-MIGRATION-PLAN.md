
# Supabase Migration + Read-Only MCP — Secure Implementation Plan

## Context

The expense tracker currently stores real financial data in a local SQLite file. The goal is to move the database to Supabase (hosted PostgreSQL) and connect Supabase to Claude Code via MCP — with security as the top priority, because:

- The repo is **public** on GitHub (`ManuelRM98/expense-tracker`), and the real database file `expense-tracker-api/expense_tracker.db` **still exists in git history** (audit finding SEC-01).
- The data is sensitive personal financial information.

**Decisions made with the user:**
1. **Supabase = hosted Postgres only.** The FastAPI backend stays the sole database client (per CLAUDE.md architecture). The frontend keeps talking only to FastAPI.
2. **Migrate existing SQLite data** into Supabase. The user plans a future login/signup page — this is fully compatible: when auth lands later, a `user_id` column is added and existing rows are backfilled to the owner's account. Nothing in this migration blocks that.
3. **MCP is read-only**, scoped to this one Supabase project, token stored at user level (never in the repo).
4. **Purge the leaked .db from git history** as part of this work.

## Order of work: migrate the database first, then build the login page

The user plans a login/signup page and asked whether to build it before or after the migration. **Migrate first.** The reasoning:

1. **The login page should be built on Supabase Auth, and Supabase Auth needs the Supabase project to exist.** Rolling your own auth on SQLite (password hashing, token issuing, reset flows) is the highest-risk code you can write around sensitive data, and it would be thrown away the moment you adopt Supabase Auth. Migrating first means the login feature is built once, directly on its final foundation: Supabase manages signup/passwords/sessions, and FastAPI just validates the Supabase JWT on each request.
2. **The migration is small today; login makes it bigger.** The backend is already Postgres-ready, and the current schema is single-user with no `users` table. If login is built first, the migration later has to move a `users` table, password material, and `user_id` foreign keys on every table. Built in this order, the future login change is mechanical: add a nullable `user_id` column per table (Alembic migration), backfill all existing rows to your account in one UPDATE, then make it required.
3. **The security clock is already running.** Phase 0 (purging the leaked database from public git history) and getting data flows onto a hardened Postgres shouldn't wait behind a multi-week auth feature. Until login exists, the `X-API-Key` middleware (Phase 2) keeps the API closed.

The only scenario where login-first wins is if other people need accounts *before* the data moves — not the case here, since this is currently a single-user app.

**Future login sketch (out of scope for this plan, recorded for continuity):** enable Supabase Auth (email/password) → frontend login/signup pages call Supabase Auth directly (auth only — data still flows through FastAPI) → FastAPI verifies the `Authorization: Bearer <supabase-jwt>` against the project's JWT secret/JWKS, replacing the static API key → add `user_id` columns + backfill → scope every query by the authenticated user.

---

The June 2026 audit already made the backend Postgres-ready: `DATABASE_URL` switch in [database.py](expense-tracker-api/database.py), Alembic migrations with `render_as_batch=True`, no SQLite-specific column types, optional `X-API-Key` middleware (backend [main.py:93-109](expense-tracker-api/main.py#L93-L109)) with matching frontend support ([api.js:3-11](expense-tracker/src/services/api.js#L3-L11)). Only a Postgres driver and config changes are missing.

---

## Phase 0 — Close the existing leak (SEC-01 history purge)

Do this FIRST — no point securing new data flows while the old database sits in public history.

1. Confirm a fresh backup of the repo and of `expense_tracker.db` exists locally.
2. Install `git-filter-repo` (`brew install git-filter-repo`).
3. Run:
   ```bash
   git filter-repo --invert-paths --path expense-tracker-api/expense_tracker.db
   ```
4. `git filter-repo` removes the remote as a safety measure — re-add it and force-push:
   ```bash
   git remote add origin https://github.com/ManuelRM98/expense-tracker.git
   git push origin --force --all && git push origin --force --tags
   ```
5. **Caveat to surface to the user:** force-pushing rewrites history but GitHub may retain cached/dangling commits (and any forks keep copies). Recommend either making the repo private, or contacting GitHub Support to clear cached views. Treat the historical data as already exposed.

⚠️ This is a force-push to a public repo — get explicit user confirmation immediately before steps 3–4.

## Phase 1 — Supabase project hardening (user does this in the dashboard; provide exact instructions)

1. Create the Supabase project with a **strong, generated database password** (this is the only credential the app will use).
2. **Disable the auto-generated Data API (PostgREST)**: Project Settings → API → disable Data API. The app never uses it, and disabling it means the `anon`/`service_role` keys grant nothing — the database is reachable only via the Postgres connection the backend holds. (Fallback if they ever re-enable it: RLS enabled on every table with zero policies = deny-all.)
3. **Enforce SSL** on database connections: Database Settings → SSL enforcement ON.
4. Copy the **Session Pooler connection string** (IPv4-compatible, port 5432) — correct choice for a long-running SQLAlchemy app; the transaction pooler (6543) breaks prepared statements.
5. Create a **Personal Access Token** (account → Access Tokens) for the MCP server only. Note the project ref.
6. Optional (paid plan): network IP restrictions on the database.

## Phase 2 — Backend code/config changes (backend-agent)

Small, surgical changes:

1. **[requirements.txt](expense-tracker-api/requirements.txt)** (+ `requirements.lock`): add `psycopg[binary]>=3.1,<4`.
2. **[database.py](expense-tracker-api/database.py)**:
   - Normalize the URL scheme so the Supabase dashboard string works as-is: if `DATABASE_URL` starts with `postgresql://`, rewrite to `postgresql+psycopg://` (SQLAlchemy otherwise defaults to psycopg2).
   - Add `pool_pre_ping=True` to `create_engine` (Supabase's pooler drops idle connections; harmless for SQLite).
3. **[docker-compose.yml:33-34](docker-compose.yml#L33-L34)**: stop hardcoding `DATABASE_URL=sqlite:///...`. Replace with `env_file: ./expense-tracker-api/.env` so the gitignored `.env` is the single source of truth (also check `docker-compose.prod.yml` for the same pattern).
4. **`expense-tracker-api/.env`** (gitignored, user fills in):
   - `DATABASE_URL=postgresql://...pooler.supabase.com:5432/postgres?sslmode=require`
   - `API_KEY=<generated random key>` — turns ON the existing SEC-02 middleware so the API itself requires `X-API-Key`.
5. **Create `expense-tracker-api/.env.example`** with variable names + comments only (currently missing; frontend already has one).
6. **`expense-tracker/.env`**: set `VITE_API_KEY` to the same key (frontend already sends the header — [api.js:11](expense-tracker/src/services/api.js#L11)).

Tests keep using SQLite per [conftest.py](expense-tracker-api/tests/conftest.py) — no test infrastructure changes; CLAUDE.md's "stay PostgreSQL-compatible" rule already guards query portability.

## Phase 3 — Schema creation on Supabase

No manual SQL: start the backend with the Supabase `DATABASE_URL`. The existing lifespan logic ([main.py:27-89](expense-tracker-api/main.py#L27-L89)) detects a fresh database, runs `Base.metadata.create_all`, stamps Alembic `head`, and runs `seed_defaults()` (default categories + card types).

## Phase 4 — Data migration script (backend-agent)

New script `expense-tracker-api/scripts/migrate_sqlite_to_postgres.py`:

- Opens two engines (source SQLite path + target `DATABASE_URL`), reuses the models from `models.py`.
- Copies tables in FK-safe order: categories/card_types/global_config/month_budgets → expenses, savings, income_entries, fixed_expense_templates → fixed_expense_logs, debts → debt_payments.
- **Skips rows whose primary key already exists** (Phase 3 seeding will have inserted default categories/cards).
- Single transaction on the target; prints per-table source vs. target row counts at the end for parity verification.
- Read-only against the SQLite source.

## Phase 5 — Supabase MCP, read-only

Register at **user scope** (default) so the token lives in `~/.claude.json`, never in the public repo — do NOT use `--scope project` here:

```bash
claude mcp add supabase \
  -e SUPABASE_ACCESS_TOKEN=<personal-access-token> \
  -- npx -y @supabase/mcp-server-supabase \
  --read-only \
  --project-ref <project-ref> \
  --features=database,docs
```

- `--read-only`: Claude can inspect schema and run SELECTs only.
- `--project-ref`: scoped to this single project.
- `--features=database,docs`: excludes account/branching/edge-function tool groups.

## Verification

1. `python -m pytest` from `expense-tracker-api/` — full suite green (SQLite, unaffected).
2. `npm run lint && npm run build` from `expense-tracker/` — green.
3. Start the stack against Supabase (`docker-compose up`), then:
   - Create/edit/delete an expense through the UI end-to-end.
   - Confirm a request **without** `X-API-Key` gets 401 (e.g. `curl http://localhost:8000/expenses`).
4. Run the migration script; confirm row-count parity output matches the SQLite source.
5. `curl https://<ref>.supabase.co/rest/v1/expenses -H "apikey: <anon>"` → must FAIL (Data API disabled).
6. In Claude Code: `/mcp` shows supabase connected; a test SELECT works; an attempted INSERT via MCP is rejected (read-only).
7. After Phase 0: `git log --all --oneline -- expense-tracker-api/expense_tracker.db` returns nothing on the rewritten history.

## Deliverable analysis document

Per the user's request, write `spec/SUPABASE-MIGRATION.md` at the end summarizing: the security analysis (threat model: public repo, leaked history, exposed-by-default Supabase Data API), decisions taken, credentials inventory (what secret lives where, all gitignored), the future-login compatibility note (add `user_id` + backfill later, optionally validating Supabase Auth JWTs in FastAPI), and rollback (point `DATABASE_URL` back at SQLite).

## Files touched

- `expense-tracker-api/requirements.txt`, `requirements.lock`
- `expense-tracker-api/database.py`
- `expense-tracker-api/.env` (user), new `expense-tracker-api/.env.example`
- `docker-compose.yml` (and prod variant if it hardcodes the URL)
- `expense-tracker/.env` (user)
- New `expense-tracker-api/scripts/migrate_sqlite_to_postgres.py`
- New `spec/SUPABASE-MIGRATION.md`
- Git history rewrite (Phase 0) — destructive, needs explicit go-ahead at that step
