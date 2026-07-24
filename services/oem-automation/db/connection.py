"""Postgres connection helpers."""

from __future__ import annotations

import json
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator

import psycopg2
import psycopg2.extras

from config import load_settings


@contextmanager
def get_conn() -> Iterator[Any]:
    settings = load_settings()
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is required for OEM automation")
    conn = psycopg2.connect(settings.database_url)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def fetch_active_sources() -> list[dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                '''
                SELECT id, "sourceName", "baseUrl", endpoints, selectors, status, priority,
                       "originalPriority", "healthStatus", "lastHealthyCheck", "lastAttempted",
                       "successCount", "failureCount", "lastError", "updatedAt"
                FROM "ScraperSource"
                WHERE status = 'active'
                ORDER BY priority ASC, "sourceName" ASC
                '''
            )
            return [dict(row) for row in cur.fetchall()]


def fetch_all_sources() -> list[dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                '''
                SELECT id, "sourceName", "baseUrl", endpoints, selectors, status, priority,
                       "originalPriority", "healthStatus", "lastHealthyCheck", "lastAttempted",
                       "successCount", "failureCount", "lastError", "updatedAt"
                FROM "ScraperSource"
                ORDER BY priority ASC, "sourceName" ASC
                '''
            )
            return [dict(row) for row in cur.fetchall()]


def fetch_source_by_name(source_name: str) -> dict[str, Any] | None:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                '''
                SELECT id, "sourceName", "baseUrl", endpoints, selectors, status, priority,
                       "originalPriority", "healthStatus", "lastHealthyCheck", "lastAttempted",
                       "successCount", "failureCount", "lastError", "updatedAt"
                FROM "ScraperSource"
                WHERE "sourceName" = %s
                ''',
                (source_name,),
            )
            row = cur.fetchone()
            return dict(row) if row else None


def update_source_health(
    source_id: str,
    *,
    status: str,
    last_error: str | None,
    mark_healthy: bool,
) -> None:
    now = datetime.now(timezone.utc)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                '''
                UPDATE "ScraperSource"
                SET status = %s::"ScraperSourceStatus",
                    "lastError" = %s,
                    "lastHealthyCheck" = CASE WHEN %s THEN %s ELSE "lastHealthyCheck" END,
                    "updatedAt" = %s
                WHERE id = %s
                ''',
                (status, last_error, mark_healthy, now, now, source_id),
            )


def insert_health_alert(
    *,
    source_id: str | None,
    source_name: str,
    severity: str,
    message: str,
    detail: dict[str, Any] | None = None,
) -> str:
    alert_id = str(uuid.uuid4())
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                '''
                INSERT INTO "HealthAlert"
                  (id, "sourceId", "sourceName", severity, message, detail, "createdAt")
                VALUES (%s, %s, %s, %s::"HealthAlertSeverity", %s, %s, %s)
                ''',
                (
                    alert_id,
                    source_id,
                    source_name,
                    severity,
                    message,
                    json.dumps(detail) if detail else None,
                    datetime.now(timezone.utc),
                ),
            )
    return alert_id


def start_job_run(job_name: str, next_scheduled_at: datetime | None = None) -> str:
    run_id = str(uuid.uuid4())
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                '''
                INSERT INTO "AutomationJobRun"
                  (id, "jobName", "startedAt", status, "nextScheduledAt")
                VALUES (%s, %s, %s, 'running', %s)
                ''',
                (run_id, job_name, datetime.now(timezone.utc), next_scheduled_at),
            )
    return run_id


def finish_job_run(
    run_id: str,
    *,
    status: str,
    detail: dict[str, Any] | None = None,
    error_message: str | None = None,
) -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                '''
                UPDATE "AutomationJobRun"
                SET "finishedAt" = %s,
                    status = %s::"AutomationJobStatus",
                    detail = %s,
                    "errorMessage" = %s
                WHERE id = %s
                ''',
                (
                    datetime.now(timezone.utc),
                    status,
                    json.dumps(detail) if detail else None,
                    error_message,
                    run_id,
                ),
            )


def record_source_attempt(
    source_id: str,
    *,
    success: bool,
    response_time_ms: int | None = None,
    health_status: str = "unknown",
    error_message: str | None = None,
) -> None:
    now = datetime.now(timezone.utc)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                '''
                UPDATE "ScraperSource"
                SET "lastAttempted" = %s,
                    "successCount" = "successCount" + %s,
                    "failureCount" = "failureCount" + %s,
                    "healthStatus" = %s::"ScraperSourceHealthStatus",
                    "lastHealthyCheck" = CASE WHEN %s THEN %s ELSE "lastHealthyCheck" END,
                    "lastError" = CASE WHEN %s THEN NULL ELSE COALESCE(%s, "lastError") END,
                    "updatedAt" = %s
                WHERE id = %s
                ''',
                (
                    now,
                    1 if success else 0,
                    0 if success else 1,
                    health_status,
                    success,
                    now,
                    success,
                    error_message,
                    now,
                    source_id,
                ),
            )


def insert_source_health_log(
    *,
    source_id: str,
    status: str,
    response_time_ms: int | None = None,
    error_message: str | None = None,
) -> str:
    log_id = str(uuid.uuid4())
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                '''
                INSERT INTO "SourceHealthLog"
                  (id, "sourceId", "timestamp", status, "responseTimeMs", "errorMessage")
                VALUES (%s, %s, %s, %s::"ScraperSourceHealthStatus", %s, %s)
                ''',
                (
                    log_id,
                    source_id,
                    datetime.now(timezone.utc),
                    status,
                    response_time_ms,
                    error_message,
                ),
            )
    return log_id


def insert_fallback_event(
    *,
    data_type: str,
    primary_source: str | None,
    fallback_source: str | None,
    success: bool,
    details: dict[str, Any] | None = None,
) -> str:
    event_id = str(uuid.uuid4())
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                '''
                INSERT INTO "FallbackEvent"
                  (id, "timestamp", "dataType", "primarySource", "fallbackSource", success, details)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ''',
                (
                    event_id,
                    datetime.now(timezone.utc),
                    data_type,
                    primary_source,
                    fallback_source,
                    success,
                    json.dumps(details) if details else None,
                ),
            )
    return event_id


def fetch_recent_fallback_events(limit: int = 25) -> list[dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                '''
                SELECT id, "timestamp", "dataType", "primarySource", "fallbackSource",
                       success, details
                FROM "FallbackEvent"
                ORDER BY "timestamp" DESC
                LIMIT %s
                ''',
                (limit,),
            )
            return [dict(row) for row in cur.fetchall()]


def fetch_source_health_summary(limit: int = 50) -> list[dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                '''
                SELECT l.id, l."sourceId", s."sourceName", l."timestamp", l.status,
                       l."responseTimeMs", l."errorMessage"
                FROM "SourceHealthLog" l
                JOIN "ScraperSource" s ON s.id = l."sourceId"
                ORDER BY l."timestamp" DESC
                LIMIT %s
                ''',
                (limit,),
            )
            return [dict(row) for row in cur.fetchall()]


def get_consecutive_health_outcomes(source_id: str, limit: int = 2) -> list[bool]:
    """Return recent probe outcomes (True=healthy) newest-first."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                '''
                SELECT status FROM "SourceHealthLog"
                WHERE "sourceId" = %s
                ORDER BY "timestamp" DESC
                LIMIT %s
                ''',
                (source_id, limit),
            )
            rows = cur.fetchall()
    return [row[0] == "healthy" for row in rows]


def degrade_source_priority(source_id: str, *, original_priority: int) -> None:
    now = datetime.now(timezone.utc)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                '''
                UPDATE "ScraperSource"
                SET status = 'degraded'::"ScraperSourceStatus",
                    priority = 999,
                    "originalPriority" = COALESCE("originalPriority", %s),
                    "healthStatus" = 'degraded'::"ScraperSourceHealthStatus",
                    "updatedAt" = %s
                WHERE id = %s
                ''',
                (original_priority, now, source_id),
            )


def restore_source_priority(source_id: str) -> None:
    now = datetime.now(timezone.utc)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                '''
                UPDATE "ScraperSource"
                SET status = 'active'::"ScraperSourceStatus",
                    priority = COALESCE("originalPriority", priority),
                    "originalPriority" = NULL,
                    "healthStatus" = 'healthy'::"ScraperSourceHealthStatus",
                    "lastError" = NULL,
                    "lastHealthyCheck" = %s,
                    "updatedAt" = %s
                WHERE id = %s
                ''',
                (now, now, source_id),
            )
