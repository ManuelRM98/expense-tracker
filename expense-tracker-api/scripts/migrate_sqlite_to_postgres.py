#!/usr/bin/env python3
"""
One-shot data migration: copy every row from the local SQLite database into the
target database pointed at by DATABASE_URL (Supabase Postgres).

Prerequisites:
  1. The target schema already exists. Start the backend once against the Supabase
     DATABASE_URL so its lifespan hook runs create_all + stamp head + seed_defaults
     (see SUPABASE-MIGRATION.md, Phase 3). Then run this script.
  2. The target driver is installed:  pip install -r requirements.txt

Usage (from expense-tracker-api/, with the venv active):
    # target comes from DATABASE_URL (set it to the Supabase string for the run)
    DATABASE_URL="postgresql://...pooler.supabase.com:5432/postgres?sslmode=require" \\
        python scripts/migrate_sqlite_to_postgres.py

    # source defaults to ./expense_tracker.db; override with --source
    python scripts/migrate_sqlite_to_postgres.py --source ./expense_tracker.db

Behavior:
  - Read-only against the SQLite source (opened with mode=ro).
  - Copies tables in FK-safe order (SQLAlchemy metadata.sorted_tables).
  - Skips rows whose primary key already exists on the target — so the default
    categories / card types inserted by Phase 3 seeding are not duplicated.
  - Commits the target in a single transaction; rolls back entirely on error.
  - Prints per-table source vs. target row counts at the end for parity checking.
"""
import argparse
import os
import sys
from pathlib import Path

# Backend modules use flat imports (import models) — make them resolvable
# regardless of where this script is invoked from.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine, inspect, select
from sqlalchemy.orm import Session

from database import Base
import models  # noqa: F401 — registers every ORM table on Base.metadata


def _normalize_pg(url: str) -> str:
    """Mirror database.py: map bare postgresql:// to the psycopg (v3) dialect."""
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


def _pk_columns(table):
    return [c.name for c in table.primary_key.columns]


def _pk_value(row_map, pk_cols):
    return tuple(row_map[c] for c in pk_cols)


def migrate(source_url: str, target_url: str) -> int:
    source_engine = create_engine(source_url)
    target_engine = create_engine(_normalize_pg(target_url), pool_pre_ping=True)

    # Guard: refuse to "migrate" into the same SQLite file (no-op / accident).
    if target_engine.url.get_backend_name() == "sqlite":
        print("ERROR: target DATABASE_URL is SQLite. Set it to the Supabase "
              "Postgres connection string before running.", file=sys.stderr)
        return 1

    # Confirm the target schema exists (Phase 3 must have run).
    target_tables = set(inspect(target_engine).get_table_names())
    expected = {t.name for t in Base.metadata.sorted_tables}
    missing = expected - target_tables
    if missing:
        print(f"ERROR: target is missing tables {sorted(missing)}. Start the backend "
              "once against the Supabase DATABASE_URL to create the schema (Phase 3), "
              "then re-run.", file=sys.stderr)
        return 1

    counts = []  # (table_name, source_rows, inserted, skipped, target_total)

    src = Session(source_engine)
    dst = Session(target_engine)
    try:
        # metadata.sorted_tables yields parents before children (FK-safe insert order).
        for table in Base.metadata.sorted_tables:
            pk_cols = _pk_columns(table)
            existing_pks = {
                tuple(r) for r in dst.execute(select(*[table.c[c] for c in pk_cols]))
            }

            source_rows = src.execute(select(table)).mappings().all()
            inserted = skipped = 0
            for row in source_rows:
                row_map = dict(row)
                if _pk_value(row_map, pk_cols) in existing_pks:
                    skipped += 1
                    continue
                dst.execute(table.insert().values(**row_map))
                inserted += 1

            target_total = len(existing_pks) + inserted
            counts.append((table.name, len(source_rows), inserted, skipped, target_total))

        dst.commit()
    except Exception:
        dst.rollback()
        raise
    finally:
        src.close()
        dst.close()

    # ── Parity report ───────────────────────────────────────────────────────────
    print("\nMigration complete. Per-table report:\n")
    header = f"{'table':<26}{'source':>8}{'inserted':>10}{'skipped':>9}{'target':>8}"
    print(header)
    print("-" * len(header))
    for name, srcn, ins, skip, tgt in counts:
        print(f"{name:<26}{srcn:>8}{ins:>10}{skip:>9}{tgt:>8}")
    print("\nVerify: for each table, target == source (+ any default-seeded rows "
          "that were skipped).")
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        default="./expense_tracker.db",
        help="Path to the source SQLite file (default: ./expense_tracker.db)",
    )
    parser.add_argument(
        "--target",
        default=os.getenv("DATABASE_URL", ""),
        help="Target SQLAlchemy URL (default: $DATABASE_URL).",
    )
    args = parser.parse_args()

    source_path = Path(args.source).resolve()
    if not source_path.exists():
        print(f"ERROR: source SQLite file not found: {source_path}", file=sys.stderr)
        return 1
    if not args.target:
        print("ERROR: no target set. Provide --target or set DATABASE_URL to the "
              "Supabase connection string.", file=sys.stderr)
        return 1

    # Open SQLite read-only so the source is never mutated.
    source_url = f"sqlite:///file:{source_path}?mode=ro&uri=true"
    print(f"Source: {source_path} (read-only)")
    print(f"Target: {args.target.split('@')[-1] if '@' in args.target else args.target}")
    return migrate(source_url, args.target)


if __name__ == "__main__":
    raise SystemExit(main())
