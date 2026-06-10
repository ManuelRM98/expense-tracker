import calendar
from datetime import date
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(prefix="/fixed-expenses", tags=["Fixed Expenses"])


def _get_or_404(db: Session, template_id: str) -> models.FixedExpenseTemplate:
    t = db.query(models.FixedExpenseTemplate).filter(
        models.FixedExpenseTemplate.id == template_id
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    return t


# ── Template CRUD ──────────────────────────────────────────────────────────────

@router.get("", response_model=list[schemas.TemplateOut])
def get_templates(db: Session = Depends(get_db)):
    return db.query(models.FixedExpenseTemplate).all()


@router.post("", response_model=schemas.TemplateOut, status_code=status.HTTP_201_CREATED)
def create_template(payload: schemas.TemplateCreate, db: Session = Depends(get_db)):
    today = date.today()
    created_at = today.strftime("%Y-%m")   # "YYYY-MM" — prevents backfill before creation
    template = models.FixedExpenseTemplate(
        id=str(uuid4()),
        is_active=True,
        created_at=created_at,
        **payload.model_dump(),
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.put("/{template_id}", response_model=schemas.TemplateOut)
def update_template(template_id: str, payload: schemas.TemplateUpdate, db: Session = Depends(get_db)):
    template = _get_or_404(db, template_id)
    for field, value in payload.model_dump().items():
        setattr(template, field, value)
    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: str, db: Session = Depends(get_db)):
    template = _get_or_404(db, template_id)
    db.delete(template)
    db.commit()


@router.patch("/{template_id}/toggle", response_model=schemas.TemplateOut)
def toggle_template(template_id: str, db: Session = Depends(get_db)):
    """Activates or deactivates a template. Mirrors toggleTemplate() from useFixedExpenses.js."""
    template = _get_or_404(db, template_id)
    template.is_active = not template.is_active
    db.commit()
    db.refresh(template)
    return template


# ── Auto-generation ────────────────────────────────────────────────────────────

MONTH_KEY_PATTERN = r"^\d{4}-\d{2}$"


@router.post("/generate/{month_key}", response_model=list[schemas.ExpenseOut])
def generate_for_month(
    month_key: str = Path(pattern=MONTH_KEY_PATTERN),  # SEC-04: reject malformed month keys
    db: Session = Depends(get_db),
):
    """
    Server-side port of generateForMonth() from useFixedExpenses.js.

    Rules (identical to the frontend logic):
    - Future months are skipped entirely.
    - Current month: only generates if template.day_of_month <= today's day.
    - Past months: always generates.
    - Respects template.created_at: no backfill before the template existed.
    - Checks the generation log to prevent duplicates.
    - Clamps day_of_month to the real last day of the target month
      (e.g. day=31 in February → Feb 28/29).
    """
    today = date.today()
    current_month_key = today.strftime("%Y-%m")

    if month_key > current_month_key:
        return []   # Never pre-fill future months

    year, month = map(int, month_key.split("-"))
    is_current_month = month_key == current_month_key

    active_templates = db.query(models.FixedExpenseTemplate).filter(
        models.FixedExpenseTemplate.is_active == True
    ).all()

    generated: list[models.Expense] = []

    for template in active_templates:
        # Skip months before this template was created
        if month_key < template.created_at:
            continue

        log_key = f"{template.id}_{month_key}"

        # Skip if this (template, month) pair was already processed
        already_logged = db.query(models.FixedExpenseLog).filter(
            models.FixedExpenseLog.log_key == log_key
        ).first()
        if already_logged:
            continue

        # For the current month, wait until the scheduled day has arrived
        if is_current_month and template.day_of_month > today.day:
            continue

        # Clamp day to the real last day of the target month
        max_day = calendar.monthrange(year, month)[1]
        actual_day = min(template.day_of_month, max_day)

        expense = models.Expense(
            id=str(uuid4()),
            date=date(year, month, actual_day),
            desc=template.name,
            category=template.category,
            price=template.amount,
            card_pay=template.card_pay,
            who_paid=template.who_paid,
            card_type=template.card_type,
            cost_type="fixed",
        )
        db.add(expense)
        db.add(models.FixedExpenseLog(log_key=log_key))
        generated.append(expense)

    # STATE-02: Wrap commit in IntegrityError guard for race-safe idempotency.
    # If two concurrent requests race to insert the same log_key, the second
    # will get a unique-constraint violation — return empty list (already done).
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return []

    for e in generated:
        db.refresh(e)

    return generated


@router.get("/log", response_model=list[str])
def get_generation_log(db: Session = Depends(get_db)):
    """Returns all log keys — useful for debugging and auditing."""
    return [row.log_key for row in db.query(models.FixedExpenseLog).all()]
