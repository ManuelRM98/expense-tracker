---
name: fix
description: Fix a bug through the agentic pipeline (triage → failing test → fix → qa-review). Use whenever the user reports something broken, behaving incorrectly, erroring, or not working as expected — even if they don't say "bug" or "fix" explicitly.
argument-hint: <bug description>
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Agent, SendMessage
---
Fix the following bug using the workflow in AGENTIC_WORKFLOW.md §4.2:

1. **TRIAGE** — Reproduce it: which layer, which file. If it matches a known `spec/`
   finding ID (check the findings-summary doc in `spec/` if one currently exists),
   cite the ID.
2. **TEST FIRST** — Write a failing test that captures the bug (backend: pytest in
   `expense-tracker-api/tests/`; frontend logic without a test runner: written repro
   steps).
3. **FIX** — Delegate to the matching implementer agent (`backend-agent` or
   `frontend-agent`).
4. **VERIFY** — Delegate to `qa-reviewer`: the failing test now passes, the full suite
   is still green, and the fix doesn't violate conventions or reintroduce known
   findings. Cap the fix loop at 3 cycles, then escalate to the user.
5. **CLOSE** — If it was a `spec/` finding, mark it resolved with a one-line status
   edit in the relevant spec document. Present the result for approval before any
   commit.

Bug: $ARGUMENTS
