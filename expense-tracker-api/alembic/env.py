import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv

# Make the app modules importable from the alembic/ subdirectory
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

load_dotenv()

# Alembic Config object — provides access to values in alembic.ini
alembic_config = context.config

# Wire DATABASE_URL from environment (overrides the placeholder in alembic.ini)
database_url = os.getenv("DATABASE_URL", "sqlite:///./expense_tracker.db")
alembic_config.set_main_option("sqlalchemy.url", database_url)

# Set up loggers from alembic.ini
if alembic_config.config_file_name is not None:
    fileConfig(alembic_config.config_file_name)

# Import models so Alembic can detect the full schema for autogenerate
import models  # noqa: F401 — registers all ORM classes on Base.metadata
from database import Base

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (generates SQL without a live connection)."""
    url = alembic_config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,   # required for SQLite ALTER TABLE support
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (applies directly to the connected DB)."""
    connectable = engine_from_config(
        alembic_config.get_section(alembic_config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,   # required for SQLite ALTER TABLE support
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
