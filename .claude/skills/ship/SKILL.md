---
description: Verify and commit the current changes with explicit user approval. Use when the user asks to commit, ship, save, or finalize the pending work.
---
Run the project's gated commit ritual. The order is fixed; never skip ahead.

1. **VERIFY** — Run all three verification commands:
   - `python -m pytest` (from `expense-tracker-api/`)
   - `npm run lint` (from `expense-tracker/`)
   - `npm run build` (from `expense-tracker/`)
   **Any failure stops the skill here.** Report the failing output; do not proceed
   to the diff, the message, or any commit discussion until checks are green.
2. **REVIEW** — Show `git status` and summarize the diff grouped by area (backend /
   frontend / docs / config). List untracked files separately and ask which to
   include — never blanket `git add -A` (the repo can contain local artifacts like
   `expense_tracker.db` or editor leftovers that must not be committed).
3. **PROPOSE** — Draft the commit message in this repo's existing style: a plain
   descriptive sentence (e.g. "Solved an issue where the annual summary add expense
   button was not working"). No conventional-commit prefixes (`feat:`, `fix:`).
4. **APPROVE** — Present the file list and the exact message, and ask for explicit
   approval. **Do not commit without it.** If the user edits the message or file
   list, apply their version.
5. **COMMIT** — Stage only the agreed files and commit. Never push unless the user
   separately asks for it.
