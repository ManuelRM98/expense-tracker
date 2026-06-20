"""
FEAT-14: Tests for DELETE /account/me (account self-deletion).

All tests run against the throwaway db-test PostgreSQL, following the conftest.py
fixture conventions: `client` fixture gives a fresh schema per test, seeded with
USER_A and USER_B, and authenticated as USER_A by default.

Coverage:
  - Full cascade delete: USER_A's rows are gone across every table incl. app_users
  - Isolation: USER_B's rows survive USER_A's deletion
  - Auth-deletion helper mocked — no network calls
  - Branch 1: helper returns True  → 204 No Content
  - Branch 2: helper returns False → 200 with auth_deleted: false
  - 401 when no auth dependency is active
"""
import uuid
import datetime

import pytest
from database import SessionLocal
from conftest import USER_A, USER_B, set_auth_user
from auth import get_current_user
from main import app
import models as m


# ── Seed helpers ─────────────────────────────────────────────────────────────

def _make_id() -> str:
    return str(uuid.uuid4())


def _seed_full_user_a():
    """
    Seed USER_A with at least one row in every user-scoped table so the cascade
    delete test can verify all of them are wiped.

    conftest._seed_db() already inserts the AppUser row + default categories/card,
    so we add the remaining tables here: expenses, savings, income, debt + payment,
    fixed template + log, month_budget, global_config.
    """
    db = SessionLocal()
    try:
        today = datetime.date.today()

        # expense
        exp_id = _make_id()
        db.add(m.Expense(
            id=exp_id,
            user_id=USER_A.id,
            date=today,
            desc="Delete me expense",
            category="Food",
            price=10000,
            card_pay="No",
            who_paid="User A",
        ))

        # saving
        sav_id = _make_id()
        db.add(m.Saving(
            id=sav_id,
            user_id=USER_A.id,
            date=today,
            desc="Delete me saving",
            category="Investment",
            price=5000,
            card_pay="No",
        ))

        # income entry
        inc_id = _make_id()
        db.add(m.IncomeEntry(
            id=inc_id,
            user_id=USER_A.id,
            month_key="2026-06",
            income_type="salary",
            description="June salary",
            currency="COP",
            amount_cop=3000000,
        ))

        # debt + payment
        debt_id = _make_id()
        db.add(m.Debt(
            id=debt_id,
            user_id=USER_A.id,
            direction="they_owe_me",
            person="Carlos",
            description="Lunch",
            amount=20000,
            created_date=today,
        ))
        db.flush()   # need debt.id before inserting payment (FK)
        payment_id = _make_id()
        db.add(m.DebtPayment(
            id=payment_id,
            debt_id=debt_id,
            amount=5000,
            date=today,
            note="first instalment",
        ))

        # fixed expense template + log
        tmpl_id = _make_id()
        db.add(m.FixedExpenseTemplate(
            id=tmpl_id,
            user_id=USER_A.id,
            name="Netflix",
            amount=45000,
            category="Services",
            day_of_month=15,
            who_paid="User A",
            card_pay="No",
            card_type="",
            is_active=True,
            created_at="2026-01",
        ))
        log_key = f"{tmpl_id}_2026-06"
        db.add(m.FixedExpenseLog(
            log_key=log_key,
            user_id=USER_A.id,
        ))

        # month budget
        db.add(m.MonthBudget(
            user_id=USER_A.id,
            month_key="2026-06",
            fixed_pct=40,
            variable_pct=40,
            savings_pct=20,
        ))

        # global config
        db.add(m.GlobalConfig(
            user_id=USER_A.id,
            key="base_salary",
            value="3000000",
        ))

        db.commit()
    finally:
        db.close()


def _seed_user_b_data():
    """Add a minimal expense row for USER_B so isolation can be verified."""
    db = SessionLocal()
    try:
        today = datetime.date.today()
        db.add(m.Expense(
            id=_make_id(),
            user_id=USER_B.id,
            date=today,
            desc="B's expense — must survive",
            category="Food",
            price=8000,
            card_pay="No",
            who_paid="User B",
        ))
        db.commit()
    finally:
        db.close()


def _count_all_user_a_rows() -> dict:
    """Return {table_name: row_count} for every user-scoped table, scoped to USER_A."""
    db = SessionLocal()
    try:
        user_id = USER_A.id
        return {
            "app_users":                db.query(m.AppUser).filter(m.AppUser.id == user_id).count(),
            "expenses":                 db.query(m.Expense).filter(m.Expense.user_id == user_id).count(),
            "savings":                  db.query(m.Saving).filter(m.Saving.user_id == user_id).count(),
            "income_entries":           db.query(m.IncomeEntry).filter(m.IncomeEntry.user_id == user_id).count(),
            "debts":                    db.query(m.Debt).filter(m.Debt.user_id == user_id).count(),
            "debt_payments":            (
                db.query(m.DebtPayment)
                .join(m.Debt, m.DebtPayment.debt_id == m.Debt.id)
                .filter(m.Debt.user_id == user_id)
                .count()
            ),
            "fixed_expense_templates":  db.query(m.FixedExpenseTemplate).filter(
                m.FixedExpenseTemplate.user_id == user_id).count(),
            "fixed_expense_logs":       db.query(m.FixedExpenseLog).filter(
                m.FixedExpenseLog.user_id == user_id).count(),
            "month_budgets":            db.query(m.MonthBudget).filter(
                m.MonthBudget.user_id == user_id).count(),
            "global_config":            db.query(m.GlobalConfig).filter(
                m.GlobalConfig.user_id == user_id).count(),
            "expense_categories":       db.query(m.ExpenseCategory).filter(
                m.ExpenseCategory.user_id == user_id).count(),
            "saving_categories":        db.query(m.SavingCategory).filter(
                m.SavingCategory.user_id == user_id).count(),
            "card_types":               db.query(m.CardType).filter(
                m.CardType.user_id == user_id).count(),
        }
    finally:
        db.close()


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_delete_me_cascade_wipes_all_tables(client, monkeypatch):
    """
    Full cascade delete: after DELETE /account/me, ZERO rows remain for USER_A
    in every user-scoped table, including app_users.
    Helper returns True → 204.
    """
    _seed_full_user_a()

    # Verify non-zero rows before deletion
    before = _count_all_user_a_rows()
    assert before["app_users"] == 1
    assert before["expenses"] >= 1
    assert before["debts"] >= 1
    assert before["debt_payments"] >= 1

    # Mock the admin API helper so tests do not hit the network
    from routers import account as account_mod
    monkeypatch.setattr(account_mod, "delete_supabase_auth_user", lambda uid: True)

    set_auth_user(USER_A)
    resp = client.delete("/account/me")
    assert resp.status_code == 204
    assert resp.content == b""

    after = _count_all_user_a_rows()
    for table, count in after.items():
        assert count == 0, f"Expected 0 rows for USER_A in {table}, found {count}"


def test_delete_me_isolation_user_b_untouched(client, monkeypatch):
    """
    Isolation: USER_B's data is completely intact after USER_A deletes themselves.
    """
    _seed_user_b_data()

    from routers import account as account_mod
    monkeypatch.setattr(account_mod, "delete_supabase_auth_user", lambda uid: True)

    # USER_A deletes their account
    set_auth_user(USER_A)
    resp = client.delete("/account/me")
    assert resp.status_code == 204

    # USER_B's expense still exists
    db = SessionLocal()
    try:
        b_expenses = db.query(m.Expense).filter(m.Expense.user_id == USER_B.id).count()
        b_user = db.query(m.AppUser).filter(m.AppUser.id == USER_B.id).first()
    finally:
        db.close()

    assert b_expenses >= 1, "USER_B's expenses should survive USER_A's deletion"
    assert b_user is not None, "USER_B's app_users row should survive USER_A's deletion"


def test_delete_me_auth_deleted_false_returns_200(client, monkeypatch):
    """
    Branch 2: when the Supabase Admin call fails (helper returns False), the
    endpoint returns 200 with auth_deleted=false and a detail message.
    Local data is still deleted.
    """
    from routers import account as account_mod
    monkeypatch.setattr(account_mod, "delete_supabase_auth_user", lambda uid: False)

    set_auth_user(USER_A)
    resp = client.delete("/account/me")
    assert resp.status_code == 200

    body = resp.json()
    assert body["auth_deleted"] is False
    assert "detail" in body
    # local data is still gone
    after = _count_all_user_a_rows()
    assert after["app_users"] == 0
    assert after["expenses"] == 0


def test_delete_me_no_service_role_key_returns_200(client, monkeypatch):
    """
    When SUPABASE_SERVICE_ROLE_KEY is unset, delete_supabase_auth_user returns
    False and the endpoint returns 200 with auth_deleted=false.
    This test exercises the real helper with the env var cleared.
    """
    import os
    # Clear the service-role key so the real helper returns False
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "")

    set_auth_user(USER_A)
    resp = client.delete("/account/me")
    assert resp.status_code == 200

    body = resp.json()
    assert body["auth_deleted"] is False
    # local data gone
    after = _count_all_user_a_rows()
    assert after["app_users"] == 0


def test_delete_me_unauthenticated_returns_401(client):
    """
    Without a valid auth token, DELETE /account/me must return 401.
    We achieve this by clearing dependency_overrides for get_current_user so the
    real JWT validation runs (and rejects the missing token).
    """
    # Remove the auth override so get_current_user checks for a real JWT
    app.dependency_overrides.pop(get_current_user, None)

    resp = client.delete("/account/me")
    assert resp.status_code == 401
