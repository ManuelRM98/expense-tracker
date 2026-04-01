from pydantic import BaseModel, Field
from typing import Literal
from datetime import date


# ── Expenses ───────────────────────────────────────────────────────────────────

class ExpenseBase(BaseModel):
    date:      date
    desc:      str
    category:  str
    price:     int   = Field(gt=0, description="Amount in Colombian pesos")
    card_pay:  Literal["Yes", "No"]
    who_paid:  str
    card_type: str   = ""
    cost_type: Literal["fixed", "variable"] = "variable"

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(ExpenseBase):
    pass

class ExpenseOut(ExpenseBase):
    id: str
    class Config:
        from_attributes = True


# ── Savings ────────────────────────────────────────────────────────────────────

class SavingBase(BaseModel):
    date:      date
    desc:      str
    category:  str
    price:     int  = Field(gt=0)
    card_pay:  Literal["Yes", "No"]
    card_type: str  = ""

class SavingCreate(SavingBase):
    pass

class SavingUpdate(SavingBase):
    pass

class SavingOut(SavingBase):
    id: str
    class Config:
        from_attributes = True


# ── Income ─────────────────────────────────────────────────────────────────────

class IncomeSet(BaseModel):
    amount: int = Field(ge=0)

class IncomeOut(BaseModel):
    month_key: str
    amount:    int
    class Config:
        from_attributes = True


# ── Fixed Expense Templates ────────────────────────────────────────────────────

class TemplateBase(BaseModel):
    name:         str
    amount:       int  = Field(gt=0)
    category:     str
    day_of_month: int  = Field(ge=1, le=31)
    who_paid:     str
    card_pay:     Literal["Yes", "No"]
    card_type:    str  = ""

class TemplateCreate(TemplateBase):
    pass

class TemplateUpdate(TemplateBase):
    pass

class TemplateOut(TemplateBase):
    id:         str
    is_active:  bool
    created_at: str   # "YYYY-MM"
    class Config:
        from_attributes = True


# ── Categories & Cards ─────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str

class CategoryOut(BaseModel):
    name: str
    class Config:
        from_attributes = True


# ── Analytics ──────────────────────────────────────────────────────────────────

class CategoryBreakdown(BaseModel):
    category: str
    total:    int

class MonthlySummary(BaseModel):
    month_key:      str
    total_expenses: int
    total_savings:  int
    income:         int
    remaining:      int
    card_total:     int
    cash_total:     int
    by_category:    list[CategoryBreakdown]

class MonthRow(BaseModel):
    month_key:      str
    total_expenses: int
    total_savings:  int
    income:         int
    balance:        int

class AnnualSummary(BaseModel):
    year:                 int
    total_expenses:       int
    total_savings:        int
    total_income:         int
    avg_monthly_expenses: float
    net_balance:          int
    top_categories:       list[CategoryBreakdown]
    months:               list[MonthRow]

class TrendPoint(BaseModel):
    month_key:      str
    total_expenses: int
    total_savings:  int
