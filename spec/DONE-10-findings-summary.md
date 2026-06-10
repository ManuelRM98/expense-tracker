# 10 — Findings Summary and Prioritization

> **STATUS: DONE — all findings resolved on 2026-06-10** via the agentic pipeline
> (backend-agent → frontend-agent ×2 → qa-reviewer fix loop, APPROVED).
> Verification at close: backend pytest 43 passed, frontend lint 0 problems, build green.
> Notes on scope:
> - **SEC-01**: the DB is untracked from the index and ignored, but the *history purge*
>   (`git filter-repo`) is destructive and still requires an explicit human decision.
> - **SEC-02/SEC-05**: mitigated for a personal tool (explicit CORS methods/headers,
>   optional `API_KEY`/`X-API-Key` auth, slowapi rate limiting) — not full auth.
> - **DEBT-05/QUAL-07**: mitigated (distinct-people endpoint + datalist; rename
>   endpoints with cascade) rather than a schema redesign to surrogate keys.
> - **DEP-04**: addressed by exact version pinning (DEP-03); no code change needed.

*Verified and updated on 2026-06-08. All findings have been confirmed against the actual codebase.*

## Changes from Prior Audit

The following corrections were made during the re-audit:

| Prior Claim | Actual Status |
|---|---|
| App.jsx is ~925 lines | Confirmed 924 lines |
| 22 component files | 21 component files |
| 9 models | 10 models |
| DEBT-04 said generation logic was duplicated | Corrected: duplication is resolved; `useFixedExpenses.js` now delegates entirely to the API |
| QUAL-07 analytics.py line numbers | Corrected: `models.Income` used on lines 26–27, 30, 74–76, 80, 90 — not just 26–27 and 74–80 |
| BUG-01 said `.amount` needs to become `.amount_cop` | Confirmed and expanded: `_month_summary` also needs to aggregate multiple entries per month, not use `.first()` |

New findings added in this version:

- **BUG-06**: `AnnualDashboard` ignores `billing_month` (frontend analog of BUG-03)
- **BUG-07**: `MonthlyTrendChart` ignores `billing_month`
- **QUAL-09**: `IncomeBreakdownChart` is exported but never used (dead export)
- **QUAL-10**: `handleSaveSaving` is not async — saving CRUD errors are invisible
- **STATE-07**: `useBudget` initial load swallows all errors silently
- **SEC-07**: `VITE_API_URL` is undocumented
- **DEBT-09**: `CLAUDE.md` completely describes the old localStorage architecture, not the current API architecture

---

## Priority Matrix

| ID | Title | Severity | Document |
|---|---|---|---|
| BUG-01 | `models.Income` doesn't exist — analytics crashes | Critical | 02 |
| SEC-01 | SQLite DB tracked in git and baked into Docker image | Critical | 03 |
| DOCKER-01 | `--reload` in production Dockerfile — data corruption risk | Critical | 06 |
| DOCKER-02 | SQLite not persisted in named volume | Critical | 06 |
| BUG-02 | `ensureSalaryForMonth` fires before `baseSalary` loads | High | 02 |
| BUG-03 | Analytics monthly/annual ignore `billing_month` override | High | 02 |
| BUG-06 | `AnnualDashboard` ignores `billing_month` | Medium | 02 |
| SEC-02 | Wildcard CORS with no authentication | High | 03 |
| SEC-03 | `--reload` expands attack surface | High | 03 |
| PERF-01 | N+1 query in `GET /debts` | High | 04 |
| PERF-02 | 24 queries in a loop for `/analytics/trend` | High | 04 |
| PERF-03 | Frontend fetches all expenses/savings without pagination | High | 04 |
| QUAL-01 | No error handling on frontend mutations | High | 07 |
| QUAL-08 | No test suite | High | 07 |
| QUAL-10 | `handleSaveSaving` is not async — errors invisible | Low | 07 |
| DEBT-01 | Ad-hoc SQL migrations with swallowed exceptions | High | 05 |
| DEBT-02 | 924-line `App.jsx` god component | High | 05 |
| DEBT-03 | `useExpenses` hook owns seven domains | High | 05 |
| DEBT-09 | `CLAUDE.md` describes wrong (old) architecture | Medium | 05 |
| DEP-01 | `pydantic` not in `requirements.txt` | High | 08 |
| STATE-01 | Prior-year income never fetched — shows zero | High | 09 |
| STATE-07 | `useBudget` swallows initial load errors silently | Medium | 09 |
| BUG-04 | SQLite FK cascade not active — manual delete is the only safety net | Medium | 02 |
| SEC-04 | `month_key` path param not format-validated — 500 on bad input | Medium | 03 |
| SEC-05 | No rate limiting on any endpoint | Medium | 03 |
| SEC-06 | `.env` not excluded from Docker build | Medium | 03 |
| SEC-07 | `VITE_API_URL` undocumented | Low | 03 |
| PERF-04 | Summary aggregates not memoized in App.jsx | Medium | 04 |
| PERF-05 | `LIKE`-based date filtering on unindexed column | Medium | 04 |
| QUAL-03 | DB operations execute at import time | Medium | 07 |
| QUAL-04 | `MonthlyTrendChart` prop naming ambiguity | Medium | 07 |
| QUAL-07 | CardType/Category PK is mutable name string | Medium | 07 |
| DEBT-05 | `who_paid` free-text with no reference table | Medium | 05 |
| DOCKER-04 | No health checks — startup race condition | Medium | 06 |
| DOCKER-05 | No restart policy | Medium | 06 |
| DOCKER-06 | Python 3.14 local vs 3.11 Docker | Medium | 06 |
| DOCKER-07 | `.env` and `*.db` not excluded from backend Docker image | Medium | 06 |
| DEP-02 | No lock file for transitive dependencies | Medium | 08 |
| DEP-03 | Frontend `^` ranges allow breaking updates | Medium | 08 |
| DEP-07 | Python 3.14 in local env vs 3.11 in Docker | Medium | 08 |
| STATE-02 | Race condition in `bulkAddExpenses` (very low risk with SQLite) | Medium | 09 |
| STATE-03 | Three API calls on every month navigation | Medium | 09 |
| STATE-04 | Budget snapshot misses months with expenses but no income | Medium | 09 |
| BUG-05 | `toastTimer` in state causes stale closure | Low | 02 |
| BUG-07 | `MonthlyTrendChart` ignores `billing_month` | Low | 02 |
| QUAL-02 | Duplicate `import models` in `main.py` | Low | 07 |
| QUAL-05 | URL parsing in three locations in App.jsx | Low | 07 |
| QUAL-06 | `fmtDate` crashes on undefined | Low | 07 |
| QUAL-09 | `IncomeBreakdownChart` is dead code | Low | 07 |
| DEBT-06 | `billing_month` unvalidated string format | Low | 05 |
| DEBT-07 | Inline styles — no media queries or design system | Low | 05 |
| DEBT-08 | `venv/pyvenv.cfg` committed to git | Low | 05 |
| DOCKER-08 | Anonymous node_modules volume cache issues | Low | 06 |
| DEP-04 | Recharts 3.x API stability risk | Low | 08 |
| DEP-05 | `uvicorn[standard]` installs `watchfiles` unnecessarily | Low | 08 |
| DEP-06 | React Router v7 used in legacy BrowserRouter mode | Low | 08 |
| STATE-05 | Linked expense deletion leaves dangling debt FK | Low | 09 |
| STATE-06 | `toastTimer` in state — stale closure and extra renders | Low | 09 |
| PERF-06 | Prior-year income never loaded (same as STATE-01) | Low | 04 |

---

## Recommended Fix Order

### Immediate (Before Any Production Deployment)

1. **BUG-01** — Fix `models.Income` → `models.IncomeEntry` and `.amount` → `.amount_cop` in `analytics.py`. Also change `.first()` to sum all income entries for the month. This is a 5-line fix that unblocks the entire analytics surface.
2. **SEC-01** — Remove `expense_tracker.db` from the repo, add `*.db` to `.gitignore` and `expense-tracker-api/.dockerignore`. If the file was ever committed, purge it from history with `git filter-repo`.
3. **DOCKER-01** — Remove `--reload` from the backend Dockerfile `CMD`. Create a `docker-compose.override.yml` for development.
4. **QUAL-01** — Wrap all hook mutations and `handleSave*` handlers in `try/catch`, surface errors via `showToast`. At minimum: `handleSave` and `handleSaveSaving` in `App.jsx`.
5. **QUAL-10** — Make `handleSaveSaving` `async` and `await` the `updateSaving`/`addSaving` calls.

### Short Term (Next Iteration)

6. **DEBT-01** — Introduce Alembic for migrations; retire the `run_migrations()` function.
7. **DEP-01** — Add `pydantic>=2.0,<3` explicitly to `requirements.txt`.
8. **PERF-01** — Fix N+1 query in `GET /debts` with a single bulk payment query.
9. **PERF-02** — Replace the trend query loop with two single aggregation queries using `func.strftime`.
10. **STATE-01** — Fetch income entries for all years or lazily fetch on year navigation.
11. **BUG-02** — Add a `baseSalaryLoaded` state gate before calling `ensureSalaryForMonth`.
12. **BUG-03 / BUG-06** — Fix analytics router and `AnnualDashboard` to respect `billing_month`.
13. **DEBT-09** — Rewrite `CLAUDE.md` to accurately describe the current FastAPI + SQLite architecture.
14. **DOCKER-04 / DOCKER-05** — Add healthchecks and restart policies.
15. **QUAL-03** — Move `run_migrations()` and `seed_defaults()` to a FastAPI `lifespan` handler.

### Medium Term (Refactoring)

16. **DEBT-02 / DEBT-03** — Break `App.jsx` into route-level components using `<Routes>` and `<Route>`; split `useExpenses` into domain-specific hooks.
17. **QUAL-08** — Add a `pytest` test suite covering at least each router endpoint's happy path and known error cases.
18. **PERF-03** — Implement month-scoped loading for expenses and savings.
19. **SEC-04** — Add `Path(pattern=r"^\d{4}-\d{2}$")` validation to all `month_key` path parameters.
20. **PERF-05** — Add `index=True` to `date` columns in `Expense`, `Saving`, and `Debt` models.
21. **BUG-04** — Enable `PRAGMA foreign_keys = ON` via a SQLAlchemy connection event.
22. **QUAL-09** — Either add `IncomeBreakdownChart` to the analytics overview tab or delete it.

---

## Positive Observations

These aspects of the codebase are well-implemented and should be preserved:

- **Mapper pattern in `api.js`**: The camelCase ↔ snake_case conversion is centralized, complete (covering all 10 entity types), and consistently applied. It is a robust and clean boundary layer.
- **Pydantic schema coverage**: Every API endpoint has explicit request/response schemas. Input validation with `Field(gt=0)`, `Literal[...]`, and `field_validator` is present throughout `schemas.py`.
- **`FixedExpenseLog` idempotency**: The generation log cleanly prevents duplicate expense creation. The `log_key = "{template_id}_{YYYY-MM}"` pattern is simple and effective.
- **`billing_month` override concept**: The design decision to separate billing date from transaction date is architecturally correct for credit card workflows. The `OR` filter in `expenses.py` correctly implements the priority logic.
- **`useBudget` snapshot logic**: Snapshotting past months before changing the global default budget prevents retroactive modification of historical data — a subtle but correct behavior (with the caveat of STATE-04 for months without income).
- **`request()` helper in `api.js`**: The centralized HTTP helper with a consistent error-throwing pattern is clean. Errors propagate as `Error` objects with meaningful messages (using `err.detail` from FastAPI's error format).
- **Database URL configuration**: The `DATABASE_URL` environment variable pattern in `database.py` is correct — SQLite by default, PostgreSQL by setting the variable, with no code changes needed.
- **OpenAPI documentation**: FastAPI's auto-generated `/docs` provides a full interactive API explorer with response schemas.
- **`DebtPayment` partial-payment tracking**: The design correctly represents the debt lifecycle with `total_paid` and `total_remaining` computed on the fly in `_build_debt_out`, keeping the database schema simple.
