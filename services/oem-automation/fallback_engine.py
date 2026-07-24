"""Telemetry + cache fallback engine for OEM data pipeline."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from config import load_settings
from db.connection import get_conn

logger = logging.getLogger(__name__)


class FallbackEngine:
    """Batch telemetry updates and stale-cache marking + SQL labor averages."""

    def update_telemetry_batch(self, events: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        settings = load_settings()
        batch = events or []
        stale_marked = 0
        try:
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        '''
                        SELECT COUNT(*) FROM "ScraperSource" WHERE status = 'degraded'
                        '''
                    )
                    degraded_count = cur.fetchone()[0]
                    if degraded_count:
                        stale_marked = degraded_count
        except Exception as exc:  # noqa: BLE001
            logger.warning("FallbackEngine telemetry stub: %s", exc)

        return {
            "events_received": len(batch),
            "stale_sources_marked": stale_marked,
            "stale_threshold_days": settings.stale_days,
            "recorded_at": datetime.now(timezone.utc).isoformat(),
        }

    def lookup_average_hours(self, vehicle_id: str, operation_id: str) -> float | None:
        """Average labor hours from LaborOperation table (stub-friendly)."""
        try:
            with get_conn() as conn:
                with conn.cursor() as cur:
                    parts = vehicle_id.split("|")
                    year = int(parts[0]) if parts and parts[0].isdigit() else None
                    make = parts[1] if len(parts) > 1 else None
                    needle = operation_id.lower().replace("_", " ")
                    cur.execute(
                        '''
                        SELECT AVG("laborHoursPerUnit")
                        FROM "LaborOperation"
                        WHERE (%s IS NULL OR "vehicleYear" = %s)
                          AND (%s IS NULL OR LOWER("vehicleMake") = LOWER(%s))
                          AND (
                            LOWER("queryText") LIKE %s
                            OR LOWER("jobName") LIKE %s
                          )
                        ''',
                        (
                            year,
                            year,
                            make,
                            make,
                            f"%{needle}%",
                            f"%{needle}%",
                        ),
                    )
                    row = cur.fetchone()
                    if row and row[0] is not None:
                        return round(float(row[0]), 2)
        except Exception as exc:  # noqa: BLE001
            logger.debug("Labor average lookup unavailable: %s", exc)
        return None
