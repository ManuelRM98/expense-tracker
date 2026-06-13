# SUPABASE-MIGRATION — moving the database to hosted Postgres

Status: backend code/config done (Phase 2), migration tooling done (Phase 4).
Pending user action: Supabase project creation (Phase 1), schema + data cutover
(Phase 3–4 run), MCP registration (Phase 5). The history purge (Phase 0) was
**skipped by decision** — see Security analysis below.

This document summarizes the security analysis, decisions, credentials inventory,
the future-login compatibility note, and rollback. The full step plan lives in
`../SUPABASE-MIGRATION-PLAN.md`.

## Goal

Move the database from a local SQLite file to Supabase (hosted PostgreSQL), keeping
the FastAPI backend as the **sole** database client (per the root CLAUDE.md
architecture — the frontend only ever talks to FastAPI). Also connect Supabase to
Claude Code via a **read-only** MCP server.

## Security analysis (threat model)

| Threat | Status / mitigation |
| --- | --- |
| Real `expense_tracker.db` committed in git history (SEC-01) | Repo is **private** (verified: anonymous GitHub API returns 404). Blast radius is limited to collaborators. The destructive `git filter-repo` purge was **skipped** — it rewrites every commit SHA and force-pushes, which is high risk for little gain on a private repo. **Revisit before ever making the repo public.** The file is gitignored (`*.db`), so no new commits add it; the SQLite source is being retired entirely. |
| Supabase exposes data by default via the auto-generated Data API (PostgREST) with `anon`/`service_role` keys | **Disabled the Data API** in the dashboard (Phase 1, confirmed by user). With it off, those keys grant nothing — the DB is reachable only over the Postgres connection the backend holds. **Also applied (2026-06-12) RLS deny-all** (RLS enabled, zero policies) on all 13 public tables as defense-in-depth: blocks `anon`/`authenticated` if the Data API is ever re-enabled, while the backend's `postgres` role bypasses RLS (`rolbypassrls=true`) so the app is unaffected. |
| Unauthenticated access to the FastAPI API | Turn on the existing SEC-02 middleware by setting `API_KEY` (done). All routes except `/`, `/docs`, `/openapi.json`, `/redoc` now require `X-API-Key`. |
| Credentials leaking into the repo | All secrets live in **gitignored** `.env` files (verified via `git check-ignore`); the MCP token lives at user scope in `~/.claude.json`. Committed `.env.example` files carry names + comments only. |
| Plaintext DB connections | **Enforce SSL** in the dashboard (Phase 1) and keep `?sslmode=require` in `DATABASE_URL`. |
| Pooler/prepared-statement incompatibility | Use the **Session Pooler** string (port 5432), not the transaction pooler (6543). `database.py` adds `pool_pre_ping=True` to survive dropped idle connections. |

## Decisions taken

1. **Supabase = hosted Postgres only.** No frontend → Supabase calls; FastAPI stays the only client.
2. **Migrate existing SQLite data** into Supabase (script in Phase 4).
3. **MCP is read-only**, scoped to the single project, token at user scope (never in the repo).
4. **History purge skipped** because the repo is private (originally the plan assumed public). Documented as a pre-public-release task instead.
5. **API key auth turned on now**, with matching keys in both `.env` files so local dev keeps working.

## Credentials inventory (what secret lives where — all gitignored)

| Secret | Location | Committed? |
| --- | --- | --- |
| `DATABASE_URL` (Supabase Session Pooler string, incl. DB password) | `expense-tracker-api/.env` | No (`*.env` ignored) |
| `API_KEY` (random, `secrets.token_urlsafe(32)`) | `expense-tracker-api/.env` | No |
| `VITE_API_KEY` (**identical** to `API_KEY`) | `expense-tracker/.env` | No |
| Supabase Personal Access Token (MCP) | `~/.claude.json` (user scope) | No |
| Names + comments only, no values | `*/.env.example` | Yes (safe) |

The `API_KEY` and `VITE_API_KEY` values **must stay identical** — a mismatch makes the
backend return 401 on every request.

## What changed in code (Phase 2)

- `expense-tracker-api/requirements.txt` (+ regenerated `requirements.lock`): added `psycopg[binary]>=3.1,<4`.
- `expense-tracker-api/database.py`: rewrites a bare `postgresql://` URL to `postgresql+psycopg://`; added `pool_pre_ping=True`. SQLite path unchanged.
- `docker-compose.yml` and `docker-compose.prod.yml`: backend now reads `env_file: ./expense-tracker-api/.env` instead of a hardcoded `DATABASE_URL` (the `.env` is the single source of truth).
- New `expense-tracker-api/.env.example` (was missing); updated `expense-tracker/.env.example` to note the key-match requirement.
- New `expense-tracker-api/scripts/migrate_sqlite_to_postgres.py` (Phase 4 tooling).

Tests are unaffected: `tests/conftest.py` pins `DATABASE_URL` to a temp SQLite file, so
the suite never touches Postgres. CLAUDE.md's "stay PostgreSQL-compatible" rule guards
query portability.

## Cutover runbook (remaining user-gated steps)

1. **Phase 1 — dashboard:** create the project (strong generated DB password); disable the Data API; enforce SSL; copy the **Session Pooler** string; create a Personal Access Token; note the project ref.
2. **Phase 2 config (user fills secrets):** put the Supabase string in `expense-tracker-api/.env` as `DATABASE_URL` (keep `?sslmode=require`). `API_KEY` / `VITE_API_KEY` are already set and matched.
3. **Phase 3 — create schema:** `pip install -r requirements.txt` in the venv, then start the backend once against the Supabase `DATABASE_URL`. The lifespan hook (`main.py`) runs `create_all`, stamps Alembic `head`, and seeds defaults.
4. **Phase 4 — migrate data:** `DATABASE_URL="<supabase>" python scripts/migrate_sqlite_to_postgres.py`. Confirm the per-table source-vs-target parity report.
5. **Phase 5 — MCP (read-only, user scope):**
   ```bash
   claude mcp add supabase \
     -e SUPABASE_ACCESS_TOKEN=<personal-access-token> \
     -- npx -y @supabase/mcp-server-supabase \
     --read-only --project-ref <project-ref> --features=database,docs
   ```

## Future login compatibility (out of scope, recorded)

The schema is single-user with no `users` table, which keeps the future login feature
simple. When login lands: enable **Supabase Auth** (email/password); the frontend
login/signup pages call Supabase Auth directly (auth only — data still flows through
FastAPI); FastAPI verifies the `Authorization: Bearer <supabase-jwt>` against the
project's JWT secret/JWKS, replacing the static `X-API-Key`; add a nullable `user_id`
column per table via Alembic, backfill all existing rows to the owner's account in one
`UPDATE`, then make it required and scope every query by the authenticated user.
Nothing in this migration blocks that.

## Rollback

Point `DATABASE_URL` back at SQLite (`sqlite:///./expense_tracker.db`) in
`expense-tracker-api/.env` and restart. The local `.db` is untouched (the migration
opens it read-only). To also disable API auth, blank out `API_KEY` and `VITE_API_KEY`.
