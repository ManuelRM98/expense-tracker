import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./expense_tracker.db")

# Normalize the URL scheme so the Supabase dashboard connection string works as-is.
# SQLAlchemy maps a bare "postgresql://" to the psycopg2 driver, but we ship psycopg
# (v3); rewrite to the explicit "postgresql+psycopg://" dialect.
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len("postgresql://"):]

# connect_args is only required by SQLite — PostgreSQL ignores it
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# pool_pre_ping: Supabase's connection pooler drops idle connections; this validates
# a connection before use and transparently reconnects. Harmless for SQLite.
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)

# BUG-04: Enable FK enforcement for SQLite connections.
# Without PRAGMA foreign_keys=ON, SQLite silently ignores CASCADE/RESTRICT rules.
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and closes it when done."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
