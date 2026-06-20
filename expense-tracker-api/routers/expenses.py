from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from sqlalchemy.types import String
from uuid import uuid4

import models
import schemas
from auth import AuthUser, get_current_user
from database import get_db

router = APIRouter(prefix="/expenses", tags=["Expenses"])


def _get_or_404(db: Session, expense_id: str, user_id: str) -> models.Expense:
    """Return the expense if it exists and belongs to user_id; raise 404 otherwise."""
    expense = db.query(models.Expense).filter(
        models.Expense.id == expense_id,
        models.Expense.user_id == user_id,
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.get("/people", response_model=list[str])
def get_who_paid_values(
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """
    DEBT-05: Returns distinct non-empty who_paid values sorted alphabetically.
    Frontend uses this for datalist autocompletion to prevent typo-split chart segments.
    AUTH-01: scoped to the current user.
    """
    rows = (
        db.query(models.Expense.who_paid)
        .filter(
            models.Expense.user_id == current_user.id,
            models.Expense.who_paid != "",
        )
        .distinct()
        .order_by(models.Expense.who_paid)
        .all()
    )
    return [r.who_paid for r in rows]


@router.get("", response_model=list[schemas.ExpenseOut])
def get_expenses(
    month: str | None = None,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """
    Returns all expenses for the current user. Optionally filter by month using ?month=YYYY-MM.
    Sorted by date descending (mirrors ExpenseTable.jsx behaviour).
    AUTH-01: scoped to current_user.id.
    """
    q = db.query(models.Expense).filter(models.Expense.user_id == current_user.id)
    if month:
        # PG-safe 'YYYY-MM' extraction: LIKE has no operator on a DATE column in
        # PostgreSQL (worked only under SQLite's TEXT-stored dates).
        date_ym = func.substr(func.cast(models.Expense.date, String), 1, 7)
        q = q.filter(
            or_(
                models.Expense.billing_month == month,
                (models.Expense.billing_month == None) & (date_ym == month),
            )
        )
    return q.order_by(models.Expense.date.desc()).all()


@router.get("/{expense_id}", response_model=schemas.ExpenseOut)
def get_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    return _get_or_404(db, expense_id, current_user.id)


@router.post("", response_model=schemas.ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    expense = models.Expense(
        id=str(uuid4()),
        user_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.post("/bulk", response_model=list[schemas.ExpenseOut], status_code=status.HTTP_201_CREATED)
def bulk_create_expenses(
    payloads: list[schemas.ExpenseCreate],
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """
    Creates multiple expenses in a single transaction.
    Mirrors bulkAddExpenses() from useExpenses.js — used by the fixed-expense generator.
    AUTH-01: stamps user_id on each created expense.
    """
    expenses = [
        models.Expense(id=str(uuid4()), user_id=current_user.id, **p.model_dump())
        for p in payloads
    ]
    db.add_all(expenses)
    db.commit()
    for e in expenses:
        db.refresh(e)
    return expenses


@router.put("/{expense_id}", response_model=schemas.ExpenseOut)
def update_expense(
    expense_id: str,
    payload: schemas.ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    expense = _get_or_404(db, expense_id, current_user.id)
    for field, value in payload.model_dump().items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """
    STATE-05: Before deleting the expense, clear linked_expense_id on any debts
    that reference it. Both operations happen in one transaction.
    AUTH-01: Only the owner can delete; scoped debt clear is also per-user.
    """
    expense = _get_or_404(db, expense_id, current_user.id)
    # Clear dangling debt links in the same transaction (only this user's debts)
    db.query(models.Debt).filter(
        models.Debt.linked_expense_id == expense_id,
        models.Debt.user_id == current_user.id,
    ).update({"linked_expense_id": None})
    db.delete(expense)
    db.commit()
