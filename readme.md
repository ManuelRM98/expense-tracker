# Expense Tracker

A full-stack web application for personal expense tracking. Record, edit, and analyze expenses by month, category, card, and person. Includes savings, fixed expenses, debt tracking, budget allocation, and monthly/annual analytics charts.

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
    ├── routers/                # expenses, income, savings, fixed_expenses,
    │                           # categories, analytics, config, budget, debts
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
