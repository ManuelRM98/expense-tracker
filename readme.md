# Expense Tracker

A web application for personal expense tracking. Allows you to record, edit, and analyze expenses by month, category, card, and person. Includes monthly analytics charts and a sidebar with an annual summary.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite |
| Backend / API | FastAPI + Uvicorn |
| Database | SQLite (via SQLAlchemy) |
| Charts | Recharts |

## Project Structure

```
expense-tracker/
├── expense-tracker/        # React frontend
│   ├── src/
│   │   ├── components/     # Charts, ExpenseModal, ExpenseTable
│   │   ├── hooks/          # useExpenses, useFixedExpenses
│   │   ├── services/       # API integration layer
│   │   └── utils/          # format.js (fmtCOP, fmtDate, uid…)
│   ├── package.json
│   └── vite.config.js
└── expense-tracker-api/    # FastAPI backend
    ├── main.py
    ├── models.py
    ├── schemas.py
    ├── database.py
    ├── routers/            # expenses, income, savings, categories, analytics
    └── requirements.txt
```

## Prerequisites

- **Node.js** v18 or higher
- **Python** 3.10 or higher
- **pip** and `venv` support

## Installation & Local Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd expense-tracker
```

### 2. Backend — FastAPI

```bash
# Navigate to the API folder
cd expense-tracker-api

# Create and activate the virtual environment
python3 -m venv venv
source venv/bin/activate          # macOS / Linux
# venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Start the development server (port 8000)
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.  
Interactive docs at `http://localhost:8000/docs`.

### 3. Frontend — React + Vite

Open a **new terminal**:

```bash
# From the project root
cd expense-tracker

# Install dependencies (first time only)
npm install

# Start the development server (port 5173)
npm run dev
```

The app will be available at `http://localhost:5173`.

## Frontend Scripts

```bash
npm run dev       # Development server with hot-reload
npm run build     # Production build → dist/
npm run preview   # Preview the production build
npm run lint      # Run ESLint
```

## Quick Start (two terminals)

```bash
# Terminal 1 — API
cd expense-tracker-api && source venv/bin/activate && uvicorn main:app --reload

# Terminal 2 — Frontend
cd expense-tracker && npm run dev
```
