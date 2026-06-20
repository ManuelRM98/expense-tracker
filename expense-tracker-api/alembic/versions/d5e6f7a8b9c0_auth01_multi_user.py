"""AUTH-01: multi-user — add app_users, user_id columns, composite PKs, backfill MOCK user.

Revision ID: d5e6f7a8b9c0
Revises: c4d2e3f5a6b7
Create Date: 2026-06-19 00:00:00.000000

Strategy (three logical phases in one migration):
  Phase 1 — Structural:
    * Create app_users table.
    * Add NULLABLE user_id columns to every user-owned table.
    * Add indexes on user_id.
    * Rewrite PKs for global_config, expense_categories, saving_categories,
      card_types, and month_budgets to composite (user_id, ...).

  Phase 2 — Backfill:
    * Insert the MOCK user row into app_users.
    * UPDATE every existing row's user_id to the MOCK UUID.

  Phase 3 — Constrain:
    * Set user_id NOT NULL on every table.

MOCK USER UUID: 00000000-0000-0000-0000-000000000001
  This fixed UUID is used for all existing data.  Creating the corresponding
  Supabase Auth account (so the mock user can actually log in) is a runtime/ops
  step outside this migration — the migration only needs the app_users row.
  The UUID is intentionally short and memorable for ops.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, Sequence[str], None] = 'c4d2e3f5a6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The fixed UUID assigned to every pre-existing data row.
# Keep in sync with MOCK_USER_ID in routers/account.py and frontend ops docs.
MOCK_USER_ID = "00000000-0000-0000-0000-000000000001"
MOCK_USER_EMAIL = "mock@expense-tracker.local"


def _column_exists(inspector, table: str, column: str) -> bool:
    cols = [c["name"] for c in inspector.get_columns(table)]
    return column in cols


def _table_exists(inspector, table: str) -> bool:
    return table in inspector.get_table_names()


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # ── Phase 1a: Create app_users ────────────────────────────────────────────
    if not _table_exists(inspector, "app_users"):
        op.create_table(
            "app_users",
            sa.Column("id",           sa.String(), nullable=False),
            sa.Column("email",        sa.String(), nullable=False),
            sa.Column("display_name", sa.String(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("now()"),
            ),
            sa.PrimaryKeyConstraint("id"),
        )

    # ── Phase 1b: Add nullable user_id to simple tables ───────────────────────
    simple_tables = [
        "expenses",
        "savings",
        "income_entries",
        "fixed_expense_templates",
        "debts",
    ]
    for tbl in simple_tables:
        if not _column_exists(inspector, tbl, "user_id"):
            with op.batch_alter_table(tbl) as batch_op:
                batch_op.add_column(sa.Column("user_id", sa.String(), nullable=True))

    # ── Phase 1c: Add nullable user_id to composite-key tables ────────────────
    # NOTE: the PK rewrite itself is DEFERRED to Phase 2b (after the backfill).
    # Two reasons it cannot happen here:
    #   1. A composite PK on (user_id, ...) cannot be created while user_id is
    #      still NULL for existing rows — it must be backfilled first.
    #   2. The existing single-column PK must be DROPPED before the new one is
    #      added. batch_alter_table does NOT do this on PostgreSQL (it only
    #      rebuilds the table on SQLite); on PG it emits a plain ADD CONSTRAINT,
    #      which fails with "multiple primary keys for table" if the old PK
    #      still exists. So we drop the old PK explicitly in Phase 2b.
    composite_tables = {
        # table              → (new_pk_name,            composite columns)
        "global_config":      ("pk_global_config",      ["user_id", "key"]),
        "expense_categories": ("pk_expense_categories", ["user_id", "name"]),
        "saving_categories":  ("pk_saving_categories",  ["user_id", "name"]),
        "card_types":         ("pk_card_types",         ["user_id", "name"]),
        "month_budgets":      ("pk_month_budgets",      ["user_id", "month_key"]),
    }
    # Capture the EXISTING PK constraint names up front (the inspector reflects
    # the pre-migration schema) so Phase 2b can drop them by their real names.
    old_pk_names = {
        tbl: inspector.get_pk_constraint(tbl).get("name")
        for tbl in composite_tables
    }
    for tbl in composite_tables:
        if not _column_exists(inspector, tbl, "user_id"):
            with op.batch_alter_table(tbl) as batch_op:
                batch_op.add_column(sa.Column("user_id", sa.String(), nullable=True))

    # ── Phase 1d: Add indexes on user_id for simple tables ───────────────────
    # (composite-key tables use the PK itself for user scoping — no extra index needed)
    for tbl in simple_tables:
        idx_name = f"ix_{tbl}_user_id"
        existing_indexes = [i["name"] for i in inspector.get_indexes(tbl)]
        if idx_name not in existing_indexes:
            op.create_index(idx_name, tbl, ["user_id"])

    # ── Phase 2: Upsert MOCK user and backfill all existing rows ─────────────
    # Use text() for a dialect-neutral upsert (works on Postgres).
    bind.execute(sa.text(
        "INSERT INTO app_users (id, email, display_name) "
        "VALUES (:id, :email, :name) "
        "ON CONFLICT (id) DO NOTHING"
    ), {"id": MOCK_USER_ID, "email": MOCK_USER_EMAIL, "name": "Mock User"})

    all_tables = simple_tables + [
        "global_config",
        "expense_categories",
        "saving_categories",
        "card_types",
        "month_budgets",
    ]
    for tbl in all_tables:
        bind.execute(
            sa.text(f"UPDATE {tbl} SET user_id = :uid WHERE user_id IS NULL"),
            {"uid": MOCK_USER_ID},
        )

    # ── Phase 2b: Rewrite PKs to composite now that user_id is populated ───────
    # user_id is non-NULL for every row at this point, so ADD PRIMARY KEY succeeds
    # (and Postgres implicitly marks the PK columns NOT NULL).
    for tbl, (new_pk, cols) in composite_tables.items():
        old_pk = old_pk_names.get(tbl)
        if old_pk:
            op.drop_constraint(old_pk, tbl, type_="primary")
        op.create_primary_key(new_pk, tbl, cols)

    # ── Phase 3: Set user_id NOT NULL on the simple tables ────────────────────
    # (composite-key tables already got NOT NULL on user_id via the PK above.)
    for tbl in simple_tables:
        with op.batch_alter_table(tbl) as batch_op:
            batch_op.alter_column("user_id", nullable=False)

    # ── Phase 4: Add user_id to fixed_expense_logs (AUTH-01 isolation fix) ────
    # The log table was missed in the original AUTH-01 pass.  Same three-step
    # pattern: nullable add → backfill via MOCK UUID → NOT NULL.
    if not _column_exists(inspector, "fixed_expense_logs", "user_id"):
        with op.batch_alter_table("fixed_expense_logs") as batch_op:
            batch_op.add_column(sa.Column("user_id", sa.String(), nullable=True))
        # Create index for user_id lookups on the log table
        idx_name = "ix_fixed_expense_logs_user_id"
        existing_indexes = [i["name"] for i in inspector.get_indexes("fixed_expense_logs")]
        if idx_name not in existing_indexes:
            op.create_index(idx_name, "fixed_expense_logs", ["user_id"])
        # Backfill existing rows to MOCK user
        bind.execute(
            sa.text("UPDATE fixed_expense_logs SET user_id = :uid WHERE user_id IS NULL"),
            {"uid": MOCK_USER_ID},
        )
        with op.batch_alter_table("fixed_expense_logs") as batch_op:
            batch_op.alter_column("user_id", nullable=False)


def downgrade() -> None:
    """Remove user_id columns and drop app_users.  Drops composite PKs back to simple ones."""
    # Drop user_id from fixed_expense_logs (Phase 4 reversal)
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if _column_exists(inspector, "fixed_expense_logs", "user_id"):
        idx_name = "ix_fixed_expense_logs_user_id"
        existing_indexes = [i["name"] for i in inspector.get_indexes("fixed_expense_logs")]
        if idx_name in existing_indexes:
            op.drop_index(idx_name, table_name="fixed_expense_logs")
        with op.batch_alter_table("fixed_expense_logs") as batch_op:
            batch_op.drop_column("user_id")

    # Restore simple PKs and drop user_id from composite-key tables
    with op.batch_alter_table("month_budgets") as batch_op:
        batch_op.drop_column("user_id")
        batch_op.create_primary_key("pk_month_budgets", ["month_key"])

    with op.batch_alter_table("card_types") as batch_op:
        batch_op.drop_column("user_id")
        batch_op.create_primary_key("pk_card_types", ["name"])

    with op.batch_alter_table("saving_categories") as batch_op:
        batch_op.drop_column("user_id")
        batch_op.create_primary_key("pk_saving_categories", ["name"])

    with op.batch_alter_table("expense_categories") as batch_op:
        batch_op.drop_column("user_id")
        batch_op.create_primary_key("pk_expense_categories", ["name"])

    with op.batch_alter_table("global_config") as batch_op:
        batch_op.drop_column("user_id")
        batch_op.create_primary_key("pk_global_config", ["key"])

    for tbl in ["expenses", "savings", "income_entries", "fixed_expense_templates", "debts"]:
        idx_name = f"ix_{tbl}_user_id"
        op.drop_index(idx_name, table_name=tbl)
        with op.batch_alter_table(tbl) as batch_op:
            batch_op.drop_column("user_id")

    op.drop_table("app_users")
