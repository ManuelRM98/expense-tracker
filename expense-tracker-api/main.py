from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routers import expenses, savings, income, fixed_expenses, categories, analytics

# ── Create all tables on startup (safe to run multiple times) ──────────────────
import models  # noqa: F401 — ensures all models are registered before create_all
Base.metadata.create_all(bind=engine)

# ── Seed default categories and card types if tables are empty ─────────────────
from database import SessionLocal
import models

def seed_defaults():
    db = SessionLocal()
    try:
        if db.query(models.ExpenseCategory).count() == 0:
            defaults = ["Food", "Transport", "Entertainment", "Health", "Shopping", "Services"]
            db.add_all([models.ExpenseCategory(name=n) for n in defaults])

        if db.query(models.SavingCategory).count() == 0:
            db.add(models.SavingCategory(name="Investment"))

        if db.query(models.CardType).count() == 0:
            db.add(models.CardType(name="Davivienda"))

        db.commit()
    finally:
        db.close()

seed_defaults()

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Expense Tracker API",
    description="Backend for the Expense Tracker React app. Switch to PostgreSQL by changing DATABASE_URL in .env — no code changes needed.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",   # Vite uses next available port if 5173 is taken
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(expenses.router)
app.include_router(savings.router)
app.include_router(income.router)
app.include_router(fixed_expenses.router)
app.include_router(categories.router)
app.include_router(analytics.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "docs": "/docs"}
