from sqlalchemy import Column, String, Integer, Boolean, Date, DateTime, ForeignKey, UniqueConstraint, func
from database import Base


# ── AUTH-01: App-side user profile ────────────────────────────────────────────
# id == Supabase auth `sub` (UUID).  Supabase auth.users lives in the auth schema
# and is NOT directly accessible via SQLAlchemy — this is the app-level mirror.

class AppUser(Base):
    __tablename__ = "app_users"

    id           = Column(String, primary_key=True)   # Supabase sub (UUID str)
    email        = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    created_at   = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


# ── Per-user data tables ───────────────────────────────────────────────────────
# Every table below gains a user_id FK pointing at app_users.id.
# The column is NOT NULL — enforced by the migration after backfill.

class Expense(Base):
    __tablename__ = "expenses"

    id        = Column(String, primary_key=True, index=True)
    user_id   = Column(String, ForeignKey("app_users.id"), nullable=False, index=True)  # AUTH-01
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
    user_id   = Column(String, ForeignKey("app_users.id"), nullable=False, index=True)  # AUTH-01
    date      = Column(Date,   nullable=False, index=True)       # PERF-05: index for date queries
    desc      = Column(String, nullable=False)
    category  = Column(String, nullable=False)
    price     = Column(Integer, nullable=False)
    card_pay  = Column(String,  nullable=False)
    card_type = Column(String,  nullable=False, default="")


class GlobalConfig(Base):
    """Key-value store for per-user settings (e.g. base_salary, salary_day).
    AUTH-01: PK is now composite (user_id, key) — each user has their own config."""
    __tablename__ = "global_config"

    user_id = Column(String, ForeignKey("app_users.id"), primary_key=True)  # AUTH-01
    key     = Column(String, primary_key=True)
    value   = Column(String, nullable=False)


class IncomeEntry(Base):
    __tablename__ = "income_entries"

    id              = Column(String,  primary_key=True, index=True)
    user_id         = Column(String, ForeignKey("app_users.id"), nullable=False, index=True)  # AUTH-01
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
    user_id      = Column(String, ForeignKey("app_users.id"), nullable=False, index=True)  # AUTH-01
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
    STATE-02: unique constraint ensures race-safe idempotency on concurrent inserts.
    AUTH-01: user_id scopes log entries per user so GET /fixed-expenses/log
    cannot leak another user's template UUIDs and generation months."""
    __tablename__ = "fixed_expense_logs"

    log_key = Column(String, primary_key=True)   # "{template_id}_{YYYY-MM}" — PK is already unique
    user_id = Column(String, ForeignKey("app_users.id"), nullable=False, index=True)  # AUTH-01


class ExpenseCategory(Base):
    """AUTH-01: PK is now composite (user_id, name) — names scoped per user."""
    __tablename__ = "expense_categories"

    user_id = Column(String, ForeignKey("app_users.id"), primary_key=True)  # AUTH-01
    name    = Column(String, primary_key=True)
    color   = Column(String, nullable=True)   # FEAT-12: #rrggbb hex or NULL (= accent fallback)


class SavingCategory(Base):
    """AUTH-01: PK is now composite (user_id, name) — names scoped per user."""
    __tablename__ = "saving_categories"

    user_id = Column(String, ForeignKey("app_users.id"), primary_key=True)  # AUTH-01
    name    = Column(String, primary_key=True)
    color   = Column(String, nullable=True)   # FEAT-12: #rrggbb hex or NULL (= accent fallback)


class CardType(Base):
    """AUTH-01: PK is now composite (user_id, name) — card names scoped per user."""
    __tablename__ = "card_types"

    user_id     = Column(String, ForeignKey("app_users.id"), primary_key=True)  # AUTH-01
    name        = Column(String,  primary_key=True)
    cut_off_day = Column(Integer, nullable=True)   # 1-31; None = no cut-off logic
    color       = Column(String,  nullable=True)   # FEAT-11: #rrggbb hex or NULL (= accent fallback)


class MonthBudget(Base):
    """Budget allocation percentages. month_key='default' stores per-user global defaults.
    AUTH-01: PK is now composite (user_id, month_key)."""
    __tablename__ = "month_budgets"

    user_id      = Column(String, ForeignKey("app_users.id"), primary_key=True)  # AUTH-01
    month_key    = Column(String,  primary_key=True)   # "default" | "YYYY-MM"
    fixed_pct    = Column(Integer, nullable=False)      # 0-100
    variable_pct = Column(Integer, nullable=False)
    savings_pct  = Column(Integer, nullable=False)


class Debt(Base):
    __tablename__ = "debts"

    id                 = Column(String,  primary_key=True, index=True)
    user_id            = Column(String, ForeignKey("app_users.id"), nullable=False, index=True)  # AUTH-01
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
