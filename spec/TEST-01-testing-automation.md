# TEST-01 — Testing automation ladder: CI → frontend unit tests → E2E (future)

## Status

**Not implemented — future task.** This spec plans, in strict dependency order, the
work needed to go from "backend has pytest, nothing else does" to a full testing
pyramid with a CI gate. No test, workflow, or application code is written by this
document — it is a plan for later implementation, phase by phase, each phase shippable
and valuable on its own before the next one starts.

## Current state (what exists today)

- **Backend:** a real pytest suite — 106 tests across 18 `test_*.py` files in
  `expense-tracker-api/tests/`, run against PostgreSQL (never SQLite) via the
  throwaway `db-test` compose service or a host venv pointed at
  `TEST_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5440/expense_test`.
  `expense-tracker-api/tests/conftest.py` seeds a fresh schema per test and
  authenticates by overriding the real dependency:
  `app.dependency_overrides[get_current_user] = lambda: user` (see `set_auth_user`,
  `USER_A`/`USER_B`) — there is no `X-API-Key` anymore and no real JWT is verified in
  tests. It also **refuses to run against Supabase** (`assert "supabase" not in
  _TEST_DB_URL.lower()`) and **requires** a `postgresql://` URL.
- **Frontend:** zero tests. `expense-tracker/package.json` has `dev`, `build`, `lint`,
  `preview` only — no `test` script, no test runner installed.
- **CI:** none. `.github/` does not exist anywhere in the repo. Every check
  (`pytest`, `npm run lint`, `npm run build`) is run manually, by a human or by
  `qa-reviewer`, never automatically on push/PR.
- **Hooks:** none configured in `.claude/settings.json` (`AGENTIC_WORKFLOW.md` §5.2
  recommends adding lint/test hooks only once a suite is stable — deferred by design).
- **Agents/skills:** `qa-reviewer` (`.claude/agents/qa-reviewer.md`) already runs
  pytest + lint + build by hand as its first checklist item. `AGENTIC_WORKFLOW.md`
  §2.5 drafted an `e2e-test-engineer` agent and an `e2e/` layout, but that draft
  predates the Supabase migration: it assumes SQLite and an `X-API-Key` header. The
  app now runs multi-user Supabase-JWT auth in production and the *test* auth model
  is the `dependency_overrides` bypass shown above — any e2e design must be corrected
  to match that, not the stale draft.

## Why this order (the ladder)

Each phase depends on the previous one being real and stable, and each is valuable
by itself even if the ladder stops there:

1. **CI first** — without it, every later phase (unit tests, e2e) is just more code
   that a human has to remember to run. CI is what makes any test suite actually
   enforced, and it needs no new agent or new test code to add value on day one
   (it just runs what already exists: pytest + lint + build).
2. **Frontend unit tests second** — cheap, fast, deterministic; they catch the hook
   and formatting logic that today has zero coverage, and they slot into the CI job
   built in phase 1 with one extra step.
3. **E2E last** — the slowest, flakiest layer, and the one `AGENTIC_WORKFLOW.md` §2.5
   already flags as depending on "the pytest foundation is green and stable" (true
   today). Building it first would mean debugging flaky browser tests on top of an
   unverified backend and an untested frontend — the worst possible order.

This mirrors the standard testing pyramid (many fast unit/API tests, few slow e2e
tests) and the project's own stated anti-pattern of not front-loading the most
expensive layer.

## Proposed approach

### Phase 1 — CI (GitHub Actions), no new agent

1. Add `.github/workflows/ci.yml` triggered on `push` and `pull_request` to `master`.
2. Define a `postgres:17-alpine` **service container** on the job, mirroring
   `docker-compose.yml`'s `db-test` service exactly: `POSTGRES_USER=postgres`,
   `POSTGRES_PASSWORD=postgres`, `POSTGRES_DB=expense_test`, port `5432` mapped to
   `5432` on the runner (GitHub Actions service containers are reached via
   `localhost` when the job itself doesn't run inside a `container:`), with a
   `pg_isready` health check so the job waits for it before running tests.
3. Backend steps: checkout → set up Python 3.10+ → `pip install -r requirements.txt
   -r requirements-dev.txt` (from `expense-tracker-api/`) → export
   `TEST_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/expense_test`
   → `python -m pytest`. This is exactly what `conftest.py` already expects; no
   backend code changes needed.
4. Frontend steps: set up Node → `npm ci` (from `expense-tracker/`) → `npm run lint`
   → `npm run build`.
5. Both halves run in the same workflow file (either one job with sequential steps,
   or two jobs so backend/frontend failures are visually separated in the Checks
   tab — prefer two jobs for clearer signal on which side broke).
6. **This workflow becomes the deploy gate for cloud production.**
   `spec/DEPLOY-02-production-cloud.md` should require this CI job green
   before any deploy step runs, and its keep-alive workflow (if the target platform
   needs one to prevent a free-tier service from sleeping) would live alongside this
   file under `.github/workflows/` — plan the two workflows to coexist, not collide.
7. No new subagent is needed for this phase — it is a static config file, not a
   task requiring project-specific judgment call after call.

### Phase 2 — Frontend unit tests (Vitest + React Testing Library)

1. Add devDependencies to `expense-tracker/package.json`: `vitest`,
   `@testing-library/react`, `@testing-library/jest-dom`, and a DOM environment
   (`jsdom` — lighter footprint than `happy-dom` and the more common Vitest default).
2. Add a `test` script: `"test": "vitest run"` (plus optionally `"test:watch":
   "vitest"` for local iteration). Configure the `jsdom` environment either in
   `vite.config.js`'s `test` block or a separate `vitest.config.js` — either is fine,
   pick whichever keeps `vite.config.js` uncluttered.
3. **Target the untested logic first, not components wholesale:**
   - `src/utils/format.js` — `fmtCOP`, `fmtDate`, `todayISO`, and the month-name
     helpers. Pure functions, no mocking needed, highest value-per-line-of-test.
   - `src/hooks/useExpenses.js` (and the sibling logic it currently owns for
     savings/income per DEBT-03) — specifically the **month-scoped cache** behavior
     (does switching months re-fetch or serve from cache correctly?) and
     **optimistic update** behavior on create/update/delete (does the local state
     update immediately, and does it roll back correctly on an API error?). Mock
     `src/services/api.js` with `vi.mock` so hook tests never hit a real network
     call — the backend contract is already covered by pytest.
4. Wire the new `npm test` step into the same CI job/workflow built in Phase 1,
   after `npm run lint` and before or alongside `npm run build` — it should be
   just as blocking as the existing two checks.
5. No new subagent for this phase either: writing/maintaining these tests is folded
   into `frontend-agent`'s existing responsibilities (the same way `backend-agent`
   already owns "every new/changed endpoint ships with a pytest" — the frontend
   equivalent is "every new/changed hook ships with a Vitest test" once this phase
   lands). Update `frontend-agent`'s body with that rule when this phase is
   implemented; not part of this planning doc's scope to edit agent files now.

### Phase 3 — E2E (Playwright) + the one new subagent, `e2e-test-engineer`

Reuses the `e2e/` layout from `AGENTIC_WORKFLOW.md` §2.5, corrected for the current
auth reality:

```
expense-tracker/            # repo root
└── e2e/
    ├── playwright.config.js   # baseURL http://localhost:5173; assumes
    │                          # `docker-compose up` (or a dedicated e2e compose
    │                          # override) is already running
    ├── package.json           # @playwright/test only — independent of frontend deps
    ├── fixtures/              # API helpers that seed/reset Postgres state via the
    │                          # backend (http://localhost:8000) before each test,
    │                          # plus the auth helper (see design decision below)
    └── tests/
        ├── expenses.spec.js   # add / edit / delete an expense, month navigation
        ├── debts.spec.js      # create debt, register payment, verify remaining
        ├── budget.spec.js     # default budget + per-month override
        └── analytics.spec.js  # monthly summary renders real aggregated numbers
```

#### The one real design decision: how does e2e authenticate?

The app requires a logged-in Supabase user for every route; e2e tests need a session
without a human clicking through a real login form for every browser context.

**(Recommended) Env-gated test-auth bypass against a throwaway Postgres.**
Reuse the exact pattern already proven in `expense-tracker-api/tests/conftest.py`:
`app.dependency_overrides[get_current_user]`. Concretely:

- Add a backend-only code path, active **only** when an explicit env flag (e.g.
  `E2E_TEST_AUTH=1`) is set at process start, that installs a dependency override
  (or a `/e2e/login` helper endpoint) returning a fixed `AuthUser` — mirroring
  `USER_A`/`USER_B` in `conftest.py` — instead of verifying a real Supabase JWT.
  The frontend then just needs a way to attach whatever token/header the bypass
  expects (e.g. a fixed test bearer token), set once by the Playwright fixture layer
  before each test's browser context, no UI login flow required.
- **Security constraint — this must be impossible to enable in production.** Mirror
  the belt-and-suspenders pattern `conftest.py` already uses for the DB URL: at
  startup, assert-and-refuse-to-boot if `E2E_TEST_AUTH` is set while `DATABASE_URL`
  contains `supabase` (or, more simply, while the environment is not the dedicated
  e2e/test one). In addition, **never** define `E2E_TEST_AUTH` in
  `expense-tracker-api/.env`, `docker-compose.prod.yml`, or any cloud deploy config
  (`spec/DEPLOY-02-production-cloud.md` when written) — it should exist only in the
  e2e CI job's environment and a local `.env.e2e` that is gitignored, never in a
  file that could accidentally ship. Treat "flag reachable in prod" as a
  release-blocking regression, not a style nit.
- Run this against a **dedicated throwaway Postgres**, either the existing `db-test`
  service reused for e2e or a second one (`db-test-e2e`) if backend + e2e need to
  run concurrently without clobbering each other's schema resets. Never point e2e
  at a developer's real Supabase project or local `expense_tracker.db`.
- Why recommended: zero new external infrastructure, fastest CI, and it's the same
  mental model the backend suite already uses — one bypass pattern, two call sites.

**(Alternative) Dedicated free test Supabase project with a seeded test user.**
E2e performs a real login through the actual UI (fills the login form, Supabase
issues a real JWT, the app behaves exactly as in production). Higher fidelity — it's
the only option that would catch a bug in the login flow or JWT verification itself
— but requires provisioning and maintaining a second Supabase project, storing its
test-user credentials as CI secrets, and more moving parts overall. It must **never**
point at the production Supabase project or production data under any configuration.
Worth adding later only if the login/auth UI itself becomes a flow worth
regression-testing at the e2e layer; the bypass in the recommended option already
covers every other user-facing flow (expenses, debts, budget, analytics) without
paying that infrastructure cost.

**Recommendation: start with the env-gated bypass.** Revisit the dedicated-project
alternative only if a real bug ships in the login/JWT path that the bypass can't
reach.

#### Conventions for the tests themselves

- **Locators:** prefer `getByRole`, `getByLabel`, `getByText`. The app is styled
  with inline JS style objects (see the frontend `CLAUDE.md`), so **CSS-class
  selectors are forbidden** — they're both unstable and, for this app, often not
  even present. If a role or accessible label is missing on an element a test needs,
  that's a finding for `frontend-agent` to add a `data-testid`, not a workaround.
- **Per-test data isolation:** every spec creates its own records through the API
  fixtures before asserting, and tests must not depend on execution order or on
  state left by another test. Reset or scope data per test (fresh schema per run,
  or unique identifiers per test) the same way `conftest.py` does for pytest.
- **No fixed sleeps.** Use Playwright's built-in auto-waiting and `expect(...)`
  polling assertions exclusively — a `page.waitForTimeout(...)` in a spec is a
  finding, not a shortcut.
- **Currency assertions** must account for `fmtCOP` (es-CO locale formatting,
  thousands separators) rather than asserting a raw number.
- One spec file per domain (expenses, debts, budget, analytics — extend to
  savings/income/cards as coverage grows), covering the critical happy path per
  domain. Edge cases stay at the pytest layer — cheaper, faster, more stable.

#### CI integration

Add the e2e job to the same `.github/workflows/ci.yml` from Phase 1, **last**, and
make it depend on the backend + frontend jobs succeeding first (`needs:` in GitHub
Actions syntax) since it is the slowest and most failure-prone layer — no reason to
pay for a browser run when a unit test already caught the regression. The job needs:
the Postgres service container from Phase 1 (or a second one for `db-test-e2e`), the
backend started with `E2E_TEST_AUTH=1`, the frontend built/served (or run via Vite
dev server), then `npx playwright test` from `e2e/`.

#### The new subagent: `e2e-test-engineer`

This is the **only** new agent this spec proposes. Its shape follows the existing
agent file format (`name`/`description`/`model`/`memory` frontmatter, instructions
in the body — see `.claude/agents/qa-reviewer.md`), correcting the stale draft in
`AGENTIC_WORKFLOW.md` §2.5:

- **Frontmatter `description`** (unchanged in spirit from the §2.5 draft): use to
  write or maintain Playwright e2e tests in `e2e/` for user-facing flows; writes
  test code only, never application source; use after a feature is `APPROVED` by
  `qa-reviewer`, or to reproduce a UI bug as a failing spec.
- **Body corrections vs. the §2.5 draft** (this is the one substantive fix needed):
  - Replace "SQLite" with "throwaway PostgreSQL (`db-test` / `db-test-e2e`)" —
    the backend has not used SQLite for tests since the Postgres migration.
  - Replace "`X-API-Key`" auth references with the env-gated bypass (or, if the
    alternative design is ever adopted, real Supabase login) described above —
    there is no API key anymore; auth is multi-user Supabase JWT in production and
    a `dependency_overrides` bypass in test contexts.
  - Keep everything else from the draft largely intact: hard rule that it only
    touches `e2e/` and reports untestable flows as findings for `frontend-agent`
    rather than working around them; locator rules (`getByRole`/`getByLabel`/
    `getByText`, no CSS classes); no fixed sleeps; per-test data isolation; one
    spec file per domain; scope is the critical journey per domain, not exhaustive
    permutations.
- **When to create it:** only once Phase 3 is actually being implemented — do not
  create the agent file as part of this planning spec.

## Skills & subagents summary (direct answer: how many new agents/skills does this add?)

- **Exactly one new agent: `e2e-test-engineer`**, and only in Phase 3. This is the
  single agent this entire ladder needs.
- **Phase 1 (CI) needs no agent.** It is a static workflow file; there is no
  recurring judgment call that justifies a specialist.
- **Phase 2 (frontend unit tests) needs no agent.** The responsibility folds into
  `frontend-agent`'s existing scope (one added rule: new/changed hooks ship with a
  Vitest test), exactly the way `backend-agent` already owns "ship a pytest with
  every endpoint change." No `test-engineer` agent is warranted per
  `AGENTIC_WORKFLOW.md` §2.4's own guidance — that role is "only worth adding if you
  find the implementers write weak tests," and there's no evidence of that yet.
- **Optional, low-priority:** a thin `/e2e` skill that just runs `npx playwright
  test` from `e2e/` (mirroring the shape of `.claude/skills/ship/SKILL.md`), or —
  even simpler — extend the existing `/ship` skill's verification step to also run
  the e2e suite once Phase 3 exists and is stable. Either is optional polish, not a
  prerequisite; don't build it before the suite itself exists and passes reliably.
- **Optional hooks (`AGENTIC_WORKFLOW.md` §5.2):** a `PostToolUse` lint/test hook is
  worth adding only **after** the Vitest suite (Phase 2) is green and stable — a
  hook that runs zero or flaky tests is noise, per the existing guidance. Do not
  wire hooks before Phase 2 lands.
- This plan deliberately follows `AGENTIC_WORKFLOW.md` §7's stated anti-pattern
  warning — "one agent per tiny concern... cold-start cost outweighs specialization
  below a certain size" — by adding exactly one agent for the one layer (browser
  automation) that genuinely needs a dedicated specialist, and zero agents for the
  two layers that don't.

## Verification (per phase, when implemented)

- **Phase 1:** open a PR with a trivial change; confirm the `ci.yml` workflow runs
  automatically and both the backend (`pytest`) and frontend (`lint` + `build`)
  checks appear and pass in the PR's Checks tab. Deliberately break a test or lint
  rule in a throwaway branch to confirm the workflow correctly reports red.
- **Phase 2:** `npm test` (i.e. `vitest run`) passes locally from `expense-tracker/`;
  the CI job from Phase 1 now includes this step and is green on the same PR check.
- **Phase 3:** `npx playwright test` passes locally from `e2e/` against a running
  `docker-compose up` stack with the test-auth bypass flag set, and passes as the
  final (and only e2e) job in CI, gated behind the backend/frontend jobs succeeding
  first.

## References

- `AGENTIC_WORKFLOW.md` §1 (current state table — test suite/CI/hooks marked ❌),
  §2.4 (`qa-reviewer`, optional `test-engineer`), §2.5 (the stale `e2e-test-engineer`
  draft and `e2e/` layout this spec corrects), §3 (prerequisites — pytest foundation
  already satisfied), §5 (skills and hooks mechanics), §7 (anti-patterns this plan
  follows).
- `expense-tracker-api/tests/conftest.py` — the `dependency_overrides` auth-bypass
  pattern the e2e design reuses, and the Postgres-only / anti-Supabase guard rails.
- `docker-compose.yml` — the `db-test` service (`postgres:17-alpine`, host port
  `5440`) that the CI service container mirrors.
- `expense-tracker/package.json` — current scripts (`dev`/`build`/`lint`/`preview`;
  no test runner yet).
- `.claude/agents/qa-reviewer.md` and `.claude/skills/ship/SKILL.md` — the
  frontmatter/body and skill-file formats followed for the proposed
  `e2e-test-engineer` agent and any optional `/e2e` skill.
- `spec/DEPLOY-01-production-lan-docker.md` — document shape mirrored by this spec.
- `spec/DEPLOY-02-production-cloud.md` — the cloud-deploy plan; this CI workflow is
  intended to become its deploy gate, and its keep-alive workflow sits alongside
  `ci.yml` under `.github/workflows/`.
