from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import date


# ── Expenses ───────────────────────────────────────────────────────────────────

class ExpenseBase(BaseModel):
    date:          date
    desc:          str
    category:      str
    price:         int   = Field(gt=0, description="Amount in Colombian pesos")
    card_pay:      Literal["Yes", "No"]
    who_paid:      str
    card_type:     str   = ""
    cost_type:     Literal["fixed", "variable"] = "variable"
    billing_month: str | None = None   # "YYYY-MM"; None = use date for month filtering

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


# ── Global Config ──────────────────────────────────────────────────────────────

class GlobalConfigOut(BaseModel):
    key:   str
    value: str
    class Config:
        from_attributes = True

class GlobalConfigSet(BaseModel):
    value: str


# ── Income Entries ─────────────────────────────────────────────────────────────

class IncomeEntryCreate(BaseModel):
    month_key:       str
    income_type:     Literal["salary", "bonus", "other"]
    description:     str
    currency:        Literal["COP", "USD"] = "COP"
    original_amount: int | None = None    # only when currency=USD
    exchange_rate:   int | None = None    # TRM, only when currency=USD
    amount_cop:      int = Field(gt=0)

class IncomeEntryUpdate(BaseModel):
    income_type:     Literal["salary", "bonus", "other"]
    description:     str
    currency:        Literal["COP", "USD"] = "COP"
    original_amount: int | None = None
    exchange_rate:   int | None = None
    amount_cop:      int = Field(gt=0)

class IncomeEntryOut(BaseModel):
    id:              str
    month_key:       str
    income_type:     str
    description:     str
    currency:        str
    original_amount: int | None
    exchange_rate:   int | None
    amount_cop:      int
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

class CardCreate(BaseModel):
    name:        str
    cut_off_day: int | None = None   # 1-31 or None

class CardCutOffUpdate(BaseModel):
    cut_off_day: int | None = None

class CardOut(BaseModel):
    name:        str
    cut_off_day: int | None
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


# ── Debts ──────────────────────────────────────────────────────────────────────

class DebtPaymentCreate(BaseModel):
    amount:  int  = Field(gt=0)
    date:    date
    note:    str  = ""

class DebtPaymentOut(BaseModel):
    id:      str
    debt_id: str
    amount:  int
    date:    date
    note:    str
    class Config:
        from_attributes = True

class DebtCreate(BaseModel):
    direction:         Literal["they_owe_me", "i_owe_them"]
    person:            str
    description:       str
    amount:            int  = Field(gt=0)
    linked_expense_id: Optional[str] = None
    created_date:      date
    is_settled:        bool = False
    settled_date:      Optional[date] = None

class DebtUpdate(BaseModel):
    person:       str
    description:  str
    amount:       int  = Field(gt=0)
    is_settled:   bool
    settled_date: Optional[date] = None

class DebtOut(BaseModel):
    id:                str
    direction:         str
    person:            str
    description:       str
    amount:            int
    linked_expense_id: Optional[str]
    is_settled:        bool
    created_date:      date
    settled_date:      Optional[date]
    payments:          list[DebtPaymentOut]
    total_paid:        int
    total_remaining:   int


# ── Month Budget ───────────────────────────────────────────────────────────────

class MonthBudgetSet(BaseModel):
    fixed_pct:    int = Field(ge=0, le=100)
    variable_pct: int = Field(ge=0, le=100)
    savings_pct:  int = Field(ge=0, le=100)

class MonthBudgetOut(BaseModel):
    month_key:    str
    fixed_pct:    int
    variable_pct: int
    savings_pct:  int
    is_override:  bool   # True when month_key != "default"
    class Config:
        from_attributes = True
