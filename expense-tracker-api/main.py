import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

import models  # noqa: F401 — registers all ORM classes on Base.metadata before migrations run
from database import engine, Base, SessionLocal

# ── Rate limiter (SEC-05) ──────────────────────────────────────────────────────
# Disabled when DISABLE_RATE_LIMIT=1 (used in tests so the suite doesn't throttle).
_RATE_LIMIT_DISABLED = os.getenv("DISABLE_RATE_LIMIT", "0") == "1"
_DEFAULT_LIMIT   = "300/minute"
_GENERATE_LIMIT  = "30/minute"

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[] if _RATE_LIMIT_DISABLED else [_DEFAULT_LIMIT],
)


# ── Startup helpers ────────────────────────────────────────────────────────────

def _run_alembic_migrations():
    """
    DEBT-01 / QUAL-03: Run Alembic migrations programmatically at startup instead
    of the old ad-hoc ALTER TABLE hack.

    Strategy for pre-existing DBs that predate Alembic (no alembic_version table):
      1. If the DB has existing tables but no alembic_version, stamp the baseline
         revision (marks the DB as already at that state) then upgrade to head.
      2. Fresh DBs: create_all to get the full schema, then stamp head so Alembic
         knows it is current.
      3. DBs that already have alembic_version: just run upgrade head normally.
    """
    from alembic.config import Config as AlembicConfig
    from alembic import command
    from sqlalchemy import inspect, text
    import pathlib

    ini_path = pathlib.Path(__file__).parent / "alembic.ini"
    alembic_cfg = AlembicConfig(str(ini_path))

    insp = inspect(engine)
    existing_tables = set(insp.get_table_names())

    if not existing_tables:
        # Fresh database: create tables via metadata then stamp at head
        Base.metadata.create_all(bind=engine)
        command.stamp(alembic_cfg, "head")
    elif "alembic_version" not in existing_tables:
        # Pre-existing DB without Alembic tracking: stamp baseline then upgrade
        command.stamp(alembic_cfg, "ae523ab830f6")
        command.upgrade(alembic_cfg, "head")
    else:
        # Alembic already managing this DB: just upgrade to head
        command.upgrade(alembic_cfg, "head")


def seed_defaults():
    """Seed default categories and card types if tables are empty."""
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


# ── Lifespan (QUAL-03: moved from module-level to proper startup hook) ─────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    _run_alembic_migrations()
    seed_defaults()
    yield  # app runs here


# ── API key middleware (SEC-02 optional auth) ──────────────────────────────────

_API_KEY = os.getenv("API_KEY", "")  # empty string means auth is disabled

UNPROTECTED_PATHS = {"/", "/docs", "/openapi.json", "/redoc"}


async def api_key_middleware(request: Request, call_next):
    """
    SEC-02: If API_KEY env var is set, require header X-API-Key to match on all
    routes except the health check and docs. If API_KEY is unset, pass through.
    """
    if _API_KEY and request.url.path not in UNPROTECTED_PATHS:
        provided = request.headers.get("X-API-Key", "")
        if provided != _API_KEY:
            return JSONResponse(status_code=401, content={"detail": "Invalid or missing X-API-Key"})
    return await call_next(request)


# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Expense Tracker API",
    description="Backend for the Expense Tracker React app. Switch to PostgreSQL by changing DATABASE_URL in .env — no code changes needed.",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiter (SEC-05)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# API key auth middleware (SEC-02) — added before CORS so auth runs on all real requests
app.middleware("http")(api_key_middleware)

# CORS (SEC-02: explicit methods and headers instead of wildcards)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",   # Vite uses next available port if 5173/5174 are taken
    ],
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key"],
)

from routers import expenses, savings, income, fixed_expenses, categories, analytics, config, budget, debts  # noqa: E402

app.include_router(expenses.router)
app.include_router(savings.router)
app.include_router(income.router)
app.include_router(fixed_expenses.router)
app.include_router(categories.router)
app.include_router(analytics.router)
app.include_router(config.router)
app.include_router(budget.router)
app.include_router(debts.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "docs": "/docs"}
