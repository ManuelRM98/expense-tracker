from sqlalchemy import Column, String, Integer, Boolean, Date
from database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id        = Column(String, primary_key=True, index=True)
    date      = Column(Date,    nullable=False)
    desc      = Column(String,  nullable=False)
    category  = Column(String,  nullable=False)
    price     = Column(Integer, nullable=False)          # Colombian pesos, integer
    card_pay  = Column(String,  nullable=False)          # "Yes" | "No"
    who_paid  = Column(String,  nullable=False)
    card_type = Column(String,  nullable=False, default="")  # empty when card_pay="No"
    cost_type = Column(String,  nullable=False, default="variable")  # "fixed" | "variable"


class Saving(Base):
    __tablename__ = "savings"

    id        = Column(String, primary_key=True, index=True)
    date      = Column(Date,   nullable=False)
    desc      = Column(String, nullable=False)
    category  = Column(String, nullable=False)
    price     = Column(Integer, nullable=False)
    card_pay  = Column(String,  nullable=False)
    card_type = Column(String,  nullable=False, default="")


class Income(Base):
    __tablename__ = "income"

    month_key = Column(String,  primary_key=True)   # "YYYY-MM"
    amount    = Column(Integer, nullable=False, default=0)


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
    """Tracks which (template, month) pairs have already been generated."""
    __tablename__ = "fixed_expense_logs"

    log_key = Column(String, primary_key=True)   # "{template_id}_{YYYY-MM}"


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    name = Column(String, primary_key=True)


class SavingCategory(Base):
    __tablename__ = "saving_categories"

    name = Column(String, primary_key=True)


class CardType(Base):
    __tablename__ = "card_types"

    name = Column(String, primary_key=True)
