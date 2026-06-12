"""FEAT-11: add color column to card_types

Revision ID: b3c9d1e2f4a5
Revises: ae523ab830f6
Create Date: 2026-06-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3c9d1e2f4a5'
down_revision: Union[str, Sequence[str], None] = 'ae523ab830f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add nullable color column to card_types. Compatible with both SQLite and PostgreSQL.

    Guard: if create_all already added the column (test environments, fresh DBs),
    skip the ALTER TABLE to avoid a duplicate-column error.
    """
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_cols = [c["name"] for c in inspector.get_columns("card_types")]
    if "color" not in existing_cols:
        with op.batch_alter_table('card_types', schema=None) as batch_op:
            batch_op.add_column(sa.Column('color', sa.String(), nullable=True))


def downgrade() -> None:
    """Remove the color column from card_types."""
    with op.batch_alter_table('card_types', schema=None) as batch_op:
        batch_op.drop_column('color')
