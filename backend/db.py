"""
Database connection helper. If DATABASE_URL is set, services query the
real PostgreSQL/PostGIS database (scripts/init_db.sql + seed_db.py).
If not set, services fall back to reading the same real data directly
from CSV/JSON (data/processed/, data/geo/) — this is not a synthetic
fallback, it's the same real Census/GIS data, just read a different way.
"""
import os
from contextlib import contextmanager

DATABASE_URL = os.environ.get("DATABASE_URL")

_pool = None


def is_db_enabled() -> bool:
    return bool(DATABASE_URL)


def _get_pool():
    global _pool
    if _pool is None:
        import psycopg2.pool
        _pool = psycopg2.pool.SimpleConnectionPool(1, 10, DATABASE_URL)
    return _pool


@contextmanager
def get_cursor():
    """Yields a real psycopg2 cursor from the pool; commits on success."""
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL not set — db module should not be used")
    pool = _get_pool()
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)
