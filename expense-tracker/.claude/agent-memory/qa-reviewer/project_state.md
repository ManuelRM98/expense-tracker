---
name: project-state-post-spec-impl
description: State of the expense-tracker after the full spec/02-09 implementation pass; known architectural gaps and decisions
metadata:
  type: project
---

All 45+ spec findings (BUG-, SEC-, PERF-, QUAL-, DEBT-, STATE-, DOCKER-, DEP-) were implemented in a single large working-tree diff reviewed on 2026-06-10.

**Why:** The user runs an agentic pipeline (spec → backend-agent → frontend-agent → qa-reviewer). This was the first full-sweep implementation pass.

**How to apply:** Future reviews should check that regressions from this pass are not reintroduced. Key architectural decisions made in this pass:

- Backend: Alembic migrations via lifespan; slowapi rate limiting; /expenses/people endpoint; billing_month validator in schemas; category/card rename with cascade; trend uses func.coalesce + func.substr (PostgreSQL-compatible, no strftime)
- Frontend: App.jsx split into src/pages/; useExpenses split into 5 domain hooks composed by useAppData; month-scoped expense/saving caches; trend charts consume GET /analytics/trend directly
- Docker: multi-stage Dockerfiles (prod default no --reload); docker-compose.yml targets dev; docker-compose.prod.yml with named volume; nginx.conf present

**Known remaining gaps (approved but noted):**
1. AnnualDashboard prior-year data gap: HomeView passes only cached expensesByMonth/savingsByMonth flat arrays without triggering loads for prior years. Navigating to a prior year shows only already-cached months. Not a crash, but incomplete data until the user manually visits those months.
2. ensureSalaryForMonth race for prior-year months: fetchIncomeForYear(year) is not awaited before ensureSalaryForMonth runs. For prior-year months, this can create a duplicate salary entry if the year's income hasn't been fetched yet. The initializedMonthsRef guard prevents repeat triggers on navigation but not the first visit.
3. API_KEY const in api.js is declared at line 136 but used at line 8. In ES modules, this is a TDZ violation at runtime — REJECTED issue.
4. getTrend() returns raw snake_case objects (no camelCase mapper); Charts.jsx accesses p.month_key, p.total_expenses, p.total_savings directly. This is an intentional convention break but consistent within the chart components.
