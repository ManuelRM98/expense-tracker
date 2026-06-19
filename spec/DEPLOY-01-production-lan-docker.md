# DEPLOY-01 — Production-style Docker for the home LAN (future)

## Status

**Not implemented — future task.** The app is currently served in **dev mode** on the
home network (see "Current state" below). This spec records the recommended
production-style setup to adopt **once everything looks good**, before any eventual
move to a public domain.

## Current state (what we run today)

LAN access is live via the existing dev `docker-compose.yml`:

- **Frontend:** Vite dev server on `:5173` (`server.host: true`), hot-reload.
- **Backend:** uvicorn `--host 0.0.0.0 --port 8000 --reload`.
- **API URL:** the frontend auto-detects the backend host from the browser address
  (`src/services/api.js` → `window.location.hostname` + `:8000`), so the same setup
  works from any device. `VITE_API_URL` overrides it when set.
- **CORS:** `expense-tracker-api/main.py` uses `allow_origin_regex` allowing localhost,
  private-LAN IPs (192.168.x / 10.x / 172.16–31.x) and `.local` names on any port.
- **Auth:** `X-API-Key` is required on every route; CORS is only a browser allow-list.
- **DB:** Supabase (cloud) — no local database.

Access: visit `http://<host-ip>:5173` from any device on the same Wi-Fi. A reserved
DHCP lease keeps `<host-ip>` stable.

## Why move to production-style later

Dev mode is fine for home use but is not built for 24/7 serving: the Vite dev server
and `--reload` carry overhead, watch the filesystem, and are less stable over long
uptimes. A production build is leaner and lets you reach the app at
`http://<host-ip>` with **no port**.

## Proposed approach

Add a `docker-compose.prod.yml` that targets the **existing prod Docker stages**
(already defined in both Dockerfiles — no new images needed):

- **Frontend:** build the static bundle and serve it with **nginx on `:80`**
  (`expense-tracker/nginx.conf` already exists with SPA fallback). Map `80:80`.
- **Backend:** uvicorn **without** `--reload`, still `--host 0.0.0.0 --port 8000`.
- Keep `restart: unless-stopped`; same `env_file` for the backend.

Run with `docker-compose -f docker-compose.prod.yml up -d --build`.

### The one thing to revisit: the `:8000` API port

The frontend currently derives the API URL as `http://<host>:8000`. In a prod setup
two clean options:

1. **Keep `:8000` published** — auto-detect keeps working unchanged (frontend on `:80`,
   API on `:8000`). Simplest; no code change.
2. **Reverse-proxy `/api` through nginx on `:80`** — then the frontend should call a
   same-origin relative base (e.g. `/api`) instead of `:8000`. Cleaner (single port,
   single origin, CORS becomes moot) but requires an nginx `location /api` proxy block
   and a small `api.js` base-URL change. Preferred stepping-stone toward a public
   domain + TLS.

Trade-offs vs. dev mode: no hot-reload (rebuild to ship changes), but more stable and
simpler to expose later.

## Verification (when implemented)

1. `docker-compose -f docker-compose.prod.yml up -d --build`.
2. Host browser: `http://localhost` (port 80) loads; CRUD round-trips.
3. Phone on same Wi-Fi: `http://<host-ip>` loads and reads/writes; no CORS/401.
4. Frontend gate: `npm run lint` + `npm run build`; backend gate: pytest against
   `db-test` (per root CLAUDE.md).

## References

- Root `CLAUDE.md` — run/verify commands, contract rule.
- `AGENTIC_WORKFLOW.md` / `/ship` — commit ritual.
- `spec/SUPABASE-MIGRATION.md` — DB is already cloud, simplifying any future deploy.
