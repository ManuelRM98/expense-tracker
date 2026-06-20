import os
import sys
from pathlib import Path

# Backend modules use flat imports (import models) — make them resolvable
# regardless of where pytest is invoked from.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# DATABASE_URL must be set before importing database/main.
_DEFAULT_TEST_DB = "postgresql+psycopg://postgres:postgres@localhost:5440/expense_test"
_TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", _DEFAULT_TEST_DB)

# Safety: refuse to run destructive suite against Supabase production.
assert "supabase" not in _TEST_DB_URL.lower(), (
    "TEST_DATABASE_URL points at Supabase — refusing to run the destructive test suite "
    "against production. Use the throwaway db-test service (host port 5440)."
)
assert _TEST_DB_URL.startswith(("postgresql://", "postgresql+psycopg://")), (
    f"Tests must run on PostgreSQL to match production; got: {_TEST_DB_URL}"
)
os.environ["DATABASE_URL"] = _TEST_DB_URL

# SEC-05: disable rate limiting in tests
os.environ["DISABLE_RATE_LIMIT"] = "1"

# AUTH-01: disable legacy API-key env var
os.environ["API_KEY"] = ""

# AUTH-01: point JWKS at a non-existent URL — tests override get_current_user
# entirely via dependency_overrides so the JWKS endpoint is never called.
os.environ["SUPABASE_JWKS_URL"] = "http://localhost:0/.well-known/jwks.json"

import pytest
from fastapi.testclient import TestClient

from auth import AuthUser, get_current_user
from database import Base, engine, SessionLocal
from main import app
import models as m

# ── Fixed test user UUIDs ──────────────────────────────────────────────────────
TEST_USER_A_ID    = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
TEST_USER_A_EMAIL = "user_a@test.local"

TEST_USER_B_ID    = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
TEST_USER_B_EMAIL = "user_b@test.local"

USER_A = AuthUser(id=TEST_USER_A_ID, email=TEST_USER_A_EMAIL)
USER_B = AuthUser(id=TEST_USER_B_ID, email=TEST_USER_B_EMAIL)


def set_auth_user(user: AuthUser):
    """Switch the active test user by updating dependency_overrides in place."""
    app.dependency_overrides[get_current_user] = lambda: user


def _seed_db():
    """Create a fresh schema and seed both test users + default categories."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        db.add(m.AppUser(id=TEST_USER_A_ID, email=TEST_USER_A_EMAIL, display_name="User A"))
        db.add(m.AppUser(id=TEST_USER_B_ID, email=TEST_USER_B_EMAIL, display_name="User B"))

        for uid in [TEST_USER_A_ID, TEST_USER_B_ID]:
            for cat in ["Food", "Transport", "Entertainment", "Health", "Shopping", "Services"]:
                db.add(m.ExpenseCategory(user_id=uid, name=cat))
            db.add(m.SavingCategory(user_id=uid, name="Investment"))
            db.add(m.CardType(user_id=uid, name="Davivienda"))

        db.commit()
    finally:
        db.close()


@pytest.fixture()
def client():
    """
    Fresh schema per test, authenticated as USER_A.
    Use set_auth_user(USER_B) mid-test to switch identity.
    app.dependency_overrides is cleared on teardown.
    """
    _seed_db()
    set_auth_user(USER_A)

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
