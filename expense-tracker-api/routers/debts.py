from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import uuid4
from datetime import date

import models
import schemas
from auth import AuthUser, get_current_user
from database import get_db

router = APIRouter(prefix="/debts", tags=["Debts"])


def _get_debt_or_404(db: Session, debt_id: str, user_id: str) -> models.Debt:
    """Return debt if it exists and is owned by user_id; raise 404 otherwise."""
    debt = db.query(models.Debt).filter(
        models.Debt.id == debt_id,
        models.Debt.user_id == user_id,
    ).first()
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    return debt


def _build_debt_out(debt: models.Debt, payments: list[models.DebtPayment]) -> schemas.DebtOut:
    total_paid = sum(p.amount for p in payments)
    return schemas.DebtOut(
        id=debt.id,
        direction=debt.direction,
        person=debt.person,
        description=debt.description,
        amount=debt.amount,
        linked_expense_id=debt.linked_expense_id,
        is_settled=debt.is_settled,
        created_date=debt.created_date,
        settled_date=debt.settled_date,
        payments=[schemas.DebtPaymentOut.model_validate(p) for p in payments],
        total_paid=total_paid,
        total_remaining=max(0, debt.amount - total_paid),
    )


def _get_payments(db: Session, debt_id: str) -> list[models.DebtPayment]:
    return (
        db.query(models.DebtPayment)
        .filter(models.DebtPayment.debt_id == debt_id)
        .order_by(models.DebtPayment.date.asc())
        .all()
    )


@router.get("", response_model=list[schemas.DebtOut])
def get_debts(
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """PERF-01: Single bulk payment query instead of N+1 per-debt queries.
    AUTH-01: scoped to current_user.id."""
    debts = (
        db.query(models.Debt)
        .filter(models.Debt.user_id == current_user.id)
        .order_by(models.Debt.created_date.desc())
        .all()
    )
    if not debts:
        return []

    debt_ids = [d.id for d in debts]
    all_payments = (
        db.query(models.DebtPayment)
        .filter(models.DebtPayment.debt_id.in_(debt_ids))
        .order_by(models.DebtPayment.date.asc())
        .all()
    )
    payments_by_debt: dict[str, list[models.DebtPayment]] = defaultdict(list)
    for p in all_payments:
        payments_by_debt[p.debt_id].append(p)

    return [_build_debt_out(d, payments_by_debt[d.id]) for d in debts]


@router.post("", response_model=schemas.DebtOut, status_code=status.HTTP_201_CREATED)
def create_debt(
    payload: schemas.DebtCreate,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    debt = models.Debt(
        id=str(uuid4()),
        user_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(debt)
    db.commit()
    db.refresh(debt)
    return _build_debt_out(debt, [])


@router.put("/{debt_id}", response_model=schemas.DebtOut)
def update_debt(
    debt_id: str,
    payload: schemas.DebtUpdate,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    debt = _get_debt_or_404(db, debt_id, current_user.id)
    for field, value in payload.model_dump().items():
        setattr(debt, field, value)
    db.commit()
    db.refresh(debt)
    return _build_debt_out(debt, _get_payments(db, debt_id))


@router.delete("/{debt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_debt(
    debt_id: str,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    debt = _get_debt_or_404(db, debt_id, current_user.id)
    db.query(models.DebtPayment).filter(models.DebtPayment.debt_id == debt_id).delete()
    db.delete(debt)
    db.commit()


@router.post("/{debt_id}/payments", response_model=schemas.DebtOut, status_code=status.HTTP_201_CREATED)
def add_payment(
    debt_id: str,
    payload: schemas.DebtPaymentCreate,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    debt = _get_debt_or_404(db, debt_id, current_user.id)
    payment = models.DebtPayment(id=str(uuid4()), debt_id=debt_id, **payload.model_dump())
    db.add(payment)
    db.commit()
    return _build_debt_out(debt, _get_payments(db, debt_id))


@router.patch("/{debt_id}/payments/{payment_id}", response_model=schemas.DebtOut)
def update_payment(
    debt_id: str,
    payment_id: str,
    payload: schemas.DebtPaymentUpdate,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    debt = _get_debt_or_404(db, debt_id, current_user.id)
    payment = db.query(models.DebtPayment).filter(
        models.DebtPayment.id == payment_id,
        models.DebtPayment.debt_id == debt_id,
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    for field, value in payload.model_dump().items():
        setattr(payment, field, value)
    db.commit()
    return _build_debt_out(debt, _get_payments(db, debt_id))


@router.delete("/{debt_id}/payments/{payment_id}", response_model=schemas.DebtOut)
def delete_payment(
    debt_id: str,
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    debt = _get_debt_or_404(db, debt_id, current_user.id)
    payment = db.query(models.DebtPayment).filter(
        models.DebtPayment.id == payment_id,
        models.DebtPayment.debt_id == debt_id,
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    db.delete(payment)
    db.commit()
    return _build_debt_out(debt, _get_payments(db, debt_id))
