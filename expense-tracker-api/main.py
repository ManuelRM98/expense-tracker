import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

import models  # noqa: F401 — registers all ORM classes on Base.metadata before migrations run
from auth import get_current_user
from database import engine, Base

# ── Rate limiter (SEC-05) ──────────────────────────────────────────────────────
_RATE_LIMIT_DISABLED = os.getenv("DISABLE_RATE_LIMIT", "0") == "1"
_DEFAULT_LIMIT   = "300/minute"

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[] if _RATE_LIMIT_DISABLED else [_DEFAULT_LIMIT],
)


# ── Startup helpers ────────────────────────────────────────────────────────────

def _run_alembic_migrations():
    """
    DEBT-01 / QUAL-03: Run Alembic migrations programmatically at startup.

    Strategy for pre-existing DBs that predate Alembic (no alembic_version table):
      1. If the DB has existing tables but no alembic_version, stamp the baseline
         revision then upgrade to head.
      2. Fresh DBs: create_all to get the full schema, then stamp head.
      3. DBs that already have alembic_version: just run upgrade head normally.
    """
    from alembic.config import Config as AlembicConfig
    from alembic import command
    from sqlalchemy import inspect
    import pathlib

    ini_path = pathlib.Path(__file__).parent / "alembic.ini"
    alembic_cfg = AlembicConfig(str(ini_path))

    insp = inspect(engine)
    existing_tables = set(insp.get_table_names())

    if not existing_tables:
        Base.metadata.create_all(bind=engine)
        command.stamp(alembic_cfg, "head")
    elif "alembic_version" not in existing_tables:
        command.stamp(alembic_cfg, "ae523ab830f6")
        command.upgrade(alembic_cfg, "head")
    else:
        command.upgrade(alembic_cfg, "head")


# NOTE: Global seed_defaults() has been removed (AUTH-01).
# Each user now gets their own defaults seeded on first authenticated request
# via routers/account.py:seed_defaults_for_user().


# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    _run_alembic_migrations()
    # No global seed — seeding is per-user (AUTH-01)
    yield  # app runs here


# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Expense Tracker API",
    description=(
        "Backend for the Expense Tracker React app. "
        "All data endpoints require `Authorization: Bearer <supabase_access_token>`. "
        "Switch to PostgreSQL by changing DATABASE_URL in .env."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# Rate limiter (SEC-05)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS — AUTH-01: added Authorization to allow_headers; removed X-API-Key.
# SEC-01-4: by default allow_origin_regex permits localhost + private LAN
# addresses on any port (intentional for the multi-device home setup). For a
# public domain, set CORS_ALLOW_ORIGINS to a comma-separated explicit allow-list
# (e.g. "https://tracker.example.com") to replace the broad LAN regex.
# Auth is via bearer token (not cookies), so CORS is not the security boundary —
# never pair this with allow_credentials=True.
_cors_env = os.getenv("CORS_ALLOW_ORIGINS", "").strip()
_cors_kwargs = (
    {"allow_origins": [o.strip() for o in _cors_env.split(",") if o.strip()]}
    if _cors_env
    else {
        "allow_origin_regex": (
            r"^http://("
            r"localhost|127\.0\.0\.1|"
            r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
            r"192\.168\.\d{1,3}\.\d{1,3}|"
            r"172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|"
            r"[\w-]+\.local"
            r")(:\d+)?$"
        )
    }
)
app.add_middleware(
    CORSMiddleware,
    **_cors_kwargs,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],  # AUTH-01: Bearer token header
)

# AUTH-01: all data routers are protected by JWT.  The dependency is applied via
# Depends() on each individual endpoint (in the router files) rather than here as
# a global dependency, so /docs /openapi.json /redoc / remain public.

from routers import expenses, savings, income, fixed_expenses, categories, analytics, config, budget, debts, account  # noqa: E402

app.include_router(expenses.router)
app.include_router(savings.router)
app.include_router(income.router)
app.include_router(fixed_expenses.router)
app.include_router(categories.router)
app.include_router(analytics.router)
app.include_router(config.router)
app.include_router(budget.router)
app.include_router(debts.router)
app.include_router(account.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "docs": "/docs"}
