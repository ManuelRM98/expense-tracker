from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(tags=["Categories & Cards"])

MIN_ITEMS = 1   # Must keep at least one category/card at all times


# ── Expense categories ─────────────────────────────────────────────────────────

@router.get("/categories/expenses", response_model=list[str])
def get_expense_categories(db: Session = Depends(get_db)):
    return [r.name for r in db.query(models.ExpenseCategory).all()]


@router.post("/categories/expenses", response_model=list[str], status_code=status.HTTP_201_CREATED)
def add_expense_category(payload: schemas.CategoryCreate, db: Session = Depends(get_db)):
    existing = db.query(models.ExpenseCategory).filter(
        models.ExpenseCategory.name == payload.name
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Category already exists")
    db.add(models.ExpenseCategory(name=payload.name))
    db.commit()
    return [r.name for r in db.query(models.ExpenseCategory).all()]


@router.delete("/categories/expenses/{name}", response_model=list[str])
def remove_expense_category(name: str, db: Session = Depends(get_db)):
    count = db.query(models.ExpenseCategory).count()
    if count <= MIN_ITEMS:
        raise HTTPException(status_code=400, detail="Cannot delete the last category")
    row = db.query(models.ExpenseCategory).filter(models.ExpenseCategory.name == name).first()
    if not row:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(row)
    db.commit()
    return [r.name for r in db.query(models.ExpenseCategory).all()]


# ── Saving categories ──────────────────────────────────────────────────────────

@router.get("/categories/savings", response_model=list[str])
def get_saving_categories(db: Session = Depends(get_db)):
    return [r.name for r in db.query(models.SavingCategory).all()]


@router.post("/categories/savings", response_model=list[str], status_code=status.HTTP_201_CREATED)
def add_saving_category(payload: schemas.CategoryCreate, db: Session = Depends(get_db)):
    existing = db.query(models.SavingCategory).filter(
        models.SavingCategory.name == payload.name
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Category already exists")
    db.add(models.SavingCategory(name=payload.name))
    db.commit()
    return [r.name for r in db.query(models.SavingCategory).all()]


@router.delete("/categories/savings/{name}", response_model=list[str])
def remove_saving_category(name: str, db: Session = Depends(get_db)):
    count = db.query(models.SavingCategory).count()
    if count <= MIN_ITEMS:
        raise HTTPException(status_code=400, detail="Cannot delete the last category")
    row = db.query(models.SavingCategory).filter(models.SavingCategory.name == name).first()
    if not row:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(row)
    db.commit()
    return [r.name for r in db.query(models.SavingCategory).all()]


# ── Card types ─────────────────────────────────────────────────────────────────

@router.get("/cards", response_model=list[schemas.CardOut])
def get_card_types(db: Session = Depends(get_db)):
    return db.query(models.CardType).all()


@router.post("/cards", response_model=list[schemas.CardOut], status_code=status.HTTP_201_CREATED)
def add_card_type(payload: schemas.CardCreate, db: Session = Depends(get_db)):
    existing = db.query(models.CardType).filter(models.CardType.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Card type already exists")
    db.add(models.CardType(name=payload.name, cut_off_day=payload.cut_off_day))
    db.commit()
    return db.query(models.CardType).all()


@router.patch("/cards/{name}", response_model=list[schemas.CardOut])
def update_card_cut_off(name: str, payload: schemas.CardCutOffUpdate, db: Session = Depends(get_db)):
    row = db.query(models.CardType).filter(models.CardType.name == name).first()
    if not row:
        raise HTTPException(status_code=404, detail="Card type not found")
    row.cut_off_day = payload.cut_off_day
    db.commit()
    return db.query(models.CardType).all()


@router.delete("/cards/{name}", response_model=list[schemas.CardOut])
def remove_card_type(name: str, db: Session = Depends(get_db)):
    count = db.query(models.CardType).count()
    if count <= MIN_ITEMS:
        raise HTTPException(status_code=400, detail="Cannot delete the last card type")
    row = db.query(models.CardType).filter(models.CardType.name == name).first()
    if not row:
        raise HTTPException(status_code=404, detail="Card type not found")
    db.delete(row)
    db.commit()
    return db.query(models.CardType).all()
