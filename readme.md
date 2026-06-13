# Expense Tracker

A full-stack personal finance web application (amounts in Colombian Pesos). Track expenses, savings, debts, fixed costs, and income — with budget allocation and monthly/annual analytics charts.

## Features

- **Expenses** — record, edit, and delete expenses by month, category, card, and person; bulk import supported
- **Savings** — log savings entries by category and month
- **Income** — track monthly income entries
- **Fixed expenses** — manage recurring cost templates that auto-generate entries for any month
- **Debts** — monitor who owes whom, with per-debt payment history
- **Budget** — set a default monthly budget or override it per month
- **Categories & cards** — fully configurable expense/savings categories and card types with cut-off dates
- **Analytics** — monthly summaries, annual overviews, and multi-month trend charts (Recharts)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Backend / API | FastAPI + Uvicorn |
| ORM / Migrations | SQLAlchemy 2 + Alembic |
| Database | PostgreSQL (Supabase) or SQLite — set by `DATABASE_URL` |
| Auth | Optional `X-API-Key` header |
| Charts | Recharts |
| Containerization | Docker + Docker Compose |

The frontend never talks to the database directly — all persistence goes through the FastAPI backend. The single integration point is [api.js](expense-tracker/src/services/api.js).

## Project Structure

```
expense-tracker/                 # repo root (this file)
├── docker-compose.yml           # DEV orchestration: hot-reload via bind mounts
├── docker-compose.prod.yml      # PROD orchestration: nginx + built images, no reload
├── expense-tracker/             # React frontend
│   ├── Dockerfile
│   ├── .env.example             # copy to .env  (VITE_API_URL, VITE_API_KEY)
│   ├── src/
│   │   ├── components/          # UI components
│   │   ├── hooks/               # useExpenses, useFixedExpenses, useBudget, useDebts
│   │   ├── services/api.js      # HTTP client + camelCase ↔ snake_case mappers
│   │   └── utils/               # format.js (fmtCOP, fmtDate, uid…)
│   └── vite.config.js
└── expense-tracker-api/         # FastAPI backend
    ├── Dockerfile
    ├── .env.example             # copy to .env  (DATABASE_URL, API_KEY)
    ├── main.py                  # app, middleware, router wiring, startup migrations
    ├── models.py / schemas.py   # SQLAlchemy models / Pydantic schemas
    ├── database.py              # engine + session, reads DATABASE_URL
    ├── routers/                 # one module per resource (see API Routes)
    ├── alembic/                 # schema migrations (run automatically at startup)
    ├── scripts/                 # migrate_sqlite_to_postgres.py
    ├── tests/                   # pytest suite
    └── requirements.txt
```

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

That's it for the Docker path — no Node.js or Python needed on your machine. (For the manual path, see [Manual Setup](#manual-setup-without-docker).)

## Quick Start (Docker)

### 1. Clone

```bash
git clone <repository-url>
cd expense-tracker
```

### 2. Create the environment files (required)

The `.env` files are gitignored, and `docker-compose` reads `expense-tracker-api/.env`,
so **`docker-compose up` will fail until these files exist.** Copy the provided examples:

```bash
cp expense-tracker-api/.env.example expense-tracker-api/.env
cp expense-tracker/.env.example      expense-tracker/.env
```

The defaults in `.env.example` use **SQLite with auth disabled**, which runs out of the
box with zero further configuration. To use PostgreSQL/Supabase or enable auth, see
[Environment & Configuration](#environment--configuration) below.

### 3. Start both services

```bash
# First time — build images and start
docker-compose up --build

# Subsequent runs
docker-compose up
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |

```bash
docker-compose down       # stop all services
```

> **Hot-reload is enabled** in dev — source changes are reflected immediately without rebuilding.
>
> **Schema is automatic** — on startup the backend runs Alembic migrations (and seeds default categories/cards on a fresh database), so you never run migrations by hand.

## Environment & Configuration

### Backend — `expense-tracker-api/.env`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | No | Connection string. Defaults to `sqlite:///./expense_tracker.db` if unset. |
| `API_KEY` | No | If set, every route (except `/`, `/docs`, `/openapi.json`, `/redoc`) requires the header `X-API-Key: <value>`. Leave empty to disable auth. |

```env
# SQLite (default — zero config, single file)
DATABASE_URL=sqlite:///./expense_tracker.db

# PostgreSQL / Supabase — use the dashboard "Session pooler" string (port 5432).
# Do NOT use the 6543 "transaction pooler" (breaks prepared statements).
# Keep ?sslmode=require. The app rewrites postgresql:// → postgresql+psycopg:// for you.
# DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require

# Optional API key (generate: python -c "import secrets; print(secrets.token_urlsafe(32))")
API_KEY=
```

### Frontend — `expense-tracker/.env`

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | No | Backend base URL. Defaults to `http://localhost:8000`. |
| `VITE_API_KEY` | Only if backend auth is on | Sent as `X-API-Key` on every request. **Must match the backend's `API_KEY`**, or every call returns `401`. |

> Vite bakes `VITE_*` values into the bundle at build time — restart `npm run dev` / rebuild the image after changing them.

## Using PostgreSQL / Supabase

1. Create a Supabase project and copy the **Session pooler** connection string (port `5432`).
2. Paste it into `DATABASE_URL` in `expense-tracker-api/.env`.
3. Start the backend once — it creates the schema and seeds defaults automatically.
4. (Optional) Migrate existing SQLite data into Postgres:

   ```bash
   cd expense-tracker-api
   source venv/bin/activate
   DATABASE_URL="postgresql://...pooler.supabase.com:5432/postgres?sslmode=require" \
       python scripts/migrate_sqlite_to_postgres.py
   ```

   The script is read-only on the SQLite source, copies tables in FK-safe order, skips
   rows whose primary key already exists, and prints per-table row counts for parity.

## API Routes

| Prefix | Description |
|---|---|
| `GET/POST/PUT/DELETE /expenses` | CRUD for expense entries; `POST /expenses/bulk` for batch import |
| `GET/POST/PUT/DELETE /savings` | CRUD for savings entries |
| `GET/POST/PUT/DELETE /income` | CRUD for income entries |
| `GET/POST/PUT/PATCH/DELETE /fixed-expenses` | Recurring expense templates + `POST /generate/{month_key}` |
| `GET/POST/PUT/DELETE /debts` | Debt records + nested payment history |
| `GET/PUT/DELETE /budget` | Default budget and per-month overrides |
| `GET/POST/DELETE /categories/expenses` | Manage expense categories |
| `GET/POST/DELETE /categories/savings` | Manage savings categories |
| `GET/POST/PATCH/DELETE /cards` | Card types with cut-off dates |
| `GET /analytics/monthly/{month_key}` | Monthly income/expense/savings summary |
| `GET /analytics/annual/{year}` | Annual breakdown |
| `GET /analytics/trend` | Multi-month expense trend |
| `GET/PUT /config` | Global app configuration |

Full interactive docs at `http://localhost:8000/docs` when the backend is running.

## Verification

Run these after any change; fix failures before considering work done.

```bash
# Backend (from expense-tracker-api/, venv active)
python -m pytest

# Frontend (from expense-tracker/)
npm run lint
npm run build
```

---

## Manual Setup (without Docker)

Requires **Node.js 18+** and **Python 3.10+**. First create the `.env` files as in
[Quick Start step 2](#2-create-the-environment-files-required).

### 1. Backend — FastAPI

```bash
cd expense-tracker-api

python3 -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Frontend — React + Vite

In a new terminal:

```bash
cd expense-tracker
npm install
npm run dev
```

### Frontend scripts

```bash
npm run dev       # Development server with hot-reload
npm run build     # Production build → dist/
npm run preview   # Preview the production build
npm run lint      # Run ESLint
```

---

## Production

`docker-compose.prod.yml` builds the production images (nginx-served frontend, no
reload) and reads the same `expense-tracker-api/.env`:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Point `DATABASE_URL` at Supabase and set `API_KEY` (plus the matching `VITE_API_KEY`)
before building for any non-local deployment.
