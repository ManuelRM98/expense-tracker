from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.types import String
from uuid import uuid4

import models
import schemas
from auth import AuthUser, get_current_user
from database import get_db

router = APIRouter(prefix="/savings", tags=["Savings"])


def _get_or_404(db: Session, saving_id: str, user_id: str) -> models.Saving:
    saving = db.query(models.Saving).filter(
        models.Saving.id == saving_id,
        models.Saving.user_id == user_id,
    ).first()
    if not saving:
        raise HTTPException(status_code=404, detail="Saving not found")
    return saving


@router.get("", response_model=list[schemas.SavingOut])
def get_savings(
    month: str | None = None,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """Returns all savings for the current user. Filter by month using ?month=YYYY-MM."""
    q = db.query(models.Saving).filter(models.Saving.user_id == current_user.id)
    if month:
        date_ym = func.substr(func.cast(models.Saving.date, String), 1, 7)
        q = q.filter(date_ym == month)
    return q.order_by(models.Saving.date.desc()).all()


@router.get("/{saving_id}", response_model=schemas.SavingOut)
def get_saving(
    saving_id: str,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    return _get_or_404(db, saving_id, current_user.id)


@router.post("", response_model=schemas.SavingOut, status_code=status.HTTP_201_CREATED)
def create_saving(
    payload: schemas.SavingCreate,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    saving = models.Saving(
        id=str(uuid4()),
        user_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(saving)
    db.commit()
    db.refresh(saving)
    return saving


@router.put("/{saving_id}", response_model=schemas.SavingOut)
def update_saving(
    saving_id: str,
    payload: schemas.SavingUpdate,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    saving = _get_or_404(db, saving_id, current_user.id)
    for field, value in payload.model_dump().items():
        setattr(saving, field, value)
    db.commit()
    db.refresh(saving)
    return saving


@router.delete("/{saving_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saving(
    saving_id: str,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    saving = _get_or_404(db, saving_id, current_user.id)
    db.delete(saving)
    db.commit()
