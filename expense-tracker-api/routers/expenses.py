from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from uuid import uuid4

import models
import schemas
from database import get_db

router = APIRouter(prefix="/expenses", tags=["Expenses"])


def _get_or_404(db: Session, expense_id: str) -> models.Expense:
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.get("", response_model=list[schemas.ExpenseOut])
def get_expenses(month: str | None = None, db: Session = Depends(get_db)):
    """
    Returns all expenses. Optionally filter by month using ?month=YYYY-MM.
    Sorted by date descending (mirrors ExpenseTable.jsx behaviour).
    """
    q = db.query(models.Expense)
    if month:
        q = q.filter(
            or_(
                models.Expense.billing_month == month,
                (models.Expense.billing_month == None) & models.Expense.date.like(f"{month}%"),
            )
        )
    return q.order_by(models.Expense.date.desc()).all()


@router.get("/{expense_id}", response_model=schemas.ExpenseOut)
def get_expense(expense_id: str, db: Session = Depends(get_db)):
    return _get_or_404(db, expense_id)


@router.post("", response_model=schemas.ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(payload: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    expense = models.Expense(id=str(uuid4()), **payload.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.post("/bulk", response_model=list[schemas.ExpenseOut], status_code=status.HTTP_201_CREATED)
def bulk_create_expenses(payloads: list[schemas.ExpenseCreate], db: Session = Depends(get_db)):
    """
    Creates multiple expenses in a single transaction.
    Mirrors bulkAddExpenses() from useExpenses.js — used by the fixed-expense generator.
    """
    expenses = [models.Expense(id=str(uuid4()), **p.model_dump()) for p in payloads]
    db.add_all(expenses)
    db.commit()
    for e in expenses:
        db.refresh(e)
    return expenses


@router.put("/{expense_id}", response_model=schemas.ExpenseOut)
def update_expense(expense_id: str, payload: schemas.ExpenseUpdate, db: Session = Depends(get_db)):
    expense = _get_or_404(db, expense_id)
    for field, value in payload.model_dump().items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: str, db: Session = Depends(get_db)):
    expense = _get_or_404(db, expense_id)
    db.delete(expense)
    db.commit()
