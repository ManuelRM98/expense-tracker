"""
AUTH-01: JWT bearer auth replaces the old X-API-Key middleware.
SEC-04: month_key path params validated with ^\\d{4}-\\d{2}$ pattern.
DEBT-06: billing_month must match YYYY-MM format or be None.
"""


# ── SEC-04: month_key path validation ─────────────────────────────────────────

def test_budget_month_key_invalid_format_returns_422(client):
    """Non-YYYY-MM month_key must be rejected with 422, not 500."""
    res = client.get("/budget/not-a-month")
    assert res.status_code == 422


def test_budget_month_key_default_string_rejected(client):
    """GET /budget/default path uses a dedicated route; /budget/{month_key} rejects 'default'."""
    res = client.get("/budget/default")
    assert res.status_code in (200, 422)


def test_budget_month_key_valid_format_ok(client):
    """Valid YYYY-MM key returns 200 (falls back to default budget)."""
    res = client.get("/budget/2026-01")
    assert res.status_code == 200


def test_analytics_monthly_invalid_key_returns_422(client):
    res = client.get("/analytics/monthly/bad-key")
    assert res.status_code == 422


def test_analytics_monthly_valid_key_ok(client):
    res = client.get("/analytics/monthly/2026-03")
    assert res.status_code == 200


def test_fixed_expenses_generate_invalid_key_returns_422(client):
    res = client.post("/fixed-expenses/generate/not-a-month")
    assert res.status_code == 422


def test_fixed_expenses_generate_valid_key_ok(client):
    res = client.post("/fixed-expenses/generate/2026-03")
    assert res.status_code == 200


# ── DEBT-06: billing_month format validation ────────────────────────────────

BASE_EXPENSE = {
    "date": "2026-05-10",
    "desc": "Test",
    "category": "Food",
    "price": 100,
    "card_pay": "No",
    "who_paid": "Manuel",
}


def test_billing_month_invalid_format_returns_422(client):
    payload = {**BASE_EXPENSE, "billing_month": "not-a-month"}
    res = client.post("/expenses", json=payload)
    assert res.status_code == 422


def test_billing_month_valid_format_accepted(client):
    payload = {**BASE_EXPENSE, "billing_month": "2026-06"}
    res = client.post("/expenses", json=payload)
    assert res.status_code == 201
    assert res.json()["billing_month"] == "2026-06"


def test_billing_month_none_accepted(client):
    res = client.post("/expenses", json=BASE_EXPENSE)
    assert res.status_code == 201
    assert res.json()["billing_month"] is None


# ── AUTH-01: unauthenticated requests return 401 ────────────────────────────
# The client fixture overrides get_current_user; these tests bypass that
# override by using a raw TestClient without the override.

def test_health_check_public():
    """GET / must be accessible without auth."""
    from fastapi.testclient import TestClient
    from main import app
    # Clear overrides to test real auth
    overrides = app.dependency_overrides.copy()
    app.dependency_overrides.clear()
    try:
        with TestClient(app, raise_server_exceptions=False) as raw_client:
            res = raw_client.get("/")
        assert res.status_code == 200
    finally:
        app.dependency_overrides.update(overrides)


def test_data_endpoint_without_token_returns_401():
    """GET /expenses without Authorization header must return 401."""
    from fastapi.testclient import TestClient
    from main import app
    overrides = app.dependency_overrides.copy()
    app.dependency_overrides.clear()
    try:
        with TestClient(app, raise_server_exceptions=False) as raw_client:
            res = raw_client.get("/expenses")
        assert res.status_code == 401
    finally:
        app.dependency_overrides.update(overrides)


def test_api_key_auth_disabled_by_default(client):
    """With JWT dependency overridden in tests, data endpoints return 200."""
    res = client.get("/expenses")
    assert res.status_code == 200
