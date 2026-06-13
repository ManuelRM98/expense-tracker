from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.types import String
from uuid import uuid4

import models
import schemas
from database import get_db

router = APIRouter(prefix="/savings", tags=["Savings"])


def _get_or_404(db: Session, saving_id: str) -> models.Saving:
    saving = db.query(models.Saving).filter(models.Saving.id == saving_id).first()
    if not saving:
        raise HTTPException(status_code=404, detail="Saving not found")
    return saving


@router.get("", response_model=list[schemas.SavingOut])
def get_savings(month: str | None = None, db: Session = Depends(get_db)):
    """Returns all savings. Filter by month using ?month=YYYY-MM."""
    q = db.query(models.Saving)
    if month:
        # PG-safe 'YYYY-MM' extraction: LIKE has no operator on a DATE column in
        # PostgreSQL (worked only under SQLite's TEXT-stored dates).
        date_ym = func.substr(func.cast(models.Saving.date, String), 1, 7)
        q = q.filter(date_ym == month)
    return q.order_by(models.Saving.date.desc()).all()


@router.get("/{saving_id}", response_model=schemas.SavingOut)
def get_saving(saving_id: str, db: Session = Depends(get_db)):
    return _get_or_404(db, saving_id)


@router.post("", response_model=schemas.SavingOut, status_code=status.HTTP_201_CREATED)
def create_saving(payload: schemas.SavingCreate, db: Session = Depends(get_db)):
    saving = models.Saving(id=str(uuid4()), **payload.model_dump())
    db.add(saving)
    db.commit()
    db.refresh(saving)
    return saving


@router.put("/{saving_id}", response_model=schemas.SavingOut)
def update_saving(saving_id: str, payload: schemas.SavingUpdate, db: Session = Depends(get_db)):
    saving = _get_or_404(db, saving_id)
    for field, value in payload.model_dump().items():
        setattr(saving, field, value)
    db.commit()
    db.refresh(saving)
    return saving


@router.delete("/{saving_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saving(saving_id: str, db: Session = Depends(get_db)):
    saving = _get_or_404(db, saving_id)
    db.delete(saving)
    db.commit()
