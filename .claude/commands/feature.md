---
description: Implement a feature through the agentic pipeline (spec → backend → frontend → qa-review)
---
Implement the following feature using the project's agentic workflow
(see AGENTIC_WORKFLOW.md §4.1):

1. **SPEC** — For anything non-trivial, get a short design note into `spec/` first
   (endpoints + schemas + UI touchpoints + acceptance criteria). The API contract in
   that note is the coordination artifact between the implementer agents — they never
   talk to each other directly.
2. **BACKEND** — Delegate to `backend-agent`: models/schemas/router + pytest. Backend
   goes first because the frontend consumes the contract.
3. **FRONTEND** — Delegate to `frontend-agent`: hook + api.js mappers + components
   against the now-real endpoints.
4. **VERIFY** — Delegate the combined diff to `qa-reviewer` (it runs pytest, lint,
   build, and the convention checklist).
5. **LOOP** — On REJECTED, relay the numbered findings to the responsible implementer
   via SendMessage (same agent, keeps its context). Re-review. Cap at 3 cycles; if
   still failing, stop and escalate to the user with the open findings.
6. **SHIP** — On APPROVED, present the summary to the user for approval.
   **Do not commit without explicit approval.**

Feature: $ARGUMENTS
