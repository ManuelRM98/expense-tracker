"""
Migration upgrade-path test for AUTH-01 (d5e6f7a8b9c0).

WHY THIS TEST EXISTS
--------------------
The test suite normally materialises the schema via Base.metadata.create_all()
+ alembic stamp("head"), so the migration's *upgrade()* function is never
exercised.  The AUTH-01 migration had a bug that only manifested on PRE-EXISTING
(non-empty) tables:
  - It tried to ADD PRIMARY KEY before dropping the old single-column PK.
    PostgreSQL raises: "multiple primary keys for table ... are not allowed"
  - It also tried to create the PK before backfilling user_id (still NULL).
    PostgreSQL raises: "column user_id ... contains null values"

All 110 tests passed because they always start from a fresh schema built via
create_all() (which already has the composite PKs); the upgrade path was never
executed in CI.

APPROACH
--------
We create an isolated PostgreSQL schema on db-test, manually build the schema
in the state it would have been at revision c4d2e3f5a6b7 (single-column PKs,
color columns present, NO user_id), stamp it at that revision, insert rows,
then run upgrade("head") and verify correctness.

We stamp rather than running the migration chain from scratch because the
baseline migration (ae523ab830f6) was written for pre-existing tables and only
adds indexes — it cannot create tables from nothing.

ISOLATION TECHNIQUE
-------------------
A dedicated schema (mig_test_<hex>) is created for each test run.  All DDL is
routed into it via SET search_path on the connection.  The alembic_version table
is also stored in the same schema (version_table_schema) so it never collides
with the main public-schema test DB.

SKIP BEHAVIOUR
--------------
If db-test is unreachable, the test is skipped with a clear message.
"""
import os
import sys
import uuid
from pathlib import Path

import pytest

# ── Resolve db-test URL ───────────────────────────────────────────────────────
_DEFAULT_TEST_DB = "postgresql+psycopg://postgres:postgres@localhost:5440/expense_test"
_TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", _DEFAULT_TEST_DB)

# Make backend modules importable.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# ── Constants ─────────────────────────────────────────────────────────────────
MOCK_USER_ID  = "00000000-0000-0000-0000-000000000001"
DOWN_REVISION = "c4d2e3f5a6b7"   # last revision before AUTH-01

# Composite-PK tables whose PK was rewritten by AUTH-01.
COMPOSITE_PK_TABLES = {
    "global_config":      ["user_id", "key"],
    "expense_categories": ["user_id", "name"],
    "saving_categories":  ["user_id", "name"],
    "card_types":         ["user_id", "name"],
    "month_budgets":      ["user_id", "month_key"],
}

# DDL that recreates the schema as it existed at c4d2e3f5a6b7:
#  - global_config, expense_categories, saving_categories: single-col PK (no user_id)
#  - card_types: has cut_off_day + color (from FEAT-11), single-col PK
#  - expense_categories, saving_categories: have color (from FEAT-12), single-col PK
#  - month_budgets: has month_key PK (no user_id)
#  - expenses: simple string PK, no user_id
#  - other tables: included so migration FK checks don't fail
_PRE_AUTH01_DDL = """
CREATE TABLE global_config (
    key   VARCHAR NOT NULL,
    value VARCHAR NOT NULL,
    PRIMARY KEY (key)
);

CREATE TABLE expense_categories (
    name  VARCHAR NOT NULL,
    color VARCHAR,
    PRIMARY KEY (name)
);

CREATE TABLE saving_categories (
    name  VARCHAR NOT NULL,
    color VARCHAR,
    PRIMARY KEY (name)
);

CREATE TABLE card_types (
    name        VARCHAR  NOT NULL,
    cut_off_day INTEGER,
    color       VARCHAR,
    PRIMARY KEY (name)
);

CREATE TABLE month_budgets (
    month_key    VARCHAR  NOT NULL,
    fixed_pct    INTEGER  NOT NULL,
    variable_pct INTEGER  NOT NULL,
    savings_pct  INTEGER  NOT NULL,
    PRIMARY KEY (month_key)
);

CREATE TABLE expenses (
    id            VARCHAR  NOT NULL,
    date          DATE     NOT NULL,
    "desc"        VARCHAR  NOT NULL,
    category      VARCHAR  NOT NULL,
    price         INTEGER  NOT NULL,
    card_pay      VARCHAR  NOT NULL,
    who_paid      VARCHAR  NOT NULL,
    card_type     VARCHAR  NOT NULL DEFAULT '',
    cost_type     VARCHAR  NOT NULL DEFAULT 'variable',
    billing_month VARCHAR,
    PRIMARY KEY (id)
);
CREATE INDEX ix_expenses_date          ON expenses (date);
CREATE INDEX ix_expenses_billing_month ON expenses (billing_month);

CREATE TABLE savings (
    id        VARCHAR NOT NULL,
    date      DATE    NOT NULL,
    "desc"    VARCHAR NOT NULL,
    category  VARCHAR NOT NULL,
    price     INTEGER NOT NULL,
    card_pay  VARCHAR NOT NULL,
    card_type VARCHAR NOT NULL DEFAULT '',
    PRIMARY KEY (id)
);
CREATE INDEX ix_savings_date ON savings (date);

CREATE TABLE income_entries (
    id              VARCHAR  NOT NULL,
    month_key       VARCHAR  NOT NULL,
    income_type     VARCHAR  NOT NULL,
    description     VARCHAR  NOT NULL,
    currency        VARCHAR  NOT NULL DEFAULT 'COP',
    original_amount INTEGER,
    exchange_rate   INTEGER,
    amount_cop      INTEGER  NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE fixed_expense_templates (
    id           VARCHAR  NOT NULL,
    name         VARCHAR  NOT NULL,
    amount       INTEGER  NOT NULL,
    category     VARCHAR  NOT NULL,
    day_of_month INTEGER  NOT NULL,
    who_paid     VARCHAR  NOT NULL,
    card_pay     VARCHAR  NOT NULL,
    card_type    VARCHAR  NOT NULL DEFAULT '',
    is_active    BOOLEAN  NOT NULL DEFAULT TRUE,
    created_at   VARCHAR  NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE fixed_expense_logs (
    log_key VARCHAR NOT NULL,
    PRIMARY KEY (log_key)
);

CREATE TABLE debts (
    id                VARCHAR  NOT NULL,
    direction         VARCHAR  NOT NULL,
    person            VARCHAR  NOT NULL,
    description       VARCHAR  NOT NULL,
    amount            INTEGER  NOT NULL,
    linked_expense_id VARCHAR,
    is_settled        BOOLEAN  NOT NULL DEFAULT FALSE,
    created_date      DATE     NOT NULL,
    settled_date      DATE,
    PRIMARY KEY (id)
);
CREATE INDEX ix_debts_created_date ON debts (created_date);

CREATE TABLE debt_payments (
    id      VARCHAR  NOT NULL,
    debt_id VARCHAR  NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    amount  INTEGER  NOT NULL,
    date    DATE     NOT NULL,
    note    VARCHAR  NOT NULL DEFAULT '',
    PRIMARY KEY (id)
);
"""


# ── Low-level Alembic driver ──────────────────────────────────────────────────

def _run_alembic_upgrade(db_url: str, schema: str, target_revision: str) -> None:
    """Run Alembic upgrade to *target_revision* inside an isolated *schema*.

    We bypass alembic/env.py and drive the migration runner via the lower-level
    ScriptDirectory / EnvironmentContext APIs so we can pass a connection that
    already has SET search_path executed on it.  This avoids the configparser
    % interpolation error that occurs when embedding options= in the URL string.
    """
    import sqlalchemy as sa
    from alembic.config import Config
    from alembic.script import ScriptDirectory
    from alembic.runtime.environment import EnvironmentContext

    ini_path = Path(__file__).resolve().parents[1] / "alembic.ini"
    cfg = Config(str(ini_path))
    # Store plain URL in attributes; configparser never sees it.
    cfg.attributes["target_url"] = db_url
    script = ScriptDirectory.from_config(cfg)

    def upgrade_fn(rev, context):
        return script._upgrade_revs(target_revision, rev)

    engine = sa.create_engine(db_url, poolclass=sa.pool.NullPool)
    with engine.connect() as conn:
        # SET search_path and commit so it persists across Alembic's internal
        # transaction management (Alembic may issue COMMIT/BEGIN around each step).
        conn.execute(sa.text(f'SET search_path TO "{schema}"'))
        conn.commit()

        ctx = EnvironmentContext(cfg, script, fn=upgrade_fn)
        ctx.configure(
            connection=conn,
            target_metadata=None,       # apply-only; no autogenerate
            render_as_batch=True,       # matches env.py
            version_table_schema=schema,  # keep alembic_version in our schema
        )
        with ctx.begin_transaction():
            ctx.run_migrations()
    engine.dispose()


def _stamp_alembic(db_url: str, schema: str, revision: str) -> None:
    """Stamp *revision* into the alembic_version table in *schema*."""
    import sqlalchemy as sa
    from alembic.config import Config
    from alembic.script import ScriptDirectory
    from alembic.runtime.environment import EnvironmentContext
    from alembic.runtime.migration import MigrationContext

    ini_path = Path(__file__).resolve().parents[1] / "alembic.ini"
    cfg = Config(str(ini_path))
    script = ScriptDirectory.from_config(cfg)

    engine = sa.create_engine(db_url, poolclass=sa.pool.NullPool)
    with engine.connect() as conn:
        conn.execute(sa.text(f'SET search_path TO "{schema}"'))
        conn.commit()
        mc = MigrationContext.configure(
            conn,
            opts={"version_table_schema": schema},
        )
        mc.stamp(script, revision)
        conn.commit()
    engine.dispose()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _pg_connect(db_url: str):
    """Return a raw psycopg connection (no SQLAlchemy overhead)."""
    import psycopg
    raw_url = db_url.replace("postgresql+psycopg://", "postgresql://")
    return psycopg.connect(raw_url)


# ── Fixture ───────────────────────────────────────────────────────────────────

@pytest.fixture()
def isolated_schema():
    """Create a throw-away schema on db-test and yield its name.

    The schema is dropped (CASCADE) in teardown regardless of test outcome.
    If db-test is unreachable, the test is skipped.
    """
    schema_name = f"mig_test_{uuid.uuid4().hex[:12]}"

    try:
        conn = _pg_connect(_TEST_DB_URL)
    except Exception as exc:
        pytest.skip(
            f"db-test not reachable ({exc}); skipping migration upgrade-path test"
        )

    with conn:
        with conn.cursor() as cur:
            cur.execute(f'CREATE SCHEMA "{schema_name}"')

    yield schema_name

    # Teardown — always drop the schema even if the test failed.
    try:
        conn2 = _pg_connect(_TEST_DB_URL)
        with conn2:
            with conn2.cursor() as cur:
                cur.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
    except Exception:
        pass


# ── The test ──────────────────────────────────────────────────────────────────

def test_auth01_migration_upgrade_on_populated_tables(isolated_schema: str):
    """
    Run the AUTH-01 upgrade() against a non-empty pre-AUTH-01 schema and assert
    it succeeds and leaves the DB in the correct post-migration state.

    MEANINGFULNESS — why this would fail against the pre-fix migration:
      The pre-fix upgrade() flow was (wrong order):
        1. Add nullable user_id column.
        2. Immediately call op.create_primary_key("pk_global_config", "global_config",
                                                  ["user_id", "key"])
           WITHOUT first dropping the old "key" PK.
        → PostgreSQL raises: "multiple primary keys for table global_config
                              are not allowed"
        Also: user_id is still NULL at this point → "column user_id ... contains
        null values" when trying to create the NOT NULL PK.

      The fixed migration:
        Phase 1: add nullable user_id only.
        Phase 2: backfill user_id to MOCK UUID.
        Phase 2b: DROP old single-col PK by its real name, THEN create composite.
        Phase 3: ALTER COLUMN user_id SET NOT NULL.

      This test inserts rows BEFORE upgrade and asserts no exception is raised —
      which would fail with the pre-fix code.
    """
    import sqlalchemy as sa

    schema = isolated_schema

    # ── Step 1: Build the pre-AUTH-01 schema manually ────────────────────────
    # The baseline migration (ae523ab830f6) was a "stamp of existing state" and
    # only adds indexes to tables that must already exist.  We recreate the
    # pre-AUTH-01 table DDL directly, then stamp at c4d2e3f5a6b7 so Alembic
    # knows where to start the upgrade from.
    #
    # We use psycopg directly to execute multi-statement DDL inside the isolated
    # schema — this avoids SQLAlchemy's per-statement transaction wrapping and
    # any reserved-keyword quoting surprises with sa.text().
    raw_conn = _pg_connect(_TEST_DB_URL)
    with raw_conn:
        with raw_conn.cursor() as cur:
            cur.execute(f'SET search_path TO "{schema}"')
            # Execute each DDL statement individually (psycopg doesn't support
            # multi-statement strings in execute()).
            for stmt in _PRE_AUTH01_DDL.strip().split(";\n"):
                stmt = stmt.strip().rstrip(";")
                if stmt:
                    cur.execute(stmt)

    _stamp_alembic(_TEST_DB_URL, schema, DOWN_REVISION)

    # ── Step 2: Insert rows while user_id does NOT yet exist ──────────────────
    # The bug only manifests on non-empty tables.  We must insert before upgrade.
    engine2 = sa.create_engine(_TEST_DB_URL, poolclass=sa.pool.NullPool)
    with engine2.begin() as conn:
        conn.execute(sa.text(f'SET search_path TO "{schema}"'))
        conn.execute(sa.text(
            "INSERT INTO global_config (key, value) VALUES ('base_salary', '5000000')"
        ))
        conn.execute(sa.text(
            "INSERT INTO expense_categories (name) VALUES ('Food')"
        ))
        conn.execute(sa.text(
            "INSERT INTO saving_categories (name) VALUES ('Investment')"
        ))
        conn.execute(sa.text(
            "INSERT INTO card_types (name) VALUES ('Davivienda')"
        ))
        conn.execute(sa.text(
            "INSERT INTO month_budgets (month_key, fixed_pct, variable_pct, savings_pct) "
            "VALUES ('default', 50, 30, 20)"
        ))
        conn.execute(sa.text(
            'INSERT INTO expenses '
            '(id, date, "desc", category, price, card_pay, who_paid, card_type, cost_type) '
            "VALUES ('exp-mig-test-1', '2026-01-15', 'Test', 'Food', 50000, "
            "'No', 'Manuel', '', 'variable')"
        ))
    engine2.dispose()

    # ── Step 3: Run upgrade("head") ───────────────────────────────────────────
    # With the PRE-FIX migration this would raise:
    #   ProgrammingError: multiple primary keys for table "global_config" are not allowed
    # The FIXED migration drops the old PK first, backfills user_id, then creates
    # the composite PK — so this call must complete without exception.
    _run_alembic_upgrade(_TEST_DB_URL, schema, "head")

    # ── Step 4: Assert post-migration state ───────────────────────────────────
    engine3 = sa.create_engine(_TEST_DB_URL, poolclass=sa.pool.NullPool)
    with engine3.connect() as conn:
        conn.execute(sa.text(f'SET search_path TO "{schema}"'))

        # (a) app_users must contain the MOCK user row
        row = conn.execute(sa.text(
            "SELECT id FROM app_users WHERE id = :uid"
        ), {"uid": MOCK_USER_ID}).fetchone()
        assert row is not None, (
            "MOCK user row missing from app_users after migration"
        )

        # (b) Every composite-PK table: user_id backfilled, zero NULLs
        for tbl in COMPOSITE_PK_TABLES:
            null_count = conn.execute(sa.text(
                f"SELECT COUNT(*) FROM {tbl} WHERE user_id IS NULL"
            )).scalar()
            assert null_count == 0, (
                f"{tbl}: {null_count} row(s) still have NULL user_id after migration"
            )
            mock_count = conn.execute(sa.text(
                f"SELECT COUNT(*) FROM {tbl} WHERE user_id = :uid"
            ), {"uid": MOCK_USER_ID}).scalar()
            assert mock_count >= 1, (
                f"{tbl}: pre-inserted row was not backfilled to MOCK user_id"
            )

        # (c) expenses (simple table) also backfilled, zero NULLs
        null_exp = conn.execute(sa.text(
            "SELECT COUNT(*) FROM expenses WHERE user_id IS NULL"
        )).scalar()
        assert null_exp == 0, (
            f"expenses: {null_exp} row(s) still have NULL user_id after migration"
        )

        # (d) Composite PKs are in place — query information_schema
        for tbl, expected_cols in COMPOSITE_PK_TABLES.items():
            pk_cols = conn.execute(sa.text("""
                SELECT kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                 AND tc.table_schema    = kcu.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY'
                  AND tc.table_name      = :tbl
                  AND tc.table_schema    = :schema
                ORDER BY kcu.ordinal_position
            """), {"tbl": tbl, "schema": schema}).scalars().all()

            assert sorted(pk_cols) == sorted(expected_cols), (
                f"{tbl}: expected composite PK columns {sorted(expected_cols)}, "
                f"got {sorted(pk_cols)}"
            )

    engine3.dispose()
