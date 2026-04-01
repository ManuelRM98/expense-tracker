from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _month_summary(month_key: str, db: Session) -> schemas.MonthlySummary:
    """
    Replicates the monthly calculations in App.jsx:
      remaining  = income - totalExpenses - totalSavings
      card_total = sum of expenses where card_pay == "Yes"
      cash_total = totalExpenses - card_total
    """
    expenses = db.query(models.Expense).filter(
        models.Expense.date.like(f"{month_key}%")
    ).all()
    savings = db.query(models.Saving).filter(
        models.Saving.date.like(f"{month_key}%")
    ).all()
    income_row = db.query(models.Income).filter(
        models.Income.month_key == month_key
    ).first()

    income         = income_row.amount if income_row else 0
    total_expenses = sum(e.price for e in expenses)
    total_savings  = sum(s.price for s in savings)
    card_total     = sum(e.price for e in expenses if e.card_pay == "Yes")

    by_category: dict[str, int] = defaultdict(int)
    for e in expenses:
        by_category[e.category] += e.price

    return schemas.MonthlySummary(
        month_key=month_key,
        total_expenses=total_expenses,
        total_savings=total_savings,
        income=income,
        remaining=income - total_expenses - total_savings,
        card_total=card_total,
        cash_total=total_expenses - card_total,
        by_category=[
            schemas.CategoryBreakdown(category=k, total=v)
            for k, v in sorted(by_category.items(), key=lambda x: -x[1])
        ],
    )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/monthly/{month_key}", response_model=schemas.MonthlySummary)
def monthly_summary(month_key: str, db: Session = Depends(get_db)):
    """Full summary for a single month. Mirrors App.jsx summary calculations."""
    return _month_summary(month_key, db)


@router.get("/annual/{year}", response_model=schemas.AnnualSummary)
def annual_summary(year: int, db: Session = Depends(get_db)):
    """
    Full year summary with per-month breakdown and top categories.
    Mirrors AnnualDashboard.jsx calculations.
    """
    expenses = db.query(models.Expense).filter(
        models.Expense.date.like(f"{year}-%")
    ).all()
    savings = db.query(models.Saving).filter(
        models.Saving.date.like(f"{year}-%")
    ).all()
    income_rows = db.query(models.Income).filter(
        models.Income.month_key.like(f"{year}-%")
    ).all()

    total_expenses = sum(e.price for e in expenses)
    total_savings  = sum(s.price for s in savings)
    total_income   = sum(r.amount for r in income_rows)

    # Group expenses by month for the breakdown table
    exp_by_month: dict[str, int] = defaultdict(int)
    sav_by_month: dict[str, int] = defaultdict(int)
    for e in expenses:
        exp_by_month[str(e.date)[:7]] += e.price
    for s in savings:
        sav_by_month[str(s.date)[:7]] += s.price

    income_map = {r.month_key: r.amount for r in income_rows}

    active_months = sorted(set(exp_by_month) | set(sav_by_month) | set(income_map))

    month_rows = [
        schemas.MonthRow(
            month_key=m,
            total_expenses=exp_by_month[m],
            total_savings=sav_by_month[m],
            income=income_map.get(m, 0),
            balance=income_map.get(m, 0) - exp_by_month[m] - sav_by_month[m],
        )
        for m in active_months
    ]

    # Top categories across the full year
    cat_totals: dict[str, int] = defaultdict(int)
    for e in expenses:
        cat_totals[e.category] += e.price

    top_categories = sorted(
        [schemas.CategoryBreakdown(category=k, total=v) for k, v in cat_totals.items()],
        key=lambda x: -x.total,
    )[:7]  # Top 7 — mirrors AnnualDashboard.jsx

    return schemas.AnnualSummary(
        year=year,
        total_expenses=total_expenses,
        total_savings=total_savings,
        total_income=total_income,
        avg_monthly_expenses=total_expenses / len(active_months) if active_months else 0.0,
        net_balance=total_income - total_expenses - total_savings,
        top_categories=top_categories,
        months=month_rows,
    )


@router.get("/trend", response_model=list[schemas.TrendPoint])
def expense_trend(months: int = 12, db: Session = Depends(get_db)):
    """
    Returns total expenses and savings for the last N months.
    Mirrors MonthlyTrendChart — defaults to last 12 months.
    """
    from datetime import date

    today = date.today()
    points: list[schemas.TrendPoint] = []

    for i in range(months - 1, -1, -1):
        # Subtract i months from today without external dependencies
        month = today.month - i
        year  = today.year
        while month <= 0:
            month += 12
            year  -= 1
        month_key = f"{year}-{month:02d}"

        exp_total = sum(
            e.price for e in db.query(models.Expense).filter(
                models.Expense.date.like(f"{month_key}%")
            ).all()
        )
        sav_total = sum(
            s.price for s in db.query(models.Saving).filter(
                models.Saving.date.like(f"{month_key}%")
            ).all()
        )
        points.append(schemas.TrendPoint(
            month_key=month_key,
            total_expenses=exp_total,
            total_savings=sav_total,
        ))

    return points
