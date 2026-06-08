# Expense Tracker

A full-stack personal finance web application. Track expenses, savings, debts, fixed costs, and income — with budget allocation and monthly/annual analytics charts.

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
| Database | SQLite (via SQLAlchemy) |
| Charts | Recharts |
| Containerization | Docker + Docker Compose |

## Project Structure

```
expense-tracker/
├── docker-compose.yml          # Orchestrates both services
├── expense-tracker/            # React frontend
│   ├── Dockerfile
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── hooks/              # useExpenses, useFixedExpenses, useBudget, useDebts
│   │   ├── services/           # api.js — HTTP client for the backend
│   │   └── utils/              # format.js (fmtCOP, fmtDate, uid…)
│   ├── package.json
│   └── vite.config.js
└── expense-tracker-api/        # FastAPI backend
    ├── Dockerfile
    ├── main.py
    ├── models.py
    ├── schemas.py
    ├── database.py
    ├── routers/                # See API Routes below
    ├── .env                    # Database connection string
    └── requirements.txt
```

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

That's it. No Node.js or Python installation required on your machine.

## Quick Start (Docker)

```bash
# Clone the repository
git clone <repository-url>
cd expense-tracker

# First time — build images and start both services
docker-compose up --build

# From the second time onwards
docker-compose up
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |

```bash
# Stop all services
docker-compose down
```

> **Hot-reload is enabled.** Changes to source files are reflected immediately without restarting the containers.

> **Data is persisted.** The SQLite database (`expense-tracker-api/expense_tracker.db`) lives on your machine and is mounted into the container, so data survives restarts.

## Environment & Configuration

The backend reads `expense-tracker-api/.env`. The default ships with SQLite; switch to PostgreSQL by uncommenting one line — no other code changes needed.

```env
# SQLite (default — zero config, single file)
DATABASE_URL=sqlite:///./expense_tracker.db

# PostgreSQL (uncomment to migrate)
# DATABASE_URL=postgresql://user:password@localhost:5432/expense_tracker
```

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

Full interactive docs available at `http://localhost:8000/docs` when the backend is running.

---

## Manual Setup (without Docker)

If you prefer to run the services directly on your machine, you'll need:

- Node.js v18 or higher
- Python 3.10 or higher

### 1. Backend — FastAPI

```bash
cd expense-tracker-api

python3 -m venv venv
source venv/bin/activate       # macOS / Linux
# venv\Scripts\activate        # Windows

pip install -r requirements.txt
uvicorn main:app --reload
```

### 2. Frontend — React + Vite

Open a new terminal:

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
