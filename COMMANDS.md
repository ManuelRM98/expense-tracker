# Commands Quick Reference

`/feature` and `/fix` are project skills defined in `.claude/skills/` — you invoke
them like any slash command.

## `/feature` — Build something new

Use when you want to **add a feature that doesn't exist yet**.

Pipeline: spec → backend-agent → frontend-agent → qa-reviewer → your approval

**Examples:**

```
/feature Add an export-to-CSV button for the expenses table
```
```
/feature Show a warning banner when monthly spending exceeds the budget
```
```
/feature Add a "notes" field to expense entries
```
```
/feature Allow filtering expenses by card on the dashboard
```

---

## `/fix` — Fix something broken

Use when something **already exists but behaves incorrectly**.

Pipeline: triage → failing test → implementer agent → qa-reviewer → your approval

**Examples:**

```
/fix Deleting an expense doesn't refresh the dashboard totals until page reload
```
```
/fix The annual analytics chart shows zero for months with multiple income entries
```
```
/fix Fixed expenses are not generated when navigating to a new month for the first time
```
```
/fix The debt payment form submits even when the amount field is empty
```

---

## `/contract-check` — Is backend ↔ frontend in sync?

Read-only check that every Pydantic schema field is mirrored in the `api.js`
camelCase ↔ snake_case mappers (and vice versa) — the project's #1 failure mode.
Run it after any backend change, or before handing a diff to qa-reviewer.

```
/contract-check
```

---

## `/audit` — Periodic technical health check

Launches `software-architect-auditor` to re-audit the project against the resolved
`DONE-*` baseline: new findings get new IDs, regressions are flagged, and the
"Immediate" items can be routed into `/fix`. Run at milestones, not per-change.

```
/audit
```
```
/audit the new mobile-responsive layout code
```

---

## `/ship` — Verify and commit (with approval)

Runs pytest + lint + build (any failure stops it), summarizes the diff, proposes a
commit message in this repo's style, and commits **only after your explicit
approval**. Never pushes unless you ask.

```
/ship
```

---

## When in doubt

| Situation | Command |
|---|---|
| "I want the app to do X (it can't today)" | `/feature` |
| "The app does X but it should do Y" | `/fix` |
| "There's a crash / error / wrong value" | `/fix` |
| "There's a missing screen / button / section" | `/feature` |
| "Did the backend change break the frontend contract?" | `/contract-check` |
| "How healthy is the codebase right now?" | `/audit` |
| "This is done, let's commit it" | `/ship` |
