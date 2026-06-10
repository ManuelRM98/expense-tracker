# 08 — Dependency Health

*Verified against codebase on 2026-06-08.*

---

## DEP-01: `pydantic` Is Not Listed in `requirements.txt`

**Severity**: High
**File**: `expense-tracker-api/requirements.txt`

### Description

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy==2.0.36
python-dotenv==1.0.1
```

`pydantic` is used directly and extensively throughout `schemas.py` (`from pydantic import BaseModel, Field`, Pydantic v2 features: `model_dump()`, `model_validate()`). It is not listed as a direct dependency — it is pulled in transitively by FastAPI.

Problems:
1. The exact pydantic version is not pinned. FastAPI 0.115.0 declares `pydantic>=1.7.4` as a minimum — this allows any pydantic v1 or v2 version, and a `pip install` might resolve to pydantic v1 depending on environment, breaking all v2 API calls.
2. Pydantic v3 (in development) would break the application on `pip install --upgrade` without any explicit constraint.
3. `requirements.txt` is supposed to be the authoritative direct dependency list.

**Correction**: Add `pydantic>=2.0,<3` (or the exact pinned version in use) as an explicit entry.

---

## DEP-02: No Lock File for Transitive Dependencies

**Severity**: Medium
**File**: `expense-tracker-api/requirements.txt`

### Description

Direct dependencies are pinned to exact versions (`==`) which is correct. However, transitive dependencies are not pinned at all. Running `pip install -r requirements.txt` will resolve transitive dependencies to whatever is latest at install time. Two Docker builds on different days can produce different dependency trees.

**Correction**: Use `pip-compile` (pip-tools) or `uv lock` to generate a fully-resolved lock file with hashes:

```bash
pip-compile requirements.in --generate-hashes -o requirements.txt
# or
uv pip compile requirements.in --output-file requirements.txt
```

---

## DEP-03: Frontend `^` Ranges Allow Breaking Updates

**Severity**: Medium
**File**: `expense-tracker/package.json`

### Description

```json
"react": "^19.2.4",
"react-dom": "^19.2.4",
"react-router-dom": "^7.14.2",
"recharts": "^3.8.1"
```

The `^` prefix allows any compatible minor/patch update. `package-lock.json` is present and provides reproducibility for `npm ci`. However, `npm update` or a fresh `npm install` without a lockfile would allow:

- React Router `^7.14.2` → any `7.x.y >= 7.14.2`
- Recharts `^3.8.1` → any `3.x.y >= 3.8.1`

React Router 7 and Recharts 3 are both recent major versions with ongoing API changes. A minor update could change behavior in undocumented ways.

---

## DEP-04: Recharts 3.x Uses Recharts 2.x-Style API — Potential Deprecation Risk

**Severity**: Low
**File**: `expense-tracker/package.json`; `expense-tracker/src/components/Charts.jsx`

### Description

`recharts: "^3.8.1"` targets Recharts 3. The `Charts.jsx` file uses `ResponsiveContainer`, `PieChart`, `BarChart`, `LineChart`, and their children components — all of which are valid in Recharts 3. However, Recharts 3 introduces new composition patterns and the `^` range allows updates to any 3.x version that may deprecate the components used here.

Current usage (verified in `Charts.jsx`): `PieChart`, `Pie`, `Cell`, `Tooltip`, `ResponsiveContainer`, `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Legend`, `LineChart`, `Line` — all are core components unlikely to be removed, but worth monitoring.

---

## DEP-05: `uvicorn[standard]` Installs `watchfiles` — Unnecessary in Production

**Severity**: Low
**File**: `expense-tracker-api/requirements.txt`

### Description

`uvicorn[standard]` installs optional extras including `watchfiles` (the file watcher used by `--reload`), `websockets`, and `httptools`. In production:

1. `watchfiles` adds unnecessary package weight to the Docker image.
2. It is the underlying mechanism that enables `--reload` (see DOCKER-01) — removing `[standard]` in a production requirements file would prevent `--reload` from working even if the flag were accidentally passed.

**Correction**: Use `uvicorn` (without extras) in `requirements.txt`. Create a `requirements-dev.txt` with `uvicorn[standard]` for local development.

---

## DEP-06: React Router v7 Used in Legacy `BrowserRouter` Mode

**Severity**: Low
**File**: `expense-tracker/src/main.jsx`

### Description

```jsx
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
```

React Router v7 introduces `createBrowserRouter` as the preferred API with full data router support (loaders, actions, error boundaries, form actions). Using `BrowserRouter` in v7 is supported but foregoes all of these features. More importantly, the application uses `useNavigate` and `useLocation` heavily, but no `<Routes>` or `<Route>` components exist anywhere — React Router is used only as an imperative history and location manager.

The `react-router-dom` package provides approximately 5% of its value while adding its full bundle size to the application. The navigation patterns could be replaced with the browser's native `history.pushState` API, or properly upgraded to use data routes.

---

## DEP-07: Python 3.14 Locally vs Python 3.11 in Docker

**Severity**: Medium
**File**: `expense-tracker-api/venv/pyvenv.cfg`; `expense-tracker-api/Dockerfile`

### Description

- Local virtualenv: Python 3.14.2 (`version = 3.14.2` in `pyvenv.cfg`)
- Docker image: `FROM python:3.11-slim`

Python 3.14.0 reached stable release in October 2025. As of June 2026, 3.14.x is in active maintenance. Python 3.11 remains the Docker LTS baseline.

The gap creates risk: syntax features available in 3.12+ (e.g., type parameter syntax `type X = ...`, improved `match` statement semantics) that a developer writes locally will fail silently in the Docker environment. The `requirements.txt` pins package versions but does not constrain the Python interpreter version.

The `|` union syntax in `schemas.py` (`str | None`, `int | None`) requires Python 3.10+ and is safe on both. However, future development on 3.14 could introduce 3.12+ or 3.13+ features.

**Correction**: Pin the Python version in `requirements.txt` with a comment, or add a `.python-version` file specifying `3.11`, and align the local development environment with the Docker image.
