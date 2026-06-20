from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session

import models
import schemas
from auth import AuthUser, get_current_user
from database import get_db

router = APIRouter(prefix="/budget", tags=["Budget"])

DEFAULT_KEY = "default"
HARDCODED_DEFAULTS = {"fixed_pct": 50, "variable_pct": 30, "savings_pct": 20}


def _row_to_out(row: models.MonthBudget) -> schemas.MonthBudgetOut:
    return schemas.MonthBudgetOut(
        month_key=row.month_key,
        fixed_pct=row.fixed_pct,
        variable_pct=row.variable_pct,
        savings_pct=row.savings_pct,
        is_override=row.month_key != DEFAULT_KEY,
    )


def _get_default(db: Session, user_id: str) -> schemas.MonthBudgetOut:
    row = db.query(models.MonthBudget).filter(
        models.MonthBudget.user_id == user_id,
        models.MonthBudget.month_key == DEFAULT_KEY,
    ).first()
    if row:
        return _row_to_out(row)
    return schemas.MonthBudgetOut(
        month_key=DEFAULT_KEY,
        is_override=False,
        **HARDCODED_DEFAULTS,
    )


@router.get("/overrides", response_model=list[schemas.MonthBudgetOut])
def get_all_overrides(
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """Returns all per-month budget overrides for the current user (excludes default row)."""
    rows = db.query(models.MonthBudget).filter(
        models.MonthBudget.user_id == current_user.id,
        models.MonthBudget.month_key != DEFAULT_KEY,
    ).all()
    return [_row_to_out(row) for row in rows]


@router.get("/default", response_model=schemas.MonthBudgetOut)
def get_default_budget(
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """Returns the global default budget percentages for the current user."""
    return _get_default(db, current_user.id)


@router.put("/default", response_model=schemas.MonthBudgetOut)
def set_default_budget(
    payload: schemas.MonthBudgetSet,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """Creates or updates the global default budget percentages. Must sum to 100."""
    if payload.fixed_pct + payload.variable_pct + payload.savings_pct != 100:
        raise HTTPException(status_code=400, detail="Percentages must sum to 100.")
    row = db.query(models.MonthBudget).filter(
        models.MonthBudget.user_id == current_user.id,
        models.MonthBudget.month_key == DEFAULT_KEY,
    ).first()
    if row:
        row.fixed_pct    = payload.fixed_pct
        row.variable_pct = payload.variable_pct
        row.savings_pct  = payload.savings_pct
    else:
        row = models.MonthBudget(
            user_id=current_user.id,
            month_key=DEFAULT_KEY,
            fixed_pct=payload.fixed_pct,
            variable_pct=payload.variable_pct,
            savings_pct=payload.savings_pct,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return _row_to_out(row)


MONTH_KEY_PATTERN = r"^\d{4}-\d{2}$"


@router.get("/{month_key}", response_model=schemas.MonthBudgetOut)
def get_month_budget(
    month_key: str = Path(pattern=MONTH_KEY_PATTERN),  # SEC-04
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """Returns effective budget for a month: override if it exists, else global default."""
    row = db.query(models.MonthBudget).filter(
        models.MonthBudget.user_id == current_user.id,
        models.MonthBudget.month_key == month_key,
    ).first()
    if row:
        return _row_to_out(row)
    return _get_default(db, current_user.id)


@router.put("/{month_key}", response_model=schemas.MonthBudgetOut)
def set_month_budget(
    month_key: str = Path(pattern=MONTH_KEY_PATTERN),  # SEC-04
    payload: schemas.MonthBudgetSet = ...,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """Creates or updates a monthly budget override. Must sum to 100."""
    if month_key == DEFAULT_KEY:
        raise HTTPException(status_code=400, detail="Use PUT /budget/default for global defaults.")
    if payload.fixed_pct + payload.variable_pct + payload.savings_pct != 100:
        raise HTTPException(status_code=400, detail="Percentages must sum to 100.")
    row = db.query(models.MonthBudget).filter(
        models.MonthBudget.user_id == current_user.id,
        models.MonthBudget.month_key == month_key,
    ).first()
    if row:
        row.fixed_pct    = payload.fixed_pct
        row.variable_pct = payload.variable_pct
        row.savings_pct  = payload.savings_pct
    else:
        row = models.MonthBudget(
            user_id=current_user.id,
            month_key=month_key,
            fixed_pct=payload.fixed_pct,
            variable_pct=payload.variable_pct,
            savings_pct=payload.savings_pct,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return _row_to_out(row)


@router.delete("/{month_key}", status_code=204)
def delete_month_budget(
    month_key: str = Path(pattern=MONTH_KEY_PATTERN),  # SEC-04
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """Removes a monthly override so the month falls back to the global default."""
    if month_key == DEFAULT_KEY:
        raise HTTPException(status_code=400, detail="Cannot delete the global default.")
    row = db.query(models.MonthBudget).filter(
        models.MonthBudget.user_id == current_user.id,
        models.MonthBudget.month_key == month_key,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="No override found for this month.")
    db.delete(row)
    db.commit()
