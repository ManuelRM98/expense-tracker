import os
import sys
from pathlib import Path

# Backend modules use flat imports (import models) — make them resolvable
# regardless of where pytest is invoked from.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# DATABASE_URL must be set before importing database/main: the engine URL is read
# at import time, and main.py runs create_all/migrations/seeding on import.
#
# Tests run against a throwaway PostgreSQL (the db-test compose service), NOT SQLite,
# so the suite exercises the SAME dialect as production Supabase. SQLite is dynamically
# typed and would silently accept PG-invalid SQL — e.g. LIKE on a DATE column — letting
# it pass CI and then 500 in production. The DB host defaults to localhost:5440 for
# host-venv runs; docker-compose sets TEST_DATABASE_URL=...@db-test:5432 for in-container
# runs. Override TEST_DATABASE_URL to point elsewhere.
_DEFAULT_TEST_DB = "postgresql+psycopg://postgres:postgres@localhost:5440/expense_test"
_TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", _DEFAULT_TEST_DB)

# Safety: every test does drop_all/create_all. Running that against the real Supabase
# database would wipe production. Refuse anything that isn't an obviously-disposable PG.
assert "supabase" not in _TEST_DB_URL.lower(), (
    "TEST_DATABASE_URL points at Supabase — refusing to run the destructive test suite "
    "against production. Use the throwaway db-test service (host port 5440)."
)
assert _TEST_DB_URL.startswith(("postgresql://", "postgresql+psycopg://")), (
    f"Tests must run on PostgreSQL to match production; got: {_TEST_DB_URL}"
)
os.environ["DATABASE_URL"] = _TEST_DB_URL

# SEC-05: disable rate limiting in tests so the suite never hits throttle limits
os.environ["DISABLE_RATE_LIMIT"] = "1"

# SEC-02: force API-key auth OFF in tests. database.py calls load_dotenv(), which
# would otherwise pull API_KEY from the real .env (set for the Supabase migration)
# and make every test 401. Setting it here first wins — load_dotenv won't override
# an existing env var. The dedicated key tests patch main._API_KEY directly.
os.environ["API_KEY"] = ""

import pytest
from fastapi.testclient import TestClient

from database import Base, engine
from main import app, seed_defaults


@pytest.fixture()
def client():
    """Fresh schema + default seeds per test — no state leaks between tests."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_defaults()
    with TestClient(app) as c:
        yield c
