from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(prefix="/income", tags=["Income"])


@router.get("/{month_key}", response_model=schemas.IncomeOut)
def get_income(month_key: str, db: Session = Depends(get_db)):
    """
    Returns income for a given month (YYYY-MM).
    Mirrors getIncome(yearMonth) from useExpenses.js — returns 0 if not set.
    """
    row = db.query(models.Income).filter(models.Income.month_key == month_key).first()
    if not row:
        return schemas.IncomeOut(month_key=month_key, amount=0)
    return row


@router.put("/{month_key}", response_model=schemas.IncomeOut)
def set_income(month_key: str, payload: schemas.IncomeSet, db: Session = Depends(get_db)):
    """
    Creates or updates the income for a given month.
    Mirrors setIncome(yearMonth, amount) from useExpenses.js.
    """
    row = db.query(models.Income).filter(models.Income.month_key == month_key).first()
    if row:
        row.amount = payload.amount
    else:
        row = models.Income(month_key=month_key, amount=payload.amount)
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("", response_model=list[schemas.IncomeOut])
def get_income_by_year(year: int | None = None, db: Session = Depends(get_db)):
    """Returns all income entries. Filter by year using ?year=2026."""
    q = db.query(models.Income)
    if year:
        q = q.filter(models.Income.month_key.like(f"{year}-%"))
    return q.order_by(models.Income.month_key).all()
