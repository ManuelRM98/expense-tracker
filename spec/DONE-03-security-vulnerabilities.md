# 03 — Security Vulnerabilities

*Verified against codebase on 2026-06-08.*

---

## SEC-01: SQLite Database File Is Tracked in Git and Baked into Docker Images

**Severity**: Critical
**File**: `expense-tracker-api/expense_tracker.db`; `expense-tracker-api/.dockerignore`

### Description

`expense_tracker.db` is tracked in the git repository (confirmed via `git ls-files`). The file is a live SQLite database containing all user financial data: expenses, income, savings, debts, salary figures.

The `.dockerignore` at `expense-tracker-api/.dockerignore` currently excludes `venv`, `__pycache__`, `*.pyc`, `*.pyo`, and `.git`, but does **not** exclude `*.db` or `expense_tracker.db`. This means every `docker build` copies the database file into the Docker image at `/app/expense_tracker.db`.

Consequences:
1. Any clone of the repository receives all historical financial data.
2. Any Docker image pushed to a registry contains a snapshot of all financial data.
3. `git log --all` history permanently embeds data from every past commit where the file was tracked.

### Required Actions

1. Add `expense_tracker.db` (or `*.db`) to `.gitignore` and to `expense-tracker-api/.dockerignore`.
2. Remove the file from git history using `git filter-repo --path expense-tracker-api/expense_tracker.db --invert-paths`.
3. Consider rotating/deleting sensitive data from the database before cleaning history.

---

## SEC-02: CORS Wildcard Methods and Headers with No Authentication

**Severity**: High
**File**: `expense-tracker-api/main.py`, lines 57–66

### Description

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

`allow_methods=["*"]` and `allow_headers=["*"]` are overly permissive. The application has zero authentication (no token, session, API key, or any other mechanism). Any browser page served from the allowed origins can make arbitrary read and write requests to the API.

The `allow_origins` list provides no protection for non-browser callers (e.g., `curl`, scripts) — they bypass CORS entirely. The backend listens on `0.0.0.0:8000` (per Dockerfile line 7), which means it is reachable from any process on the host machine or Docker network.

---

## SEC-03: Uvicorn `--reload` Flag Active in Production Dockerfile

**Severity**: High
**File**: `expense-tracker-api/Dockerfile`, line 7

### Description

```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

The `--reload` flag is explicitly documented by Uvicorn as development-only. In the context of this Docker setup:

- The `docker-compose.yml` mounts the entire source directory into the container: `./expense-tracker-api:/app`. Any file written to or changed in `/app` on the host triggers a server restart.
- A restart during a write transaction can interrupt a `db.commit()`, potentially leaving the database in a partially-written state.
- The `watchfiles` package (installed as part of `uvicorn[standard]`) is running and consuming CPU/memory continuously.

---

## SEC-04: API Input Not Validated Against Expected Format for Path Parameters

**Severity**: Medium
**File**: `expense-tracker-api/routers/budget.py` line 72; `expense-tracker-api/routers/analytics.py` lines 56, 62; `expense-tracker-api/routers/fixed_expenses.py` line 77

### Description

Path parameters like `month_key` (e.g., `GET /budget/{month_key}`, `GET /analytics/monthly/{month_key}`, `POST /fixed-expenses/generate/{month_key}`) are typed as `str` with no regex pattern validation:

```python
@router.get("/{month_key}", ...)
def get_month_budget(month_key: str, db: Session = Depends(get_db)):
    row = db.query(models.MonthBudget).filter(
        models.MonthBudget.month_key == month_key
    ).first()
```

Specific issues:

1. **`generate/{month_key}`** calls `month_key.split("-")` and immediately unpacks to `year, month = map(int, month_key.split("-"))` (line 96 of `fixed_expenses.py`). A value like `"not-a-month"` passes the split but `int("not")` raises `ValueError`, returning a 500 Internal Server Error instead of a 422 validation error.

2. **`/budget/{month_key}`** with `month_key = "default"` would query the `MonthBudget` table for `month_key == "default"` on the read endpoint — returning the internal global default row to the caller, even though this is protected on the write endpoint.

3. SQLAlchemy ORM parameterization prevents SQL injection — this is not a SQL injection vector, but it is an API contract violation.

**Correction**: Use FastAPI's `Path(pattern=r"^\d{4}-\d{2}$")` for all `month_key` parameters:

```python
from fastapi import Path

def get_month_budget(
    month_key: str = Path(pattern=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db)
):
```

---

## SEC-05: No Rate Limiting on Any Endpoint

**Severity**: Medium
**File**: `expense-tracker-api/main.py`

### Description

The FastAPI application has no rate limiting middleware. The `POST /fixed-expenses/generate/{month_key}` endpoint is the highest-risk: it performs database writes (inserts `FixedExpenseLog` and `Expense` rows). A loop calling it for 120 distinct month keys would insert up to `120 × (number of templates)` expense rows without any throttle.

The `POST /income` endpoint (`ensureSalaryForMonth`) is called automatically on every month navigation — if a user rapidly navigates through months, multiple in-flight POST requests are issued, each potentially creating a salary entry.

---

## SEC-06: `.env` File Not Excluded from Docker Build

**Severity**: Medium
**File**: `expense-tracker-api/.dockerignore`; `expense-tracker-api/.env`

### Description

The `.dockerignore` does not exclude `.env`. On `docker build`, the `.env` file is copied into the image at `/app/.env`. The current `.env` contains:

```
DATABASE_URL=sqlite:///./expense_tracker.db
# DATABASE_URL=postgresql://user:password@localhost:5432/expense_tracker
```

The SQLite URL contains no credentials. However, the `.env` is clearly structured as the placeholder for a PostgreSQL connection string. When that migration occurs, credentials will be embedded in every Docker image build unless `.env` is added to `.dockerignore` first.

**Correction**: Add `.env` and `*.env` to `expense-tracker-api/.dockerignore`. Pass secrets via `docker-compose.yml` `environment:` keys or Docker secrets at runtime.

---

## SEC-07: `VITE_API_URL` Not Documented — Exposes Backend URL at Build Time

**Severity**: Low
**File**: `expense-tracker/src/services/api.js`, line 1

### Description

```js
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
```

`VITE_API_URL` is the only environment variable the frontend uses, but it is not documented anywhere (no `.env.example`, no README mention). Vite bakes environment variables starting with `VITE_` into the production JavaScript bundle at build time — the value is not hidden from end users. For a personal tool on localhost this is acceptable, but if the frontend is ever deployed to a public URL, the backend's address (including any non-standard port or internal hostname) will be visible in the compiled JS.

There is no `.env.example` in the frontend directory to guide someone setting up the project for the first time.
