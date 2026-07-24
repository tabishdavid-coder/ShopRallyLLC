"""PostgreSQL connection helpers (psycopg3)."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator, Sequence

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError as exc:  # pragma: no cover
    psycopg = None  # type: ignore
    dict_row = None  # type: ignore
    _IMPORT_ERROR = exc
else:
    _IMPORT_ERROR = None

from config.settings import settings


def _require_psycopg() -> None:
    if psycopg is None:
        raise RuntimeError(
            "psycopg is required for database access. "
            "pip install -r requirements.txt"
        ) from _IMPORT_ERROR


def connect():
    _require_psycopg()
    return psycopg.connect(settings.database_url, row_factory=dict_row)


@contextmanager
def db_cursor() -> Iterator[Any]:
    _require_psycopg()
    with connect() as conn:
        with conn.cursor() as cur:
            yield cur
        conn.commit()


def fetch_one(sql: str, params: Sequence[Any] | None = None) -> dict[str, Any] | None:
    with db_cursor() as cur:
        cur.execute(sql, params or ())
        return cur.fetchone()


def fetch_all(sql: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
    with db_cursor() as cur:
        cur.execute(sql, params or ())
        return list(cur.fetchall())


def execute(sql: str, params: Sequence[Any] | None = None) -> None:
    with db_cursor() as cur:
        cur.execute(sql, params or ())


def execute_returning(sql: str, params: Sequence[Any] | None = None) -> dict[str, Any] | None:
    with db_cursor() as cur:
        cur.execute(sql, params or ())
        return cur.fetchone()
