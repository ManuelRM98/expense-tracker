"""
AUTH-01: Data isolation tests.

All tests use a single `client` fixture and switch between USER_A / USER_B via
`set_auth_user()`.  This avoids the dependency_overrides race condition that
occurs when two TestClient instances share the same FastAPI `app` object.

Pattern:
  1. Create data as USER_A.
  2. Switch to USER_B via set_auth_user(USER_B).
  3. Assert USER_B cannot access USER_A's data.
"""
import pytest
from conftest import USER_A, USER_B, set_auth_user

# ── Shared payloads ────────────────────────────────────────────────────────────

EXPENSE_PAYLOAD = {
    "date": "2026-05-10",
    "desc": "Test expense",
    "category": "Food",
    "price": 50000,
    "card_pay": "No",
    "who_paid": "Test",
}

SAVING_PAYLOAD = {
    "date": "2026-05-10",
    "desc": "Test saving",
    "category": "Investment",
    "price": 100000,
    "card_pay": "No",
    "card_type": "",
}

INCOME_PAYLOAD = {
    "month_key": "2026-05",
    "income_type": "salary",
    "description": "May salary",
    "currency": "COP",
    "amount_cop": 3000000,
}

DEBT_PAYLOAD = {
    "direction": "they_owe_me",
    "person": "Alice",
    "description": "Lunch",
    "amount": 25000,
    "created_date": "2026-05-10",
    "is_settled": False,
}


# ── Expenses ───────────────────────────────────────────────────────────────────

def test_expense_isolation_list(client):
    """User A's expenses are NOT visible to user B."""
    set_auth_user(USER_A)
    expense_id = client.post("/expenses", json=EXPENSE_PAYLOAD).json()["id"]

    set_auth_user(USER_B)
    resp = client.get("/expenses")
    assert resp.status_code == 200
    assert expense_id not in [e["id"] for e in resp.json()]


def test_expense_isolation_get(client):
    """User B cannot fetch user A's expense by ID (returns 404)."""
    set_auth_user(USER_A)
    expense_id = client.post("/expenses", json=EXPENSE_PAYLOAD).json()["id"]

    set_auth_user(USER_B)
    assert client.get(f"/expenses/{expense_id}").status_code == 404


def test_expense_isolation_update(client):
    """User B cannot update user A's expense."""
    set_auth_user(USER_A)
    expense_id = client.post("/expenses", json=EXPENSE_PAYLOAD).json()["id"]

    set_auth_user(USER_B)
    assert client.put(f"/expenses/{expense_id}", json=EXPENSE_PAYLOAD).status_code == 404


def test_expense_isolation_delete(client):
    """User B cannot delete user A's expense."""
    set_auth_user(USER_A)
    expense_id = client.post("/expenses", json=EXPENSE_PAYLOAD).json()["id"]

    set_auth_user(USER_B)
    assert client.delete(f"/expenses/{expense_id}").status_code == 404


# ── Savings ────────────────────────────────────────────────────────────────────

def test_saving_isolation_list(client):
    set_auth_user(USER_A)
    saving_id = client.post("/savings", json=SAVING_PAYLOAD).json()["id"]

    set_auth_user(USER_B)
    resp = client.get("/savings")
    assert resp.status_code == 200
    assert saving_id not in [s["id"] for s in resp.json()]


def test_saving_isolation_get(client):
    set_auth_user(USER_A)
    saving_id = client.post("/savings", json=SAVING_PAYLOAD).json()["id"]

    set_auth_user(USER_B)
    assert client.get(f"/savings/{saving_id}").status_code == 404


def test_saving_isolation_update(client):
    set_auth_user(USER_A)
    saving_id = client.post("/savings", json=SAVING_PAYLOAD).json()["id"]

    set_auth_user(USER_B)
    assert client.put(f"/savings/{saving_id}", json=SAVING_PAYLOAD).status_code == 404


def test_saving_isolation_delete(client):
    set_auth_user(USER_A)
    saving_id = client.post("/savings", json=SAVING_PAYLOAD).json()["id"]

    set_auth_user(USER_B)
    assert client.delete(f"/savings/{saving_id}").status_code == 404


# ── Income ─────────────────────────────────────────────────────────────────────

def test_income_isolation_list(client):
    set_auth_user(USER_A)
    entry_id = client.post("/income", json=INCOME_PAYLOAD).json()["id"]

    set_auth_user(USER_B)
    resp = client.get("/income")
    assert resp.status_code == 200
    assert entry_id not in [e["id"] for e in resp.json()]


def test_income_isolation_update(client):
    set_auth_user(USER_A)
    entry_id = client.post("/income", json=INCOME_PAYLOAD).json()["id"]
    update_payload = {k: v for k, v in INCOME_PAYLOAD.items() if k != "month_key"}

    set_auth_user(USER_B)
    assert client.put(f"/income/{entry_id}", json=update_payload).status_code == 404


def test_income_isolation_delete(client):
    set_auth_user(USER_A)
    entry_id = client.post("/income", json=INCOME_PAYLOAD).json()["id"]

    set_auth_user(USER_B)
    assert client.delete(f"/income/{entry_id}").status_code == 404


# ── Debts ──────────────────────────────────────────────────────────────────────

def test_debt_isolation_list(client):
    set_auth_user(USER_A)
    debt_id = client.post("/debts", json=DEBT_PAYLOAD).json()["id"]

    set_auth_user(USER_B)
    resp = client.get("/debts")
    assert resp.status_code == 200
    assert debt_id not in [d["id"] for d in resp.json()]


def test_debt_isolation_update(client):
    set_auth_user(USER_A)
    debt_id = client.post("/debts", json=DEBT_PAYLOAD).json()["id"]
    update = {"person": "Eve", "description": "Hacked", "amount": 1, "is_settled": False}

    set_auth_user(USER_B)
    assert client.put(f"/debts/{debt_id}", json=update).status_code == 404


def test_debt_isolation_delete(client):
    set_auth_user(USER_A)
    debt_id = client.post("/debts", json=DEBT_PAYLOAD).json()["id"]

    set_auth_user(USER_B)
    assert client.delete(f"/debts/{debt_id}").status_code == 404


def test_debt_payment_isolation(client):
    """User B cannot add a payment to user A's debt."""
    set_auth_user(USER_A)
    debt_id = client.post("/debts", json=DEBT_PAYLOAD).json()["id"]

    set_auth_user(USER_B)
    resp = client.post(
        f"/debts/{debt_id}/payments",
        json={"amount": 1000, "date": "2026-05-11", "note": ""},
    )
    assert resp.status_code == 404


# ── Categories ─────────────────────────────────────────────────────────────────

def test_expense_category_isolation_rename(client):
    """User B cannot rename a category that only exists for User A."""
    # Create a unique category only for User A
    set_auth_user(USER_A)
    client.post("/categories/expenses", json={"name": "UserAOnly"})

    # User B should not be able to rename it
    set_auth_user(USER_B)
    assert client.put("/categories/expenses/UserAOnly", json={"new_name": "Hacked"}).status_code == 404


def test_expense_category_isolation_delete(client):
    """User B cannot delete a category that only exists for User A."""
    # Create unique category for A
    set_auth_user(USER_A)
    client.post("/categories/expenses", json={"name": "UserAExclusive"})

    # User B cannot delete it
    set_auth_user(USER_B)
    assert client.delete("/categories/expenses/UserAExclusive").status_code == 404


def test_saving_category_isolation(client):
    """User B cannot rename or delete a saving category that only exists for User A."""
    set_auth_user(USER_A)
    client.post("/categories/savings", json={"name": "UserAOnlySaving"})

    # Give user B an extra category so the min-items guard doesn't fire before lookup
    set_auth_user(USER_B)
    client.post("/categories/savings", json={"name": "Extra"})

    assert client.put("/categories/savings/UserAOnlySaving", json={"new_name": "Hacked"}).status_code == 404
    assert client.delete("/categories/savings/UserAOnlySaving").status_code == 404


# ── Cards ──────────────────────────────────────────────────────────────────────

def test_card_isolation(client):
    """User B cannot rename or delete a card that only exists for User A."""
    set_auth_user(USER_A)
    client.post("/cards", json={"name": "UserACard"})

    # Give user B an extra card so the min-items guard doesn't fire before lookup
    set_auth_user(USER_B)
    client.post("/cards", json={"name": "ExtraCard"})

    assert client.put("/cards/UserACard/rename", json={"new_name": "Hacked"}).status_code == 404
    assert client.delete("/cards/UserACard").status_code == 404


# ── Budget ─────────────────────────────────────────────────────────────────────

def test_budget_isolation(client):
    """User A's budget override is not visible to user B."""
    set_auth_user(USER_A)
    client.put("/budget/2026-05", json={"fixed_pct": 60, "variable_pct": 20, "savings_pct": 20})

    set_auth_user(USER_B)
    resp = client.get("/budget/2026-05")
    assert resp.status_code == 200
    # B has no override — should get the hardcoded default (is_override=False)
    assert resp.json()["is_override"] is False


# ── Config ─────────────────────────────────────────────────────────────────────

def test_config_isolation(client):
    """User A's config is not visible to user B."""
    set_auth_user(USER_A)
    client.put("/config/base_salary", json={"value": "5000000"})

    set_auth_user(USER_B)
    assert client.get("/config/base_salary").status_code == 404


def test_config_list_isolation(client):
    """GET /config for user B returns empty, not user A's values."""
    set_auth_user(USER_A)
    client.put("/config/base_salary", json={"value": "5000000"})

    set_auth_user(USER_B)
    resp = client.get("/config")
    assert resp.status_code == 200
    assert resp.json() == []


# ── Analytics ──────────────────────────────────────────────────────────────────

def test_analytics_monthly_isolation(client):
    """Monthly analytics for user B are zero even when user A has data."""
    set_auth_user(USER_A)
    client.post("/expenses", json=EXPENSE_PAYLOAD)
    client.post("/income", json=INCOME_PAYLOAD)

    set_auth_user(USER_B)
    resp = client.get("/analytics/monthly/2026-05")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_expenses"] == 0
    assert data["income"] == 0


def test_analytics_annual_isolation(client):
    """Annual analytics for user B are zero even when user A has data."""
    set_auth_user(USER_A)
    client.post("/expenses", json=EXPENSE_PAYLOAD)

    set_auth_user(USER_B)
    resp = client.get("/analytics/annual/2026")
    assert resp.status_code == 200
    assert resp.json()["total_expenses"] == 0


def test_analytics_trend_isolation(client):
    """Trend data for user B shows no expenses from user A."""
    set_auth_user(USER_A)
    client.post("/expenses", json=EXPENSE_PAYLOAD)

    set_auth_user(USER_B)
    resp = client.get("/analytics/trend", params={"months": 3})
    assert resp.status_code == 200
    assert sum(p["total_expenses"] for p in resp.json()) == 0


# ── Account ────────────────────────────────────────────────────────────────────

def test_account_me_returns_correct_user(client):
    """GET /account/me returns the calling user's profile."""
    set_auth_user(USER_A)
    resp_a = client.get("/account/me")
    assert resp_a.status_code == 200
    assert resp_a.json()["id"] == "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

    set_auth_user(USER_B)
    resp_b = client.get("/account/me")
    assert resp_b.status_code == 200
    assert resp_b.json()["id"] == "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


def test_account_update_display_name(client):
    """PUT /account/me updates display_name for the caller only."""
    set_auth_user(USER_A)
    resp = client.put("/account/me", json={"display_name": "New Name"})
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "New Name"

    # User B's name is unchanged
    set_auth_user(USER_B)
    resp_b = client.get("/account/me")
    assert resp_b.json()["display_name"] != "New Name"


# ── Fixed Expense Templates ────────────────────────────────────────────────────

TEMPLATE_PAYLOAD = {
    "name": "Netflix",
    "amount": 45000,
    "category": "Services",
    "day_of_month": 15,
    "who_paid": "Manuel",
    "card_pay": "No",
    "card_type": "",
}


def test_fixed_expense_template_isolation_list(client):
    """User B's GET /fixed-expenses does NOT include User A's templates."""
    set_auth_user(USER_A)
    template_id = client.post("/fixed-expenses", json=TEMPLATE_PAYLOAD).json()["id"]

    set_auth_user(USER_B)
    resp = client.get("/fixed-expenses")
    assert resp.status_code == 200
    assert template_id not in [t["id"] for t in resp.json()]


def test_fixed_expense_template_isolation_update(client):
    """User B cannot update User A's template (returns 404)."""
    set_auth_user(USER_A)
    template_id = client.post("/fixed-expenses", json=TEMPLATE_PAYLOAD).json()["id"]

    set_auth_user(USER_B)
    assert client.put(f"/fixed-expenses/{template_id}", json=TEMPLATE_PAYLOAD).status_code == 404


def test_fixed_expense_template_isolation_delete(client):
    """User B cannot delete User A's template (returns 404)."""
    set_auth_user(USER_A)
    template_id = client.post("/fixed-expenses", json=TEMPLATE_PAYLOAD).json()["id"]

    set_auth_user(USER_B)
    assert client.delete(f"/fixed-expenses/{template_id}").status_code == 404


def test_fixed_expense_template_isolation_toggle(client):
    """User B cannot toggle (activate/deactivate) User A's template (returns 404)."""
    set_auth_user(USER_A)
    template_id = client.post("/fixed-expenses", json=TEMPLATE_PAYLOAD).json()["id"]

    set_auth_user(USER_B)
    assert client.patch(f"/fixed-expenses/{template_id}/toggle").status_code == 404


def test_fixed_expense_log_isolation(client):
    """GET /fixed-expenses/log for User B does NOT return User A's log entries."""
    import datetime
    from database import SessionLocal
    import models as m

    set_auth_user(USER_A)
    # Create a template with day_of_month=1 so it always fires on/after the 1st
    template_payload = {**TEMPLATE_PAYLOAD, "day_of_month": 1}
    template_id = client.post("/fixed-expenses", json=template_payload).json()["id"]

    # Generate for the current month (template was just created this month, day=1 has passed)
    current_month = datetime.date.today().strftime("%Y-%m")
    gen_resp = client.post(f"/fixed-expenses/generate/{current_month}")
    assert gen_resp.status_code == 200

    # If generate produced no entries (edge case: day_of_month guard), seed the log directly
    if not gen_resp.json():
        db = SessionLocal()
        try:
            log_key = f"{template_id}_{current_month}"
            db.add(m.FixedExpenseLog(log_key=log_key, user_id=USER_A.id))
            db.commit()
        finally:
            db.close()

    # User A should have at least one log key
    log_a = client.get("/fixed-expenses/log").json()
    assert len(log_a) >= 1

    # User B's log must be empty — no entries from User A visible
    set_auth_user(USER_B)
    log_b = client.get("/fixed-expenses/log").json()
    assert log_b == []
    # Double-check: none of User A's log keys leak into User B's view
    for key in log_a:
        assert key not in log_b


def test_fixed_expense_generate_isolation(client):
    """POST /fixed-expenses/generate/{month_key} for User B does NOT act on User A's templates."""
    set_auth_user(USER_A)
    client.post("/fixed-expenses", json=TEMPLATE_PAYLOAD)

    # User B triggers generation for the same month
    set_auth_user(USER_B)
    resp = client.post("/fixed-expenses/generate/2025-01")
    assert resp.status_code == 200
    # User B has no templates, so nothing should be generated
    assert resp.json() == []
