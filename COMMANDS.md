# Commands Quick Reference

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

## When in doubt

| Situation | Command |
|---|---|
| "I want the app to do X (it can't today)" | `/feature` |
| "The app does X but it should do Y" | `/fix` |
| "There's a crash / error / wrong value" | `/fix` |
| "There's a missing screen / button / section" | `/feature` |
