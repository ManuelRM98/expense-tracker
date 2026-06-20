import re
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Literal, Optional
from datetime import date, datetime


# ── AUTH-01: Account / AppUser ──────────────────────────────────────────────────

class AppUserOut(BaseModel):
    """Profile returned from GET /account/me."""
    id:           str
    email:        str
    display_name: str | None
    created_at:   datetime
    model_config = ConfigDict(from_attributes=True)

class AppUserUpdate(BaseModel):
    """Payload for PUT /account/me — only display_name is editable here."""
    display_name: str


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

    @field_validator("billing_month")
    @classmethod
    def validate_billing_month(cls, v):
        """DEBT-06: enforce YYYY-MM format or None."""
        if v is not None and not re.match(r"^\d{4}-\d{2}$", v):
            raise ValueError("billing_month must be in YYYY-MM format (e.g. '2026-03')")
        return v

    @field_validator("who_paid")
    @classmethod
    def normalize_who_paid(cls, v):
        """DEBT-05: strip surrounding whitespace to prevent typo-split chart segments."""
        return v.strip()

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(ExpenseBase):
    pass

class ExpenseOut(ExpenseBase):
    id: str
    model_config = ConfigDict(from_attributes=True)


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
    model_config = ConfigDict(from_attributes=True)


# ── Global Config ──────────────────────────────────────────────────────────────

class GlobalConfigOut(BaseModel):
    key:   str
    value: str
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)


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
    model_config = ConfigDict(from_attributes=True)


# ── Categories & Cards ─────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name:  str
    color: str | None = None   # FEAT-12: optional #rrggbb hex

    @field_validator("color")
    @classmethod
    def validate_color(cls, v):
        return _validate_color(v)

class CategoryOut(BaseModel):
    name:  str
    color: str | None          # FEAT-12: #rrggbb hex or None (= use accent vars)
    model_config = ConfigDict(from_attributes=True)

class CategoryUpdate(BaseModel):
    """FEAT-12: partial PATCH — only fields present in the request body are updated."""
    color: str | None = None

    @field_validator("color")
    @classmethod
    def validate_color(cls, v):
        return _validate_color(v)

class CategoryRename(BaseModel):
    """QUAL-07: payload for rename endpoints."""
    new_name: str

_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")

def _validate_color(v: str | None) -> str | None:
    """FEAT-11: color must be None or a valid #rrggbb hex string (normalized lowercase)."""
    if v is None:
        return None
    if not _COLOR_RE.match(v):
        raise ValueError("color must be a 6-digit hex color in #rrggbb format (e.g. '#007aff')")
    return v.lower()

class CardCreate(BaseModel):
    name:        str
    cut_off_day: int | None = None   # 1-31 or None
    color:       str | None = None   # FEAT-11: #rrggbb hex or None

    @field_validator("color")
    @classmethod
    def validate_color(cls, v):
        return _validate_color(v)

class CardUpdate(BaseModel):
    """FEAT-11: replaces CardCutOffUpdate — both fields optional for partial PATCH semantics."""
    cut_off_day: int | None = None
    color:       str | None = None

    @field_validator("color")
    @classmethod
    def validate_color(cls, v):
        return _validate_color(v)

class CardRename(BaseModel):
    """QUAL-07: payload for card-type rename endpoint."""
    new_name: str

class CardOut(BaseModel):
    name:        str
    cut_off_day: int | None
    color:       str | None   # FEAT-11: #rrggbb hex or None (= use accent vars)
    model_config = ConfigDict(from_attributes=True)


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

class DebtPaymentUpdate(BaseModel):
    amount:  int  = Field(gt=0)
    date:    date
    note:    str  = ""

class DebtPaymentOut(BaseModel):
    id:      str
    debt_id: str
    amount:  int
    date:    date
    note:    str
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)
