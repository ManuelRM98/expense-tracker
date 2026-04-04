from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

import models
import schemas
from database import get_db

router = APIRouter(prefix="/income", tags=["Income"])


@router.get("", response_model=list[schemas.IncomeEntryOut])
def get_income_entries(month_key: str | None = None, year: int | None = None, db: Session = Depends(get_db)):
    """
    Returns income entries.
    Filter by ?month_key=YYYY-MM or ?year=YYYY.
    """
    q = db.query(models.IncomeEntry)
    if month_key:
        q = q.filter(models.IncomeEntry.month_key == month_key)
    elif year:
        q = q.filter(models.IncomeEntry.month_key.like(f"{year}-%"))
    return q.order_by(models.IncomeEntry.month_key, models.IncomeEntry.income_type).all()


@router.post("", response_model=schemas.IncomeEntryOut, status_code=201)
def create_income_entry(payload: schemas.IncomeEntryCreate, db: Session = Depends(get_db)):
    """Creates a new income entry for a given month."""
    entry = models.IncomeEntry(
        id=str(uuid.uuid4()),
        month_key=payload.month_key,
        income_type=payload.income_type,
        description=payload.description,
        currency=payload.currency,
        original_amount=payload.original_amount,
        exchange_rate=payload.exchange_rate,
        amount_cop=payload.amount_cop,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.put("/{entry_id}", response_model=schemas.IncomeEntryOut)
def update_income_entry(entry_id: str, payload: schemas.IncomeEntryUpdate, db: Session = Depends(get_db)):
    """Updates an existing income entry."""
    entry = db.query(models.IncomeEntry).filter(models.IncomeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Income entry not found")
    entry.income_type = payload.income_type
    entry.description = payload.description
    entry.currency = payload.currency
    entry.original_amount = payload.original_amount
    entry.exchange_rate = payload.exchange_rate
    entry.amount_cop = payload.amount_cop
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=204)
def delete_income_entry(entry_id: str, db: Session = Depends(get_db)):
    """Deletes an income entry."""
    entry = db.query(models.IncomeEntry).filter(models.IncomeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Income entry not found")
    db.delete(entry)
    db.commit()
