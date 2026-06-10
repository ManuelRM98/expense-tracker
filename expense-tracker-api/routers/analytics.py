from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from sqlalchemy.types import String

import models
import schemas
from database import get_db

router = APIRouter(prefix="/analytics", tags=["Analytics"])

MONTH_KEY_PATTERN = r"^\d{4}-\d{2}$"


def _billing_month_filter(model_cls, month_key: str):
    """
    BUG-03: Return the ORM filter expression that respects billing_month.
    An expense counts in billing_month when set; otherwise it falls back to date's month.
    Mirrors the OR logic in routers/expenses.py.
    """
    return or_(
        model_cls.billing_month == month_key,
        (model_cls.billing_month == None) & model_cls.date.like(f"{month_key}%"),
    )


def _month_summary(month_key: str, db: Session) -> schemas.MonthlySummary:
    """
    Replicates the monthly calculations in App.jsx:
      remaining  = income - totalExpenses - totalSavings
      card_total = sum of expenses where card_pay == "Yes"
      cash_total = totalExpenses - card_total

    BUG-03: Uses billing_month-aware filter for expenses.
    """
    expenses = db.query(models.Expense).filter(
        _billing_month_filter(models.Expense, month_key)
    ).all()
    savings = db.query(models.Saving).filter(
        models.Saving.date.like(f"{month_key}%")
    ).all()
    income_rows = db.query(models.IncomeEntry).filter(
        models.IncomeEntry.month_key == month_key
    ).all()

    income         = sum(r.amount_cop for r in income_rows)
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
def monthly_summary(
    month_key: str = Path(pattern=MONTH_KEY_PATTERN),  # SEC-04
    db: Session = Depends(get_db),
):
    """Full summary for a single month. Mirrors App.jsx summary calculations.
    BUG-03: Expenses are attributed to their billing_month when set."""
    return _month_summary(month_key, db)


@router.get("/annual/{year}", response_model=schemas.AnnualSummary)
def annual_summary(year: int, db: Session = Depends(get_db)):
    """
    Full year summary with per-month breakdown and top categories.
    Mirrors AnnualDashboard.jsx calculations.
    BUG-03: Expenses are attributed to their billing_month when set.
    """
    # BUG-03: fetch all expenses that "belong" to this year via billing_month OR date
    # We fetch all and group in Python to correctly attribute each expense.
    expenses = db.query(models.Expense).filter(
        or_(
            models.Expense.billing_month.like(f"{year}-%"),
            (models.Expense.billing_month == None) & models.Expense.date.like(f"{year}-%"),
        )
    ).all()
    savings = db.query(models.Saving).filter(
        models.Saving.date.like(f"{year}-%")
    ).all()
    income_rows = db.query(models.IncomeEntry).filter(
        models.IncomeEntry.month_key.like(f"{year}-%")
    ).all()

    total_expenses = sum(e.price for e in expenses)
    total_savings  = sum(s.price for s in savings)
    total_income   = sum(r.amount_cop for r in income_rows)

    # BUG-03: Group expenses by their effective month (billing_month ?? date[:7])
    exp_by_month: dict[str, int] = defaultdict(int)
    sav_by_month: dict[str, int] = defaultdict(int)
    for e in expenses:
        effective_month = e.billing_month if e.billing_month else str(e.date)[:7]
        exp_by_month[effective_month] += e.price
    for s in savings:
        sav_by_month[str(s.date)[:7]] += s.price

    # Sum per month — a month can hold multiple income entries
    income_map: dict[str, int] = defaultdict(int)
    for r in income_rows:
        income_map[r.month_key] += r.amount_cop

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

    PERF-02: Replaced 2×N per-month query loop with two bulk aggregation queries.
    BUG-03: Expenses are attributed to their billing_month when set.
    PostgreSQL-compatible: uses func.substr(func.cast(...)) instead of func.strftime.
    """
    today = date.today()

    # Build the list of month_key strings for the requested window
    window: list[str] = []
    for i in range(months - 1, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        window.append(f"{y}-{m:02d}")

    start_month = window[0]
    end_month   = window[-1]

    # ── Expenses: single aggregation grouped by effective month ──────────────
    # effective_month = billing_month when set, else date[:7].
    # PG-compatible month extraction: substr(cast(date, String), 1, 7)
    date_as_str = func.substr(func.cast(models.Expense.date, String), 1, 7)
    effective_month_expr = func.coalesce(models.Expense.billing_month, date_as_str)

    exp_rows = (
        db.query(
            effective_month_expr.label("month"),
            func.sum(models.Expense.price).label("total"),
        )
        .filter(effective_month_expr.between(start_month, end_month))
        .group_by("month")
        .all()
    )
    exp_map: dict[str, int] = {r.month: int(r.total) for r in exp_rows}

    # ── Savings: single aggregation grouped by date month ────────────────────
    sav_date_as_str = func.substr(func.cast(models.Saving.date, String), 1, 7)
    sav_rows = (
        db.query(
            sav_date_as_str.label("month"),
            func.sum(models.Saving.price).label("total"),
        )
        .filter(sav_date_as_str.between(start_month, end_month))
        .group_by("month")
        .all()
    )
    sav_map: dict[str, int] = {r.month: int(r.total) for r in sav_rows}

    return [
        schemas.TrendPoint(
            month_key=mk,
            total_expenses=exp_map.get(mk, 0),
            total_savings=sav_map.get(mk, 0),
        )
        for mk in window
    ]
