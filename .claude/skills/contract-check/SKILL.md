---
description: Verify the API contract is in sync between backend schemas and the frontend api.js mappers. Use after any change to schemas.py, models.py, or src/services/api.js, or when asked whether backend and frontend agree.
allowed-tools: Read, Grep, Glob
---
Check for drift between the backend API contract and the frontend mappers — the #1
documented cross-cutting failure mode in this project. This skill is **read-only**:
report findings, never fix them (fixes go through `/fix` or the responsible
implementer agent).

## Procedure

1. **Extract the backend contract.** Read `expense-tracker-api/schemas.py` and list,
   per entity, the field names of every `*Out` (response) and `*Create`/`*Update`
   (request) model. Note nested models (e.g. DebtOut embeds DebtPaymentOut) and
   server-computed fields.
2. **Extract the frontend contract.** Read `expense-tracker/src/services/api.js` and
   list, per mapper, which snake_case keys each `toX` (response → camelCase) consumes
   and each `fromX` (camelCase → request) produces. Current mapper pairs cover:
   Expense, Saving, Template, IncomeEntry, Card, Category, TrendPoint, Budget,
   DebtPayment, Debt. Some analytics responses (MonthlySummary, AnnualSummary,
   CategoryBreakdown, MonthRow) may be consumed inline without a named mapper —
   trace where those responses are used before declaring them unmapped.
3. **Cross-reference both directions**, per entity:
   - schema field with no mapper counterpart → frontend silently drops it
   - mapper key absent from the schema → stale mapper, sends/reads dead fields
   - wrong case conversion (e.g. `monthKey` ↔ something other than `month_key`)
   - request mappers (`fromX`) vs `*Create`/`*Update` models: required fields missing,
     or extra fields the backend will reject/ignore
4. **Sanity-check models.py**: columns recently added to `models.py` that never made
   it into the corresponding Pydantic schema are also drift (backend-internal, but the
   usual precursor to mapper drift).

## Output format

- Verdict line first: `IN SYNC` or `DRIFT FOUND (N findings)`.
- Then one section per affected entity with numbered findings: file:line on both
  sides, what is missing/stale, and what correct looks like. No vague advice.
- Fields that are intentionally one-directional (server-computed ids/timestamps that
  `fromX` correctly omits) are not findings — don't pad the report with them.
