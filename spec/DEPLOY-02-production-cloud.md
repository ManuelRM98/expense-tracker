# DEPLOY-02 — Public cloud deployment (Vercel + Render + Supabase)

## Status

**Not implemented — future task.** This spec records the recommended path to take the
app from LAN-only (dev mode today; [DEPLOY-01](DEPLOY-01-production-lan-docker.md) for
a stopgap prod-Docker LAN setup) to a public URL reachable from anywhere, on services
with usable free tiers. No code, config, or CI file is created by this document — it is
a plan for a later implementation pass.

## Current state

- **Frontend:** Vite dev server, LAN-only, `window.location.hostname:8000` auto-detects
  the backend host (`expense-tracker/src/services/api.js:4-6`).
- **Backend:** uvicorn on the same LAN host, `--reload` in dev. CORS
  (`expense-tracker-api/main.py:97-112`) defaults to an `allow_origin_regex` permitting
  `localhost` + private-LAN ranges + `*.local`, or an explicit allow-list when
  `CORS_ALLOW_ORIGINS` is set.
- **Auth:** Supabase JWT bearer tokens (`AUTH-01`), sent as `Authorization: Bearer
  <token>` on every request, over plain HTTP on the LAN.
- **DB:** Supabase Postgres (already cloud — see `SUPABASE-MIGRATION.md`), so the
  database side of a public deploy is already done.
- **Prod Docker stages:** both `Dockerfile`s already have a `prod` target (nginx-served
  static build for the frontend; bare `uvicorn` without `--reload` for the backend), and
  `docker-compose.prod.yml` already wires them together for the self-host path (see
  "Alternative" below). These same images/stages are reused for Render in this spec —
  no new Dockerfile is needed.

## Why move to a public cloud deployment

LAN-only access means the app is unreachable from a phone on mobile data, from work, or
from anywhere off the home Wi-Fi. It also leaves two security findings from
[SEC-01](SEC-01-security-review.md) open by design, accepted only as long as the app
stays on the trusted LAN:

- **SEC-01-1** — bearer tokens travel over plaintext HTTP; anyone on the same LAN segment
  can capture and replay one.
- **SEC-01-4** — CORS accepts any private-LAN/`*.local` origin rather than a single known
  origin (low risk today because auth is bearer-token, not cookie-based, but still wider
  than necessary).

A public deployment behind HTTPS closes SEC-01-1 outright (nothing to capture on the
wire) and lets SEC-01-4 be tightened to a single exact origin, since there is now exactly
one legitimate frontend origin instead of an open-ended set of LAN addresses.

## Proposed approach

### Architecture

```
                         HTTPS                          HTTPS
   Browser  ───────────────────────────▶  Vercel   ───────────────▶  (static bundle,
 (any network)                          (frontend,                   served once,
                                        static Vite                  no server calls)
                                          build)
      │                                                                    
      │ HTTPS  Authorization: Bearer <supabase JWT>                        
      ▼                                                                    
   Render  ──────────────────────────────────────────────────▶  Supabase
 (backend,                                                    (Postgres + Auth,
  FastAPI in                                                   already cloud —
  the existing                                                 SUPABASE-MIGRATION.md)
  `prod` Docker
  stage; long-lived
  container, runs
  Alembic migrations
  at startup)

   [GitHub Action, cron ~10 min] ──ping──▶ Render  (prevent idle sleep)
                                  ──ping──▶ Supabase (prevent 7-day pause)
```

Three managed services, each doing the one thing it's good at:

- **Vercel** — static hosting for the Vite build (`expense-tracker/dist`). CDN-backed,
  zero server to manage, auto-deploys on push.
- **Render** — a persistent container running the existing backend `prod` Docker stage.
- **Supabase** — already the database and auth provider; no change here, just wiring the
  new frontend/backend origins into it.

### Why the FastAPI backend cannot simply live on Vercel serverless

Vercel's serverless functions are the wrong shape for this backend, for three concrete
reasons tied to how it's built:

1. **Startup migrations via `lifespan`** — `main.py`'s `lifespan()` calls
   `_run_alembic_migrations()` once, before the app starts serving (`main.py:65-69`).
   Serverless functions have no persistent "process startup" — each cold invocation is a
   fresh, isolated execution, so this would either re-run migrations on every cold start
   (wasteful, and racy if two cold starts overlap) or need to be relocated to a separate
   deploy-time step, which the current design doesn't have.
2. **Long-lived process assumption** — the rate limiter (`slowapi.Limiter`, `main.py:19-
   22`) and CORS/middleware stack are configured once at import time and assumed to
   persist across requests within a warm process. Serverless platforms spin up/tear down
   instances unpredictably, undermining any in-memory state (the rate limiter's counters
   in particular).
3. **SQLAlchemy connection pool** — `database.py`'s `engine` holds a connection pool sized
   for a small number of long-lived workers. Serverless functions scale by spawning many
   short-lived, parallel instances, each of which would open its own pool against
   Supabase's pooler — a pattern serverless/Postgres integrations typically solve with
   pooler products (e.g. PgBouncer-aware drivers, connection-per-invocation limits) that
   this codebase does not implement. Supabase's session pooler (already required to be
   used at port 5432 per `.env.example`) is itself tuned for a modest number of persistent
   clients, not serverless fan-out.

Render (or any container platform) sidesteps all three: one process, warm the whole
time it's up, migrations run exactly once at boot.

### Security prerequisites (must precede public exposure)

These must be true before the URL is shared with anyone outside the LAN:

1. **HTTPS on both platforms.** Vercel and Render both terminate TLS by default on their
   own domains (`*.vercel.app`, `*.onrender.com`) with no extra setup. This closes
   **SEC-01-1** — bearer tokens no longer cross the wire in plaintext.
2. **`CORS_ALLOW_ORIGINS` set to the exact Vercel domain.** Once deployed, set this env
   var on the Render backend to the single production frontend origin, e.g.
   `CORS_ALLOW_ORIGINS=https://expense-tracker.vercel.app` (`main.py:97-101` already
   branches on this env var — when set, it replaces the `allow_origin_regex` LAN
   allow-list with an exact-match list). This retires the broad LAN regex for the public
   deployment and closes **SEC-01-4**.
3. **`VITE_API_URL` is MANDATORY in prod.** `api.js`'s fallback —
   `` `${window.location.protocol}//${window.location.hostname}:8000` `` (`api.js:4-6`) —
   assumes the API lives on the same host as the frontend, one port over. On Vercel that
   fallback resolves to `https://expense-tracker.vercel.app:8000`, which does not exist.
   `VITE_API_URL` must be set at build time to the Render backend's URL (e.g.
   `https://expense-tracker-api.onrender.com`), or every API call fails.
4. **Register the Vercel URL with Supabase Auth.** In the Supabase dashboard → Auth →
   URL Configuration, add the production Vercel URL as the **Site URL** and as a
   **Redirect URL** (email confirmation links, magic links, and OAuth callbacks — if
   used — all check against this allow-list; without it, auth emails will link back to
   `localhost`).
5. **`SUPABASE_SERVICE_ROLE_KEY` present on the backend.** Required for
   `DELETE /account/me` (FEAT-14 account deletion, which calls the Supabase Admin API to
   remove the auth identity). This is a backend-only env var — never expose it to Vercel
   or any frontend build.

### Backend deploy (Render), step-by-step

1. Create a new **Web Service** on Render, pointed at this repo, with:
   - **Root directory:** `expense-tracker-api`
   - **Environment:** Docker (Render builds directly from the `Dockerfile`)
   - **Docker build target:** `prod` (the stage already defined at
     `expense-tracker-api/Dockerfile:19-20` — no `--reload`, matches DOCKER-01/SEC-03).
2. Set environment variables in the Render dashboard:
   - `DATABASE_URL` — the Supabase **session pooler** connection string, port **5432**,
     with `?sslmode=require` appended, per `.env.example:9-13`. **Do not** use the 6543
     transaction-pooler port — it breaks SQLAlchemy's prepared statements.
   - `SUPABASE_URL` — the Supabase project URL (required; the backend fails fast at
     import if unset).
   - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard → Settings → API.
   - `CORS_ALLOW_ORIGINS` — the exact Vercel production URL (see security prerequisites
     above).
   - Leave `DISABLE_RATE_LIMIT` **unset** — keep rate limiting (SEC-05) on in production;
     this is a public endpoint now.
   - Leave `API_KEY` unset (auth is via Supabase JWT bearer tokens per AUTH-01; `X-API-Key`
     is legacy — see doc-hygiene follow-ups below).
3. **Migrations run automatically** — no separate migration step to configure. Render
   starts the container with the `prod` stage's `CMD` (`uvicorn main:app --host 0.0.0.0
   --port 8000`), and `lifespan()` runs `_run_alembic_migrations()` once before the app
   accepts traffic (`main.py:65-69`).
4. **Health check:** point Render's health check at `GET /` (already implemented,
   `main.py:138-140`, returns `{"status": "ok", "docs": "/docs"}`). This is the same
   check `docker-compose.prod.yml` already uses for the backend service.
5. Note the assigned Render URL (e.g. `https://expense-tracker-api.onrender.com`) — it
   becomes `VITE_API_URL` for the frontend deploy below.

### Frontend deploy (Vercel), step-by-step

1. Import the repo into Vercel as a new project with:
   - **Root directory:** `expense-tracker/`
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
2. Set environment variables in the Vercel dashboard (Project → Settings →
   Environment Variables), scoped to Production:
   - `VITE_API_URL` — the Render backend URL from the step above.
   - `VITE_SUPABASE_URL` — same Supabase project URL used on the backend.
   - `VITE_SUPABASE_ANON_KEY` — the Supabase anon (public) key, **not** the service-role
     key (`expense-tracker/.env.example:11-16`).
3. Vercel auto-deploys on every push to `master` by default — no extra CI wiring needed
   for the frontend build/deploy itself (separate from the test/lint CI gate below).
4. After the first deploy, go back and complete security-prerequisite step 4 above
   (register this exact Vercel URL in Supabase Auth) and step 2 (set
   `CORS_ALLOW_ORIGINS` on Render to this exact URL) — both depend on knowing the final
   Vercel domain.

### Keep-alive on the free tier

The user is staying on the **Supabase free tier** (and Render's free tier for the
backend), which both have idle-based sleep/pause behavior:

- **Supabase free-tier projects pause after 7 days of no API activity.** A paused
  project stops serving Postgres/Auth requests until manually resumed from the
  dashboard — an outage the user would otherwise discover the next time they open the
  app.
- **Render free-tier web services spin down after ~15 minutes of no inbound traffic.**
  The next request then pays a cold-start penalty (container boot + the Alembic
  migration check in `lifespan()`) that can take tens of seconds, which reads as the app
  "hanging" on first load.

Both are solved by a single scheduled **GitHub Action** (cron, roughly every 10 minutes)
that sends a lightweight HTTP request to each:

- `GET https://expense-tracker-api.onrender.com/` — keeps the Render container warm
  (same health-check endpoint used above).
- A trivial authenticated or anonymous read against the Supabase REST/health endpoint —
  keeps the Supabase project's activity counter from reaching the 7-day pause threshold.

This workflow lives under `.github/workflows/` alongside the CI pipeline described in
[TEST-01](TEST-01-testing-automation.md) (pytest/lint/build gates) — two separate
workflow files with two separate triggers (`schedule` for the keep-alive ping vs. `push`/
`pull_request` for CI), not one combined workflow.

### Alternative: self-host on a VPS (brief)

If avoiding third-party PaaS free-tier limits (and their cold-start/pause behavior)
matters more than convenience, the existing `docker-compose.prod.yml` (already built for
[DEPLOY-01](DEPLOY-01-production-lan-docker.md)) can run on any VPS instead of the home
LAN host: point a domain's DNS at the VPS IP, and put Caddy or nginx in front to
terminate TLS (Caddy auto-provisions Let's Encrypt certs with near-zero config; nginx
needs an explicit certbot setup). This reuses the exact same `prod` Docker stages as the
Vercel/Render path above — no new images.

**Trade-off:** full control over the stack (no idle sleep, no free-tier caps, one
place to look at logs) in exchange for owning the server: OS patching, TLS certificate
renewal, uptime monitoring, and backups all become the user's job rather than the
platform's.

### Doc-hygiene follow-ups (flag only — do not fix here)

- `readme.md` still documents `X-API-Key` as the auth mechanism (lines 24, 118, 138),
  but the app has moved to Supabase JWT bearer tokens (AUTH-01). `API_KEY`/`X-API-Key`
  still exist in the codebase as an optional secondary gate, but the README presents it
  as *the* auth story, which is stale and should be corrected when this deploy is
  implemented.
- Several `spec/` documents (this one included, once implemented) will need their
  `## Status` headers flipped from "Not implemented" to reflect reality; a pass over
  all `spec/*.md` status lines is worth doing at that time rather than one file at a
  time.

## Verification (when implemented)

1. From a network **outside** the home LAN (e.g. mobile data, a different Wi-Fi): open
   the Vercel URL, sign up (or sign in), add an expense, reload the page, and confirm it
   round-trips — all over HTTPS.
2. Browser devtools console/network tab: no CORS errors, no 401s on normal use.
3. Force a cold request after the Render service has been idle (or right after a
   keep-alive gap) and observe the cold-start delay directly, to confirm it's within an
   acceptable bound and the app doesn't appear broken while it warms up.
4. Frontend gate: `npm run lint` + `npm run build` (from `expense-tracker/`).
5. Backend gate: pytest against `db-test`, per root `CLAUDE.md`.

## References

- Root `CLAUDE.md` — architecture, run/verify commands, contract rule.
- [DEPLOY-01](DEPLOY-01-production-lan-docker.md) — prod Docker stages, `nginx.conf`,
  `docker-compose.prod.yml`, the self-host alternative this spec builds on.
- [SEC-01](SEC-01-security-review.md) — SEC-01-1 (plaintext bearer tokens) and SEC-01-4
  (CORS allow-list) findings this deploy closes.
- [AUTH-01](AUTH-01-multi-user-authentication.md) — JWT auth model; TLS called out there
  as a hard prerequisite for public launch.
- [TEST-01](TEST-01-testing-automation.md) — CI pipeline the keep-alive workflow sits
  alongside under `.github/workflows/`.
- `SUPABASE-MIGRATION.md` — DB/Auth are already on Supabase, simplifying this deploy.
- `expense-tracker-api/.env.example`, `expense-tracker/.env.example` — exact env var
  names used above.
