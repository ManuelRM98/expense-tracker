# Agentic Development Workflow — Proposal

*Generated 2026-06-10. Analysis of the current project state and a concrete recommendation
for an agent-based workflow where features are implemented by specialist agents and
verified by an independent reviewer agent. Reference document only — nothing has been
implemented yet.*

---

## 1. Current State

### What already exists

| Piece | Status | Notes |
|---|---|---|
| `software-architect-auditor` agent | ✅ Working | Read-only auditor; writes numbered specs to `spec/`; has project memory |
| `backend-agent` | ⚠️ Defined, needs fixing | FastAPI/SQLAlchemy specialist |
| `frontend-agent` | ⚠️ Defined, needs fixing | React/Vite specialist |
| Audit baseline | ✅ Done | `spec/01–10` catalogue ~60 issues with IDs (BUG-, SEC-, PERF-, …) |
| Test suite | ❌ Missing | QUAL-08 — no pytest, no frontend tests |
| CI | ❌ Missing | No GitHub Actions or equivalent |
| Hooks | ❌ Missing | No automated lint/test on edit |
| Frontend `CLAUDE.md` | ❌ Misleading | DEBT-09 — describes the old localStorage app, not the FastAPI architecture |
| Root `CLAUDE.md` | ❌ Missing | No top-level guidance covering the monorepo layout, Docker, or commands |

### Problems found in the existing agent definitions

1. **Instructions are in the wrong field.** In `backend-agent.md` and `frontend-agent.md`,
   all the project context, responsibilities, and workflow rules live in the
   `description:` frontmatter. The `description` is only used by the orchestrator to
   decide *when* to delegate; the **body** of the file becomes the agent's actual system
   prompt. Right now both agents' real system prompt is a single sentence — they receive
   almost none of the carefully written rules. Move everything below the frontmatter and
   replace `description` with a short "use this agent when…" sentence.
2. **They reference docs that mislead.** Both bodies say "read any architecture notes the
   Architect Agent produced" — good — but any agent that also reads
   `expense-tracker/CLAUDE.md` will be told the app is localStorage-only with no backend.
   Fix DEBT-09 before relying on agents.
3. **No verification role exists.** Nothing checks the implementers' output today.

---

## 2. Recommended Agent Roster

Keep it small. Four roles cover the full loop; more agents means more cold-start context
re-derivation and more coordination overhead for little gain.

```
                ┌─────────────────────────────┐
                │   You + main Claude session │  ← Orchestrator (no new agent needed)
                └──────┬───────────┬──────────┘
        plan/audit     │           │ implement              verify
   ┌───────────────────┤           ├──────────────┐   ┌──────────────┐
   ▼                   ▼           ▼              ▼   ▼              │
┌────────────┐  ┌────────────┐ ┌────────────┐ ┌─────────────┐       │
│ architect- │  │ backend-   │ │ frontend-  │ │ qa-reviewer │───────┘
│ auditor    │  │ agent      │ │ agent      │ │   (NEW)     │  findings loop back
│ (existing) │  │ (existing) │ │ (existing) │ │ read-only + │  to the implementer
└────────────┘  └────────────┘ └────────────┘ │ runs tests  │
                                              └─────────────┘
```

### 2.1 Orchestrator — *not a new agent*

The main Claude Code session you're already talking to. It owns the task list, decides
which specialist to delegate to, relays the reviewer's findings back to the implementer,
and is the only one that commits. Don't create a separate "manager" agent — a subagent
orchestrating other subagents loses your conversation context and you lose visibility.

### 2.2 `software-architect-auditor` — *existing, keep as-is*

- **When:** before a large feature (produce a short design spec in `spec/`), and
  periodically (e.g., after each milestone) to re-audit and catch new debt.
- Already has project memory and a numbered-spec convention. No changes needed.

### 2.3 `backend-agent` / `frontend-agent` — *existing, fix the frontmatter*

- Move the long instructions from `description:` into the body (see §1).
- Add one rule to each: **"After implementing, run the project's verification commands
  (§4) and fix failures before reporting done."** Implementers should self-check the
  cheap stuff (lint, build, tests) so the reviewer focuses on logic.
- Add to `backend-agent`: every new/changed endpoint must come with a pytest covering the
  happy path and the main error case (once the test suite from §3 exists).

### 2.4 `qa-reviewer` — *NEW: the verification agent you asked about*

The independent agent that reviews code after any implementation and hunts for bugs.

Suggested definition (`.claude/agents/qa-reviewer.md`):

```markdown
---
name: qa-reviewer
description: Use after any code change by backend-agent, frontend-agent, or the main
  session to independently verify correctness. Read-only on source; may run tests,
  lint, and builds. Reports findings — never fixes them itself.
model: sonnet
memory: project
---
You are an independent QA reviewer for the Expense Tracker (React 19 + Vite frontend
in expense-tracker/, FastAPI + SQLAlchemy + SQLite backend in expense-tracker-api/,
orchestrated by docker-compose).

## Hard rules
- You NEVER modify source files. You only read, run checks, and report.
- You review the DIFF you are given (git diff / changed files), not the whole repo,
  unless asked for a full review.
- Verdict must be explicit: APPROVED, or REJECTED with a numbered findings list.

## Review checklist
1. Run the verification commands: backend pytest, frontend eslint + vite build.
   A failing check is an automatic REJECTED.
2. API contract: any change to a Pydantic schema, router response, or models.py must
   be mirrored in expense-tracker/src/services/api.js mappers (camelCase ↔ snake_case)
   and vice versa. This is the #1 cross-agent failure mode in this project.
3. Frontend conventions: all HTTP via api.js; currency via fmtCOP; dates via fmtDate;
   loading/error/empty states handled; no new chart library besides Recharts.
4. Backend conventions: schemas.py and models.py never drift; no SQLite-specific SQL
   (PostgreSQL compatibility is required); no business logic in models.py; new deps
   added to requirements.txt.
5. Regression vs known issues: check the change doesn't reintroduce anything from
   spec/DONE-10-findings-summary.md (cite IDs like BUG-03, PERF-01 when relevant).
6. Error handling: every new mutation surfaced to the user has try/catch + toast
   (QUAL-01 class of bugs); every async handler actually awaits.

## Output format
- Verdict line first.
- Findings: numbered, each with file:line, severity (critical/major/minor), what is
  wrong, and what correct looks like. No vague advice — every finding actionable.
```

**Why a separate agent instead of the implementer self-reviewing:** an agent reviewing
its own work shares its own blind spots and its context is polluted by the implementation
narrative ("I already handled that"). A cold reviewer reading only the diff and the rules
catches what the author rationalized away.

**Optional 5th agent — `test-engineer`:** only worth adding if you find the implementers
write weak tests. Its job: given a feature spec or bug report, write the failing test
first. Start without it; fold the responsibility into the implementers.

### 2.5 `e2e-test-engineer` — *optional 6th agent: Playwright browser automation*

**Should e2e automation live in this project or a separate one?** In this project.
E2E specs must change in the same commit as the UI they exercise — when `frontend-agent`
renames a button, the spec that clicks it breaks; one repo means one diff, one review.
And `qa-reviewer` can only gate changes on tests it can run locally against the
docker-compose stack. A separate automation project only makes sense when one framework
tests several apps or a dedicated QA team owns it — not for a personal two-service app.

**When to add it:** AFTER the pytest foundation (§3.2) is green and stable. E2E tests are
the slowest, flakiest layer of the pyramid; building them on top of an untested backend
means every flake investigation starts from zero.

**Layout:**

```
expense-tracker/            # repo root
└── e2e/
    ├── playwright.config.js   # baseURL http://localhost:5173; webServer or
    │                          # assumes `docker-compose up` is running
    ├── package.json           # @playwright/test only — independent of frontend deps
    ├── fixtures/              # API helpers to seed/reset SQLite state via the
    │                          # backend (http://localhost:8000) before each test
    └── tests/
        ├── expenses.spec.js   # add / edit / delete an expense, month navigation
        ├── debts.spec.js      # create debt, register payment, verify remaining
        ├── budget.spec.js     # default budget + per-month override
        └── analytics.spec.js  # monthly summary renders real aggregated numbers
```

**Test data rule:** never assert against the developer's live `expense_tracker.db`.
Fixtures must create their own records through the API and clean up after — or point
`DATABASE_URL` at a throwaway db for the e2e run.

Suggested definition (`.claude/agents/e2e-test-engineer.md`):

```markdown
---
name: e2e-test-engineer
description: Use to write or maintain Playwright end-to-end tests in e2e/ for
  user-facing flows of the Expense Tracker. Writes test code only — never touches
  application source. Use after a feature is APPROVED by qa-reviewer, or to
  reproduce a UI bug as a failing spec.
model: sonnet
memory: project
---
You are a senior QA automation engineer. You own the e2e/ folder of the Expense
Tracker (React 19 frontend at http://localhost:5173, FastAPI backend at
http://localhost:8000, started with `docker-compose up`).

## Hard rules
- You only create/modify files under e2e/. Application source is read-only for you
  — if a flow is untestable (no accessible name, no stable locator), report it as
  a finding for frontend-agent instead of working around it.
- Prefer user-facing locators: getByRole, getByLabel, getByText. The app uses
  inline styles, so CSS-class selectors are forbidden (they are unstable).
  If a role/label is missing, request a data-testid from frontend-agent.
- Every spec seeds its own data via the API fixtures and is independent —
  no ordering dependencies between tests.
- No fixed sleeps. Use Playwright auto-waiting and expect() polling assertions.
- Currency assertions must account for fmtCOP formatting (es-CO separators).

## Scope
- One spec file per domain (expenses, debts, budget, savings, income, analytics).
- Cover the critical user journey per domain, not exhaustive permutations —
  edge cases belong in pytest at the API layer (cheaper, faster, more stable).

## Workflow
1. Read the feature spec / bug report and the relevant components for locators.
2. Write the spec; run it headed locally (`npx playwright test --headed`) until
   stable; then run the full e2e suite to ensure no cross-test breakage.
3. Report: which flows are covered, which were untestable and why.
```

**How it slots into the workflows:** in §4.1 it runs as step 4b — after qa-reviewer
APPROVES, `e2e-test-engineer` adds/updates specs for the new flow and the suite runs as
the final gate. For UI bugs in §4.2, it writes the failing Playwright spec in the
"TEST FIRST" step. `qa-reviewer` gains one checklist item: "run `npx playwright test`
in e2e/ when the diff touches frontend components."

---

## 3. Prerequisites — do these BEFORE wiring the workflow

A reviewer agent without executable checks can only offer opinions. In priority order:

1. **Fix `expense-tracker/CLAUDE.md` (DEBT-09).** Every agent session reads it and is
   currently told there is no backend. This single file silently corrupts every agent's
   mental model. Also add a **root** `CLAUDE.md` describing the two-service layout,
   Docker commands, and pointing to `spec/` for known issues.
2. **Create the backend test suite (QUAL-08).** `pytest` + `httpx` TestClient with an
   in-memory SQLite fixture. Start with one happy-path test per router (10 routers →
   ~15 tests). This is the verification backbone — without it, "verify the code" means
   "read it and guess."
3. **Decide the frontend check.** Minimum viable: `npm run lint` + `npm run build`
   (already exist). Later: Vitest + React Testing Library for hooks (`useExpenses` etc.).
4. **Fix the two agent files** (frontmatter issue, §1).
5. **Fix BUG-01 first** (`models.Income` crash) — otherwise the very first test run on
   analytics fails for pre-existing reasons and pollutes every review with noise. The
   "Immediate" list in `spec/DONE-10-findings-summary.md` is a good warm-up task *for* the
   new workflow: run each fix through implement → review to validate the loop.

---

## 4. The Workflows

### 4.1 New feature

```
1. SPEC      You describe the feature. For anything non-trivial, orchestrator asks
             architect-auditor (or built-in Plan agent) for a short design note in
             spec/: endpoints + schemas + UI touchpoints + acceptance criteria.
             The API contract written here is the coordination artifact between
             backend-agent and frontend-agent — they never talk to each other directly.
2. BACKEND   backend-agent implements models/schemas/router (+ tests). Backend goes
             FIRST because the frontend consumes the contract; parallel work on both
             sides of an undefined contract is the main source of integration bugs.
3. FRONTEND  frontend-agent implements hook + api.js mappers + components against the
             now-real endpoints.
4. VERIFY    qa-reviewer reviews the combined diff + runs all checks.
5. LOOP      REJECTED → orchestrator relays the numbered findings to the responsible
             implementer (use SendMessage to continue the same agent — it keeps its
             context). Re-review. Cap at 2–3 cycles; if still failing, escalate to you
             rather than burning iterations.
6. SHIP      APPROVED → orchestrator shows you the summary, you eyeball it, commit.
```

### 4.2 Bug / issue

```
1. TRIAGE     Orchestrator (or qa-reviewer) reproduces: which layer, which file,
              cross-reference spec/ IDs if it's a known finding.
2. TEST FIRST A failing test that captures the bug (backend bugs: pytest; frontend
              logic: Vitest when available; otherwise written repro steps).
3. FIX        The matching implementer agent fixes it.
4. VERIFY     qa-reviewer: failing test now passes, full suite still green, fix doesn't
              violate conventions or reintroduce known findings.
5. CLOSE      Mark the spec/ finding resolved (a one-line status edit beats re-auditing).
```

### 4.3 Periodic audit

Every milestone (or monthly): run `software-architect-auditor` to produce the next
numbered specs, then feed the "Immediate" items through workflow 4.2.

---

## 5. Automation Layer (Claude Code mechanics)

### 5.1 Custom skills — encode the workflows

Define `.claude/skills/feature/SKILL.md` and `.claude/skills/fix/SKILL.md` so the
pipeline is one command instead of re-explaining it each session. Skills are the
unified successor to `.claude/commands/` slash commands: invocation is identical
(`/feature …`, `/fix …`, `$ARGUMENTS` substitution), but each skill gets its own
folder for supporting files and richer frontmatter (`argument-hint`, `allowed-tools`).

```markdown
# .claude/skills/feature/SKILL.md
Implement the following feature using the project's agentic workflow
(see AGENTIC_WORKFLOW.md §4.1): spec → backend-agent → frontend-agent →
qa-reviewer → fix loop → present for approval. Do not commit without approval.

Feature: $ARGUMENTS
```

```markdown
# .claude/skills/fix/SKILL.md
Fix the following bug using the workflow in AGENTIC_WORKFLOW.md §4.2:
triage → failing test → implementer agent → qa-reviewer verification.
If it matches a spec/ finding ID, cite and close it.

Bug: $ARGUMENTS
```

Three supporting skills (added 2026-06-12) encode the rituals around the pipelines —
see `COMMANDS.md` for usage:

- **`/contract-check`** — read-only schemas.py/models.py ↔ api.js mapper drift check
  (the §2.4 checklist item 2 failure mode, runnable on demand before review).
- **`/audit`** — the §4.3 periodic re-audit, with the DONE-* baseline-comparison
  rules baked in.
- **`/ship`** — the gated commit ritual: verification commands → diff summary →
  explicit approval → commit. Never pushes.

### 5.2 Hooks — make cheap checks unskippable

In `.claude/settings.json`, a `PostToolUse` hook on Edit/Write can auto-lint frontend
files (eslint on the touched `.jsx`/`.js`) and run `pytest` quickly. Hooks are
guaranteed by the harness — they don't depend on an agent remembering a rule. Recommended
once the test suite exists; skip until then (a hook that runs zero tests is noise).

### 5.3 Built-in skills — don't rebuild what exists

Claude Code already ships `/code-review` (diff review at selectable effort), `/verify`
(run the app and observe behavior), and `/security-review`. Pragmatic split:

- **`qa-reviewer` agent** → project-specific rules: api.js mapper sync, fmtCOP, schema
  drift, spec/ regression checks. (Generic tools don't know your conventions.)
- **`/code-review`** → an extra generic-correctness pass before commits you care about.
- **`/security-review`** → before anything internet-facing (relevant given SEC-02
  wildcard CORS + no auth).

### 5.4 Worktree isolation — optional, later

Implementer agents can run with `isolation: worktree` so changes land in an isolated
copy and merge only after qa-reviewer approval. Adds friction; adopt only if you start
running multiple features in parallel.

---

## 6. Implementation Order (checklist)

- [x] 1. Rewrite `expense-tracker/CLAUDE.md` (DEBT-09) + add root `CLAUDE.md` *(done 2026-06-10)*
- [x] 2. Fix `backend-agent.md` / `frontend-agent.md` frontmatter (instructions → body) *(done 2026-06-10)*
- [x] 3. Fix BUG-01 (analytics crash) so the baseline is green *(done 2026-06-10 — also fixed the annual income_map overwrite for multi-entry months)*
- [x] 4. Add pytest suite: fixtures + 1 happy-path test per router *(done 2026-06-10 — 13 tests in `expense-tracker-api/tests/`, deps in `requirements-dev.txt`)*
- [x] 5. Create `.claude/agents/qa-reviewer.md` (§2.4) *(done 2026-06-10)*
- [x] 6. Create `/feature` and `/fix` slash commands (§5.1) *(done 2026-06-10;
      migrated to skills at `.claude/skills/<name>/SKILL.md` on 2026-06-12)*

> ✅ Baseline note (updated 2026-06-12): backend pytest, `npm run build`, and
> `npm run lint` are all green. The 8 lint errors flagged in the 2026-06-10 baseline
> have been fixed — qa-reviewer treats **any** lint error as blocking again.
- [ ] 7. Dry-run the loop: push the 5 "Immediate" fixes from `spec/10` through `/fix`
- [ ] 8. Add lint/test hooks (§5.2) once the suite is stable
- [ ] 9. Re-run architect-auditor; compare against the `spec/10` baseline
- [ ] 10. *(Optional, after 1–9 are stable)* Add `e2e/` Playwright setup +
      `.claude/agents/e2e-test-engineer.md` (§2.5), starting with the expenses flow

## 7. Anti-patterns to avoid

- **A "manager" subagent.** The main session is the orchestrator; an agent-managing-agents
  layer loses your visibility and doubles context cost.
- **One agent per tiny concern** (css-agent, sql-agent…). Cold-start cost outweighs
  specialization below a certain size. Four roles is right for a two-service app.
- **Reviewer that also fixes.** The moment the reviewer edits code, you've lost the
  independent check — its fixes are now unreviewed code.
- **Verification without tests.** "Looks correct" from a second model is weaker than one
  failing assertion. Tests first (§3.2), agents second.
- **Letting the fix loop run unbounded.** Cap at 2–3 review cycles, then escalate to you.
