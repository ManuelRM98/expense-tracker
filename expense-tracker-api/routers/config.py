from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(prefix="/config", tags=["Config"])

ALLOWED_KEYS = {"base_salary", "salary_day"}


@router.get("", response_model=list[schemas.GlobalConfigOut])
def get_all_config(db: Session = Depends(get_db)):
    """Returns all global config entries."""
    return db.query(models.GlobalConfig).all()


@router.get("/{key}", response_model=schemas.GlobalConfigOut)
def get_config(key: str, db: Session = Depends(get_db)):
    """Returns a single config value by key."""
    row = db.query(models.GlobalConfig).filter(models.GlobalConfig.key == key).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Config key '{key}' not found")
    return row


@router.put("/{key}", response_model=schemas.GlobalConfigOut)
def set_config(key: str, payload: schemas.GlobalConfigSet, db: Session = Depends(get_db)):
    """Creates or updates a config value. Allowed keys: base_salary, salary_day."""
    if key not in ALLOWED_KEYS:
        raise HTTPException(status_code=400, detail=f"Unknown config key '{key}'. Allowed: {sorted(ALLOWED_KEYS)}")
    row = db.query(models.GlobalConfig).filter(models.GlobalConfig.key == key).first()
    if row:
        row.value = payload.value
    else:
        row = models.GlobalConfig(key=key, value=payload.value)
        db.add(row)
    db.commit()
    db.refresh(row)
    return row
