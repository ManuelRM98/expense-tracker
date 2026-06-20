"""Allow decimals on all money columns: Integer -> Numeric(14, 2)

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-06-20 00:00:00.000000

Converts every monetary column from INTEGER to NUMERIC(14, 2) so amounts can
carry 2 decimals (e.g. USD 173.85). Existing integer rows cast cleanly. Runs on
both PostgreSQL (prod / db-test) and SQLite (local dev) via batch_alter_table.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e6f7a8b9c0d1'
down_revision: Union[str, Sequence[str], None] = 'd5e6f7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (table, column) for every money column
MONEY_COLUMNS = [
    ("expenses",       "price"),
    ("savings",        "price"),
    ("income_entries", "original_amount"),
    ("income_entries", "exchange_rate"),
    ("income_entries", "amount_cop"),
    ("fixed_expense_templates", "amount"),
    ("debts",          "amount"),
    ("debt_payments",  "amount"),
]

NUMERIC = sa.Numeric(14, 2)


def upgrade() -> None:
    """INTEGER -> NUMERIC(14, 2). No-op where the column is already NUMERIC
    (fresh DBs where create_all built the current models)."""
    for table, column in MONEY_COLUMNS:
        with op.batch_alter_table(table, schema=None) as batch_op:
            batch_op.alter_column(
                column,
                type_=NUMERIC,
                existing_type=sa.Integer(),
                # PostgreSQL needs an explicit cast expression for the TYPE change.
                postgresql_using=f"{column}::numeric(14,2)",
            )


def downgrade() -> None:
    """NUMERIC(14, 2) -> INTEGER (rounds away decimals)."""
    for table, column in MONEY_COLUMNS:
        with op.batch_alter_table(table, schema=None) as batch_op:
            batch_op.alter_column(
                column,
                type_=sa.Integer(),
                existing_type=NUMERIC,
                postgresql_using=f"round({column})::integer",
            )
