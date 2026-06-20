"""
AUTH-01: Account management router.

GET  /account/me  — return the current user's profile
PUT  /account/me  — update display_name

On first authenticated request for a new Supabase sub: upsert AppUser row
AND seed default categories/cards for that user.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas
from auth import AuthUser, get_current_user
from database import get_db

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
            display_name=None,
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
