import os
import sys
import tempfile
from pathlib import Path

# Backend modules use flat imports (import models) — make them resolvable
# regardless of where pytest is invoked from.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# DATABASE_URL must be set before importing database/main: the engine URL is read
# at import time, and main.py runs create_all/migrations/seeding on import.
# Without this, the test run would touch the real expense_tracker.db.
_TEST_DB = Path(tempfile.mkdtemp(prefix="expense_tracker_test_")) / "test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB}"

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
