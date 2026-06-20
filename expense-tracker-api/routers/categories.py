from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from auth import AuthUser, get_current_user
from database import get_db

router = APIRouter(tags=["Categories & Cards"])

MIN_ITEMS = 1   # Must keep at least one category/card at all times


# ── Expense categories ─────────────────────────────────────────────────────────

@router.get("/categories/expenses", response_model=list[schemas.CategoryOut])
def get_expense_categories(
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    return (
        db.query(models.ExpenseCategory)
        .filter(models.ExpenseCategory.user_id == current_user.id)
        .all()
    )


@router.post("/categories/expenses", response_model=list[schemas.CategoryOut], status_code=status.HTTP_201_CREATED)
def add_expense_category(
    payload: schemas.CategoryCreate,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    existing = db.query(models.ExpenseCategory).filter(
        models.ExpenseCategory.user_id == current_user.id,
        models.ExpenseCategory.name == payload.name,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Category already exists")
    db.add(models.ExpenseCategory(user_id=current_user.id, name=payload.name, color=payload.color))
    db.commit()
    return (
        db.query(models.ExpenseCategory)
        .filter(models.ExpenseCategory.user_id == current_user.id)
        .all()
    )


@router.put("/categories/expenses/{name}", response_model=list[schemas.CategoryOut])
def rename_expense_category(
    name: str,
    payload: schemas.CategoryRename,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """
    QUAL-07: Rename an expense category in one transaction, cascading the new name
    into all expenses and fixed-expense templates that reference the old name.
    AUTH-01: scoped to current user.
    """
    row = db.query(models.ExpenseCategory).filter(
        models.ExpenseCategory.user_id == current_user.id,
        models.ExpenseCategory.name == name,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Category not found")
    if db.query(models.ExpenseCategory).filter(
        models.ExpenseCategory.user_id == current_user.id,
        models.ExpenseCategory.name == payload.new_name,
    ).first():
        raise HTTPException(status_code=409, detail="Target category name already exists")

    # Cascade update to referencing rows (scoped to this user)
    db.query(models.Expense).filter(
        models.Expense.user_id == current_user.id,
        models.Expense.category == name,
    ).update({"category": payload.new_name})
    db.query(models.FixedExpenseTemplate).filter(
        models.FixedExpenseTemplate.user_id == current_user.id,
        models.FixedExpenseTemplate.category == name,
    ).update({"category": payload.new_name})
    row.name = payload.new_name
    db.commit()
    return (
        db.query(models.ExpenseCategory)
        .filter(models.ExpenseCategory.user_id == current_user.id)
        .all()
    )


@router.patch("/categories/expenses/{name}", response_model=list[schemas.CategoryOut])
def update_expense_category(
    name: str,
    payload: schemas.CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """FEAT-12: partial PATCH — only fields present in the request body are updated."""
    row = db.query(models.ExpenseCategory).filter(
        models.ExpenseCategory.user_id == current_user.id,
        models.ExpenseCategory.name == name,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    return (
        db.query(models.ExpenseCategory)
        .filter(models.ExpenseCategory.user_id == current_user.id)
        .all()
    )


@router.delete("/categories/expenses/{name}", response_model=list[schemas.CategoryOut])
def remove_expense_category(
    name: str,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    count = db.query(models.ExpenseCategory).filter(
        models.ExpenseCategory.user_id == current_user.id
    ).count()
    if count <= MIN_ITEMS:
        raise HTTPException(status_code=400, detail="Cannot delete the last category")
    row = db.query(models.ExpenseCategory).filter(
        models.ExpenseCategory.user_id == current_user.id,
        models.ExpenseCategory.name == name,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(row)
    db.commit()
    return (
        db.query(models.ExpenseCategory)
        .filter(models.ExpenseCategory.user_id == current_user.id)
        .all()
    )


# ── Saving categories ──────────────────────────────────────────────────────────

@router.get("/categories/savings", response_model=list[schemas.CategoryOut])
def get_saving_categories(
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    return (
        db.query(models.SavingCategory)
        .filter(models.SavingCategory.user_id == current_user.id)
        .all()
    )


@router.post("/categories/savings", response_model=list[schemas.CategoryOut], status_code=status.HTTP_201_CREATED)
def add_saving_category(
    payload: schemas.CategoryCreate,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    existing = db.query(models.SavingCategory).filter(
        models.SavingCategory.user_id == current_user.id,
        models.SavingCategory.name == payload.name,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Category already exists")
    db.add(models.SavingCategory(user_id=current_user.id, name=payload.name, color=payload.color))
    db.commit()
    return (
        db.query(models.SavingCategory)
        .filter(models.SavingCategory.user_id == current_user.id)
        .all()
    )


@router.put("/categories/savings/{name}", response_model=list[schemas.CategoryOut])
def rename_saving_category(
    name: str,
    payload: schemas.CategoryRename,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """
    QUAL-07: Rename a saving category in one transaction.
    AUTH-01: scoped to current user.
    """
    row = db.query(models.SavingCategory).filter(
        models.SavingCategory.user_id == current_user.id,
        models.SavingCategory.name == name,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Category not found")
    if db.query(models.SavingCategory).filter(
        models.SavingCategory.user_id == current_user.id,
        models.SavingCategory.name == payload.new_name,
    ).first():
        raise HTTPException(status_code=409, detail="Target category name already exists")

    db.query(models.Saving).filter(
        models.Saving.user_id == current_user.id,
        models.Saving.category == name,
    ).update({"category": payload.new_name})
    row.name = payload.new_name
    db.commit()
    return (
        db.query(models.SavingCategory)
        .filter(models.SavingCategory.user_id == current_user.id)
        .all()
    )


@router.patch("/categories/savings/{name}", response_model=list[schemas.CategoryOut])
def update_saving_category(
    name: str,
    payload: schemas.CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """FEAT-12: partial PATCH — only fields present in the request body are updated."""
    row = db.query(models.SavingCategory).filter(
        models.SavingCategory.user_id == current_user.id,
        models.SavingCategory.name == name,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    return (
        db.query(models.SavingCategory)
        .filter(models.SavingCategory.user_id == current_user.id)
        .all()
    )


@router.delete("/categories/savings/{name}", response_model=list[schemas.CategoryOut])
def remove_saving_category(
    name: str,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    count = db.query(models.SavingCategory).filter(
        models.SavingCategory.user_id == current_user.id
    ).count()
    if count <= MIN_ITEMS:
        raise HTTPException(status_code=400, detail="Cannot delete the last category")
    row = db.query(models.SavingCategory).filter(
        models.SavingCategory.user_id == current_user.id,
        models.SavingCategory.name == name,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(row)
    db.commit()
    return (
        db.query(models.SavingCategory)
        .filter(models.SavingCategory.user_id == current_user.id)
        .all()
    )


# ── Card types ─────────────────────────────────────────────────────────────────

@router.get("/cards", response_model=list[schemas.CardOut])
def get_card_types(
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    return (
        db.query(models.CardType)
        .filter(models.CardType.user_id == current_user.id)
        .all()
    )


@router.post("/cards", response_model=list[schemas.CardOut], status_code=status.HTTP_201_CREATED)
def add_card_type(
    payload: schemas.CardCreate,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    existing = db.query(models.CardType).filter(
        models.CardType.user_id == current_user.id,
        models.CardType.name == payload.name,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Card type already exists")
    db.add(models.CardType(
        user_id=current_user.id,
        name=payload.name,
        cut_off_day=payload.cut_off_day,
        color=payload.color,
    ))
    db.commit()
    return (
        db.query(models.CardType)
        .filter(models.CardType.user_id == current_user.id)
        .all()
    )


@router.put("/cards/{name}/rename", response_model=list[schemas.CardOut])
def rename_card_type(
    name: str,
    payload: schemas.CardRename,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """
    QUAL-07: Rename a card type in one transaction, cascading the new name.
    AUTH-01: scoped to current user.
    """
    row = db.query(models.CardType).filter(
        models.CardType.user_id == current_user.id,
        models.CardType.name == name,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Card type not found")
    if db.query(models.CardType).filter(
        models.CardType.user_id == current_user.id,
        models.CardType.name == payload.new_name,
    ).first():
        raise HTTPException(status_code=409, detail="Target card type name already exists")

    db.query(models.Expense).filter(
        models.Expense.user_id == current_user.id,
        models.Expense.card_type == name,
    ).update({"card_type": payload.new_name})
    db.query(models.FixedExpenseTemplate).filter(
        models.FixedExpenseTemplate.user_id == current_user.id,
        models.FixedExpenseTemplate.card_type == name,
    ).update({"card_type": payload.new_name})
    row.name = payload.new_name
    db.commit()
    return (
        db.query(models.CardType)
        .filter(models.CardType.user_id == current_user.id)
        .all()
    )


@router.patch("/cards/{name}", response_model=list[schemas.CardOut])
def update_card(
    name: str,
    payload: schemas.CardUpdate,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """FEAT-11: partial PATCH — only fields present in the request body are updated."""
    row = db.query(models.CardType).filter(
        models.CardType.user_id == current_user.id,
        models.CardType.name == name,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Card type not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    return (
        db.query(models.CardType)
        .filter(models.CardType.user_id == current_user.id)
        .all()
    )


@router.delete("/cards/{name}", response_model=list[schemas.CardOut])
def remove_card_type(
    name: str,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    count = db.query(models.CardType).filter(
        models.CardType.user_id == current_user.id
    ).count()
    if count <= MIN_ITEMS:
        raise HTTPException(status_code=400, detail="Cannot delete the last card type")
    row = db.query(models.CardType).filter(
        models.CardType.user_id == current_user.id,
        models.CardType.name == name,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Card type not found")
    db.delete(row)
    db.commit()
    return (
        db.query(models.CardType)
        .filter(models.CardType.user_id == current_user.id)
        .all()
    )
