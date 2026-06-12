---
description: Run a periodic architecture re-audit via the software-architect-auditor agent and compare against the DONE-* baseline (AGENTIC_WORKFLOW.md §4.3). Use at milestones or when asked for a technical health check of the project.
argument-hint: [optional focus area]
---
Run the periodic re-audit loop from AGENTIC_WORKFLOW.md §4.3.

1. **LAUNCH** — Delegate to the `software-architect-auditor` agent (read-only; writes
   specs to `spec/`). Pass it these baseline rules:
   - `spec/DONE-01` … `DONE-10` are the **resolved baseline**. Do not re-report a
     DONE finding unless it has *regressed* — and if it has, say so explicitly,
     citing the original ID.
   - Continue existing conventions: stable IDs (BUG-, SEC-, PERF-, QUAL-, DEBT-,
     DOCKER-, DEP-, STATE-) and spec numbering continuing after the highest existing
     spec file (FEAT specs included).
   - If a focus area is given below, audit that area in depth instead of the whole
     project.
2. **SUMMARIZE** — When the audit lands, report to the user:
   - new findings grouped by severity, with IDs and one-line descriptions
   - any regressions against the DONE baseline (these are the headline)
   - the new "Immediate" priority list, if any
3. **HAND OFF** — Offer (do not auto-run) to push each Immediate item through `/fix`.
   The user decides which, and in what order.

Do not modify any source files in this skill — the auditor writes specs only, and
fixes belong to the `/fix` pipeline.

Focus area: $ARGUMENTS
