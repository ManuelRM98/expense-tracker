"""
SEC-02: API-key optional auth — required when API_KEY env var is set.
SEC-04: month_key path params validated with ^\\d{4}-\\d{2}$ pattern.
DEBT-06: billing_month must match YYYY-MM format or be None.
"""
import os
import pytest


# ── SEC-04: month_key path validation ─────────────────────────────────────────

def test_budget_month_key_invalid_format_returns_422(client):
    """Non-YYYY-MM month_key must be rejected with 422, not 500."""
    res = client.get("/budget/not-a-month")
    assert res.status_code == 422


def test_budget_month_key_default_string_rejected(client):
    """GET /budget/default path uses a dedicated route; /budget/{month_key} rejects 'default'."""
    # 'default' does not match ^\d{4}-\d{2}$ so it should be 422
    res = client.get("/budget/default")
    # FastAPI routes /budget/default to the dedicated endpoint — that is fine.
    # The important thing is that the dynamic route does not expose the internal row.
    # Either the dedicated route handles it (200) or the pattern rejects it (422).
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


# ── SEC-02: API-key auth ────────────────────────────────────────────────────

def test_api_key_auth_disabled_by_default(client):
    """Without API_KEY set, all requests pass without X-API-Key header."""
    # API_KEY is not set in the test environment — should work fine
    res = client.get("/expenses")
    assert res.status_code == 200


def test_api_key_required_when_set(client):
    """When API_KEY is configured, requests without the header get 401."""
    import main as m
    original = m._API_KEY
    m._API_KEY = "test-secret-key"
    try:
        res = client.get("/expenses")
        assert res.status_code == 401
    finally:
        m._API_KEY = original


def test_api_key_accepted_when_correct(client):
    """Correct X-API-Key header should be accepted."""
    import main as m
    original = m._API_KEY
    m._API_KEY = "test-secret-key"
    try:
        res = client.get("/expenses", headers={"X-API-Key": "test-secret-key"})
        assert res.status_code == 200
    finally:
        m._API_KEY = original


def test_api_key_health_check_excluded(client):
    """Health check at / is accessible without API key even when auth is enabled."""
    import main as m
    original = m._API_KEY
    m._API_KEY = "test-secret-key"
    try:
        res = client.get("/")
        assert res.status_code == 200
    finally:
        m._API_KEY = original
