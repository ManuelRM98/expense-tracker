# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

A personal expense tracker (Colombian Pesos) split into two services in a monorepo:

```
expense-tracker/              ← repo root (this file)
├── docker-compose.yml        ← runs both services with hot-reload volume mounts
├── expense-tracker/          ← FRONTEND: React 19 + Vite (has its own CLAUDE.md)
├── expense-tracker-api/      ← BACKEND: FastAPI + SQLAlchemy + SQLite
├── spec/                     ← numbered audit documents (known bugs/debt, by ID)
└── AGENTIC_WORKFLOW.md       ← the agent-based development workflow for this repo
```

## Running the app

```bash
docker-compose up             # frontend → http://localhost:5173, backend → http://localhost:8000
```

Hot-reload works through volume mounts — no rebuild needed for code changes.
Backend Swagger docs: http://localhost:8000/docs

Without Docker:

```bash
# backend (from expense-tracker-api/, venv at venv/)
uvicorn main:app --reload --port 8000
# frontend (from expense-tracker/)
npm run dev
```

## Verification commands

Run these after any change; fix failures before reporting done.

```bash
# backend — runs against the throwaway `db-test` PostgreSQL (same dialect as prod),
# so start it first or run inside the backend container:
docker-compose up -d db-test
docker-compose exec -T backend python -m pytest   # or, from a host venv: python -m pytest
                                                  # (host runs need db-test on localhost:5440)

# frontend (from expense-tracker/)
npm run lint
npm run build
```

## Architecture in one paragraph

The frontend never talks to the database — all persistence goes through the FastAPI
backend. The single integration point is `expense-tracker/src/services/api.js`, which
holds the HTTP client plus camelCase ↔ snake_case mappers for every entity. Any change
to a Pydantic schema, router response, or `models.py` column must be mirrored in those
mappers, and vice versa — schema/mapper drift is the #1 cross-cutting failure mode here.
Production runs on **Supabase PostgreSQL** (local dev may still use SQLite via
`DATABASE_URL` in `expense-tracker-api/.env`, the only switch), so never use
SQLite-specific SQL — most commonly `.like()`/string ops on a `Date` column, which 500s
on Postgres. The test suite runs on PostgreSQL (`db-test`) to catch exactly this.

## Known issues

`spec/` contains a verified audit with stable IDs (BUG-, SEC-, PERF-, QUAL-, DEBT-,
DOCKER-, DEP-, STATE-). Start with `spec/DONE-10-findings-summary.md` for the priority
matrix and fix order. When fixing or reviewing, cite IDs and avoid reintroducing
documented findings.

## Agent workflow

Feature and bug work follows `AGENTIC_WORKFLOW.md`: spec → `backend-agent` →
`frontend-agent` → `qa-reviewer` (independent, read-only verifier) → fix loop →
human approval. The `/feature` and `/fix` skills (`.claude/skills/`) encode these
pipelines; `/contract-check`, `/audit`, and `/ship` encode the supporting rituals
(see `COMMANDS.md`).
Backend is implemented before frontend because the frontend consumes the contract.
Do not commit without explicit user approval.
