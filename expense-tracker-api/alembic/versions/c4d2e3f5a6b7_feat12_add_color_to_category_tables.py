"""FEAT-12: add color column to expense_categories and saving_categories

Revision ID: c4d2e3f5a6b7
Revises: b3c9d1e2f4a5
Create Date: 2026-06-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d2e3f5a6b7'
down_revision: Union[str, Sequence[str], None] = 'b3c9d1e2f4a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add nullable color column to expense_categories and saving_categories.
    Compatible with both SQLite and PostgreSQL.

    Guard: if create_all already added the column (test environments, fresh DBs),
    skip the ALTER TABLE to avoid a duplicate-column error.
    """
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    expense_cols = [c["name"] for c in inspector.get_columns("expense_categories")]
    if "color" not in expense_cols:
        with op.batch_alter_table('expense_categories', schema=None) as batch_op:
            batch_op.add_column(sa.Column('color', sa.String(), nullable=True))

    saving_cols = [c["name"] for c in inspector.get_columns("saving_categories")]
    if "color" not in saving_cols:
        with op.batch_alter_table('saving_categories', schema=None) as batch_op:
            batch_op.add_column(sa.Column('color', sa.String(), nullable=True))


def downgrade() -> None:
    """Remove the color column from expense_categories and saving_categories."""
    with op.batch_alter_table('saving_categories', schema=None) as batch_op:
        batch_op.drop_column('color')

    with op.batch_alter_table('expense_categories', schema=None) as batch_op:
        batch_op.drop_column('color')
