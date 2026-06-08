# 06 — Docker and Deployment Configuration

*Verified against codebase on 2026-06-08.*

---

## DOCKER-01: Backend Runs with `--reload` in the Production Dockerfile

**Severity**: Critical
**File**: `expense-tracker-api/Dockerfile`, line 7

### Description

```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

The `--reload` flag is explicitly unsupported by Uvicorn for production use. In this specific setup, the problem is compounded by `docker-compose.yml` line 19:

```yaml
volumes:
  - ./expense-tracker-api:/app
```

The entire source directory is bind-mounted into the container. `watchfiles` (installed as part of `uvicorn[standard]`) watches `/app` for file system events. Any file write on the host — including SQLite's write-ahead log (`expense_tracker.db-wal`, `expense_tracker.db-shm`) during a transaction — can trigger a server restart mid-request. This is a data corruption vector, not just a stability issue.

**Correction**: Remove `--reload`. For development convenience, use a `docker-compose.override.yml`:

```yaml
# docker-compose.override.yml (git-ignored)
services:
  backend:
    command: ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

---

## DOCKER-02: SQLite Database Not Persisted by a Named Volume

**Severity**: Critical
**File**: `docker-compose.yml`, lines 18–20

### Description

```yaml
backend:
  volumes:
    - ./expense-tracker-api:/app
```

The entire source directory is mounted into the container. The SQLite file lives at `/app/expense_tracker.db` inside the container, which maps to `./expense-tracker-api/expense_tracker.db` on the host. This creates several risks:

1. The database file is overwritten by the bind mount — if the host directory is missing or empty, the container starts with no database.
2. There is no explicit data volume declaration, so `docker volume prune` is irrelevant, but `docker-compose down` followed by `rm -rf ./expense-tracker-api` destroys all data with no Docker warning.
3. When migrating to PostgreSQL, the data path changes entirely; the current setup provides no migration story.
4. The bind mount gives any process on the host full read/write access to the database at all times.

**Standard pattern**: Use a named volume for data, mount only the application code (or better, build the application into the image and use no bind mounts in production):

```yaml
services:
  backend:
    volumes:
      - db_data:/app/data   # SQLite stored at /app/data/expense_tracker.db
      # No source code mount in production

volumes:
  db_data:
```

---

## DOCKER-03: Frontend Dockerfile Serves Vite Dev Server Bound to All Interfaces

**Severity**: High
**File**: `expense-tracker/vite.config.js` lines 7–8; `expense-tracker/Dockerfile` line 7

### Description

```js
// vite.config.js
server: {
  host: true,        // equivalent to --host 0.0.0.0
  watch: {
    usePolling: true, // required for bind mounts in Docker
  },
},
```

```dockerfile
CMD ["npm", "run", "dev"]
```

The Docker container runs Vite's development server (`npm run dev`) bound to all interfaces (`host: true`). Vite's dev server:

- Serves unbuilt source files (including source maps) directly
- Exposes the raw module graph via Vite's plugin API
- Has no authentication or access control

The `dist/` directory exists in the repository (a pre-built artifact), but the Dockerfile ignores it and runs the dev server instead. For any deployment beyond localhost, the frontend should be built with `vite build` and served by a static file server (nginx, Caddy) or CDN.

Note: `usePolling: true` is required for file watching in Docker due to inotify limitations with bind mounts. This is a legitimate development-only configuration.

---

## DOCKER-04: No Health Checks Defined

**Severity**: Medium
**File**: `docker-compose.yml`; both Dockerfiles

### Description

Neither service defines a `HEALTHCHECK` instruction or a `healthcheck:` block in `docker-compose.yml`. The `depends_on: - backend` declaration in the frontend service only checks that the backend **container has started**, not that the FastAPI application is ready to accept connections. On cold start, the backend executes `run_migrations()` and `seed_defaults()` before Uvicorn begins accepting requests. The frontend may issue API calls during this window and receive connection-refused errors.

**Correction**:

```yaml
backend:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 5s
frontend:
  depends_on:
    backend:
      condition: service_healthy
```

The `GET /` endpoint returns `{"status": "ok"}` (verified in `main.py` lines 79–81), making it suitable as a health check target.

---

## DOCKER-05: No `restart` Policy Defined

**Severity**: Medium
**File**: `docker-compose.yml`

### Description

Neither service defines a `restart` policy. If the backend crashes (e.g., due to the `models.Income` bug in BUG-01), Docker will not restart it. The application will appear to be running (containers are up) but all API calls will silently fail or receive connection-refused responses.

**Correction**: Add `restart: unless-stopped` to both services.

---

## DOCKER-06: Python 3.14 Locally vs Python 3.11 in Docker — Version Mismatch

**Severity**: Medium
**File**: `expense-tracker-api/venv/pyvenv.cfg`; `expense-tracker-api/Dockerfile`

### Description

- Local virtualenv: Python 3.14.2 (`home = /opt/homebrew/opt/python@3.14/bin`)
- Docker image: `FROM python:3.11-slim`

Python 3.14 is in active maintenance (stable as of October 2025). Python 3.11 is the LTS version in the Docker image. Specific risk areas:

- `str | None` union syntax (used throughout `schemas.py`) requires Python 3.10+ — safe on both
- `typing.get_type_hints()` behavior changed in 3.11+
- Potential future use of `match` statements, `ExceptionGroup`, or other 3.11+ syntax that would fail silently in the Docker environment

The `requirements.txt` pins package versions but does not constrain the Python interpreter version.

---

## DOCKER-07: `.env` and `*.db` Not Excluded from Backend Docker Image

**Severity**: Medium
**File**: `expense-tracker-api/.dockerignore`

### Description

Current contents:

```
venv
__pycache__
*.pyc
*.pyo
.git
```

Two critical exclusions are missing:

1. `*.db` / `expense_tracker.db` — the SQLite database is copied into the image on every `docker build`. This embeds a snapshot of all user financial data into the image. See also SEC-01.
2. `.env` — the environment file is copied into the image. If a PostgreSQL connection string with credentials is ever placed in `.env`, it will be embedded in every image layer. See also SEC-06.

**Correction**:

```
venv
__pycache__
*.pyc
*.pyo
.git
*.db
.env
*.env
```

---

## DOCKER-08: Anonymous `node_modules` Volume May Cause Stale Dependency Cache

**Severity**: Low
**File**: `docker-compose.yml`, lines 8–10

### Description

```yaml
volumes:
  - ./expense-tracker:/app
  - /app/node_modules    # anonymous volume
```

The anonymous volume `- /app/node_modules` prevents the host's `node_modules` from overwriting the container's. However, anonymous volumes are not cleaned up by `docker-compose down` (only by `docker-compose down -v` or explicit pruning). If `package.json` changes and the image is rebuilt, the anonymous volume may still contain the old `node_modules`, causing version mismatches.

The recommended pattern is to build `node_modules` into the image (the Dockerfile already does this with `RUN npm install`) and not mount the host source directory in production — use a named volume for node_modules or eliminate the source mount entirely.
