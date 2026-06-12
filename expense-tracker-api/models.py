from sqlalchemy import Column, String, Integer, Boolean, Date, ForeignKey, UniqueConstraint
from database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id        = Column(String, primary_key=True, index=True)
    date      = Column(Date,    nullable=False, index=True)      # PERF-05: index for date queries
    desc      = Column(String,  nullable=False)
    category  = Column(String,  nullable=False)
    price     = Column(Integer, nullable=False)                  # Colombian pesos, integer
    card_pay      = Column(String,  nullable=False)              # "Yes" | "No"
    who_paid      = Column(String,  nullable=False)
    card_type     = Column(String,  nullable=False, default="")  # empty when card_pay="No"
    cost_type     = Column(String,  nullable=False, default="variable")  # "fixed" | "variable"
    billing_month = Column(String,  nullable=True, index=True)   # "YYYY-MM"; None = use date; PERF-05


class Saving(Base):
    __tablename__ = "savings"

    id        = Column(String, primary_key=True, index=True)
    date      = Column(Date,   nullable=False, index=True)       # PERF-05: index for date queries
    desc      = Column(String, nullable=False)
    category  = Column(String, nullable=False)
    price     = Column(Integer, nullable=False)
    card_pay  = Column(String,  nullable=False)
    card_type = Column(String,  nullable=False, default="")


class GlobalConfig(Base):
    """Key-value store for global settings (e.g. base_salary, salary_day)."""
    __tablename__ = "global_config"

    key   = Column(String,  primary_key=True)
    value = Column(String,  nullable=False)


class IncomeEntry(Base):
    __tablename__ = "income_entries"

    id              = Column(String,  primary_key=True, index=True)
    month_key       = Column(String,  nullable=False, index=True)   # "YYYY-MM"
    income_type     = Column(String,  nullable=False)               # "salary" | "bonus" | "other"
    description     = Column(String,  nullable=False)
    currency        = Column(String,  nullable=False, default="COP")  # "COP" | "USD"
    original_amount = Column(Integer, nullable=True)                # amount in source currency (USD)
    exchange_rate   = Column(Integer, nullable=True)                # TRM COP/USD at time of entry
    amount_cop      = Column(Integer, nullable=False)               # final amount in COP — used by formulas


class FixedExpenseTemplate(Base):
    __tablename__ = "fixed_expense_templates"

    id           = Column(String,  primary_key=True, index=True)
    name         = Column(String,  nullable=False)
    amount       = Column(Integer, nullable=False)
    category     = Column(String,  nullable=False)
    day_of_month = Column(Integer, nullable=False)   # 1-31
    who_paid     = Column(String,  nullable=False)
    card_pay     = Column(String,  nullable=False)
    card_type    = Column(String,  nullable=False, default="")
    is_active    = Column(Boolean, nullable=False, default=True)
    created_at   = Column(String,  nullable=False)   # "YYYY-MM" — prevents backfill before creation


class FixedExpenseLog(Base):
    """Tracks which (template, month) pairs have already been generated.
    STATE-02: unique constraint ensures race-safe idempotency on concurrent inserts."""
    __tablename__ = "fixed_expense_logs"

    log_key = Column(String, primary_key=True)   # "{template_id}_{YYYY-MM}" — PK is already unique


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    name  = Column(String, primary_key=True)
    color = Column(String, nullable=True)   # FEAT-12: #rrggbb hex or NULL (= accent fallback)


class SavingCategory(Base):
    __tablename__ = "saving_categories"

    name  = Column(String, primary_key=True)
    color = Column(String, nullable=True)   # FEAT-12: #rrggbb hex or NULL (= accent fallback)


class CardType(Base):
    __tablename__ = "card_types"

    name        = Column(String,  primary_key=True)
    cut_off_day = Column(Integer, nullable=True)   # 1-31; None = no cut-off logic
    color       = Column(String,  nullable=True)   # FEAT-11: #rrggbb hex or NULL (= accent fallback)


class MonthBudget(Base):
    """Budget allocation percentages. month_key='default' stores global defaults."""
    __tablename__ = "month_budgets"

    month_key    = Column(String,  primary_key=True)   # "default" | "YYYY-MM"
    fixed_pct    = Column(Integer, nullable=False)      # 0-100
    variable_pct = Column(Integer, nullable=False)
    savings_pct  = Column(Integer, nullable=False)


class Debt(Base):
    __tablename__ = "debts"

    id                 = Column(String,  primary_key=True, index=True)
    direction          = Column(String,  nullable=False)              # "they_owe_me" | "i_owe_them"
    person             = Column(String,  nullable=False)
    description        = Column(String,  nullable=False)
    amount             = Column(Integer, nullable=False)              # original debt amount in COP
    linked_expense_id  = Column(String,  nullable=True)               # optional FK to expenses.id
    is_settled         = Column(Boolean, nullable=False, default=False)
    created_date       = Column(Date,    nullable=False, index=True)  # PERF-05: index for date queries
    settled_date       = Column(Date,    nullable=True)


class DebtPayment(Base):
    __tablename__ = "debt_payments"

    id       = Column(String,  primary_key=True, index=True)
    debt_id  = Column(String,  ForeignKey("debts.id", ondelete="CASCADE"), nullable=False, index=True)
    amount   = Column(Integer, nullable=False)
    date     = Column(Date,    nullable=False)
    note     = Column(String,  nullable=False, default="")
