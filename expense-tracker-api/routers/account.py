"""
AUTH-01: Account management router.

GET    /account/me  — return the current user's profile
PUT    /account/me  — update display_name
DELETE /account/me  — FEAT-14: permanently delete the calling user's account
                      (cascade-deletes all owned data, then removes the Supabase
                       Auth identity via the Admin API)

On first authenticated request for a new Supabase sub: upsert AppUser row
AND seed default categories/cards for that user.
"""
import logging
import os

import httpx
from fastapi import APIRouter, Depends, Response
from fastapi.responses import JSONResponse
from sqlalchemy import delete as sa_delete
from sqlalchemy.orm import Session

import models
import schemas
from auth import AuthUser, get_current_user
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/account", tags=["Account"])

# The UUID assigned to all pre-existing data by the backfill migration.
# Keep in sync with MOCK_USER_ID in the Alembic migration.
MOCK_USER_ID = "00000000-0000-0000-0000-000000000001"


# ── Default seeds (per-user) ──────────────────────────────────────────────────

def seed_defaults_for_user(user_id: str, db: Session) -> None:
    """Seed default categories and card types for a new user if they have none."""
    if db.query(models.ExpenseCategory).filter(
        models.ExpenseCategory.user_id == user_id
    ).count() == 0:
        defaults = ["Food", "Transport", "Entertainment", "Health", "Shopping", "Services"]
        db.add_all([
            models.ExpenseCategory(user_id=user_id, name=n)
            for n in defaults
        ])

    if db.query(models.SavingCategory).filter(
        models.SavingCategory.user_id == user_id
    ).count() == 0:
        db.add(models.SavingCategory(user_id=user_id, name="Investment"))

    if db.query(models.CardType).filter(
        models.CardType.user_id == user_id
    ).count() == 0:
        db.add(models.CardType(user_id=user_id, name="Davivienda"))

    db.commit()


def get_or_create_user(auth_user: AuthUser, db: Session) -> models.AppUser:
    """
    Upsert the AppUser row for this Supabase sub.
    On first encounter: create the row and seed defaults.
    """
    row = db.query(models.AppUser).filter(models.AppUser.id == auth_user.id).first()
    if row is None:
        row = models.AppUser(
            id=auth_user.id,
            email=auth_user.email,
            # Seed from the name captured at signup (Supabase user_metadata), if any.
            display_name=auth_user.display_name,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        # Seed default categories and card for brand-new users
        seed_defaults_for_user(auth_user.id, db)

    return row


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/me", response_model=schemas.AppUserOut)
def get_me(
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the current user's profile. Creates the AppUser row on first call."""
    row = get_or_create_user(current_user, db)
    return row


@router.put("/me", response_model=schemas.AppUserOut)
def update_me(
    payload: schemas.AppUserUpdate,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's display_name."""
    row = get_or_create_user(current_user, db)
    row.display_name = payload.display_name
    db.commit()
    db.refresh(row)
    return row


# ── FEAT-14: Account deletion ─────────────────────────────────────────────────

def delete_supabase_auth_user(user_id: str) -> bool:
    """
    FEAT-14: Remove the Supabase Auth identity for the given user_id.

    Calls DELETE {SUPABASE_URL}/auth/v1/admin/users/{user_id} using the
    service-role key (SUPABASE_SERVICE_ROLE_KEY env var).

    Returns True on 2xx or 404 (user already gone — treat as success).
    Returns False when:
      - SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL are missing/empty
      - Any HTTP error (non-2xx and non-404)
      - Any network/connection failure

    Must NEVER raise — all errors are caught and logged, then False is returned
    so the endpoint can report auth_deleted: false without 500-ing.
    """
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not service_role_key:
        logger.warning(
            "delete_supabase_auth_user: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY "
            "not configured — skipping auth identity deletion for user %s",
            user_id,
        )
        return False

    url = f"{supabase_url}/auth/v1/admin/users/{user_id}"
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
    }

    try:
        resp = httpx.delete(url, headers=headers, timeout=10.0)
        if resp.status_code in (200, 204, 404):
            return True
        logger.warning(
            "delete_supabase_auth_user: Admin API returned %s for user %s — body: %s",
            resp.status_code,
            user_id,
            resp.text[:200],
        )
        return False
    except Exception as exc:
        logger.warning(
            "delete_supabase_auth_user: network/unexpected error for user %s: %s",
            user_id,
            exc,
        )
        return False


def _cascade_delete_user(user_id: str, db: Session) -> None:
    """
    FEAT-14: Delete every row owned by user_id in FK-safe order within a single
    transaction.  Children before parents, app_users row last.

    Uses bulk DELETE statements (sa_delete) executed sequentially so PostgreSQL
    FK constraints are satisfied — each statement completes before the next one
    starts, unlike the ORM's unit-of-work which batches and may reorder.

    Order (from spec):
      debt_payments → debts → fixed_expense_logs → fixed_expense_templates
      → income_entries → expenses → savings → month_budgets → global_config
      → expense_categories → saving_categories → card_types → app_users
    """
    # debt_payments reference debts.id — use a scalar subquery to scope by user
    debt_ids_subq = (
        db.query(models.Debt.id).filter(models.Debt.user_id == user_id).scalar_subquery()
    )
    db.execute(
        sa_delete(models.DebtPayment).where(
            models.DebtPayment.debt_id.in_(debt_ids_subq)
        )
    )

    db.execute(sa_delete(models.Debt).where(models.Debt.user_id == user_id))
    db.execute(sa_delete(models.FixedExpenseLog).where(models.FixedExpenseLog.user_id == user_id))
    db.execute(sa_delete(models.FixedExpenseTemplate).where(models.FixedExpenseTemplate.user_id == user_id))
    db.execute(sa_delete(models.IncomeEntry).where(models.IncomeEntry.user_id == user_id))
    db.execute(sa_delete(models.Expense).where(models.Expense.user_id == user_id))
    db.execute(sa_delete(models.Saving).where(models.Saving.user_id == user_id))
    db.execute(sa_delete(models.MonthBudget).where(models.MonthBudget.user_id == user_id))
    db.execute(sa_delete(models.GlobalConfig).where(models.GlobalConfig.user_id == user_id))
    db.execute(sa_delete(models.ExpenseCategory).where(models.ExpenseCategory.user_id == user_id))
    db.execute(sa_delete(models.SavingCategory).where(models.SavingCategory.user_id == user_id))
    db.execute(sa_delete(models.CardType).where(models.CardType.user_id == user_id))
    # app_users row last — everything else FKs here
    db.execute(sa_delete(models.AppUser).where(models.AppUser.id == user_id))

    db.commit()


@router.delete(
    "/me",
    status_code=204,
    summary="Delete own account",
    description=(
        "FEAT-14: Permanently deletes the calling user's account. "
        "Cascade-deletes all owned data in a single transaction, then removes "
        "the Supabase Auth identity via the Admin API. "
        "Returns 204 when the auth identity was deleted; "
        "200 with auth_deleted=false when local data is gone but the auth "
        "identity could not be removed (key missing or Admin API error)."
    ),
)
def delete_me(
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """FEAT-14: Delete the calling user's account and all their data."""
    user_id = current_user.id

    # Step 1: cascade-delete all local data in FK-safe order, single transaction.
    _cascade_delete_user(user_id, db)

    # Step 2: attempt to remove the Supabase Auth identity.
    auth_deleted = delete_supabase_auth_user(user_id)

    if auth_deleted:
        # 204 No Content — both local data and auth identity removed.
        return Response(status_code=204)

    # 200 OK — local data deleted but auth identity could not be removed.
    return JSONResponse(
        status_code=200,
        content={
            "detail": (
                "Your account data has been permanently deleted. "
                "However, the authentication identity could not be removed automatically "
                "(service-role key not configured or Admin API error). "
                "You may need to contact support for final cleanup."
            ),
            "auth_deleted": False,
        },
    )
