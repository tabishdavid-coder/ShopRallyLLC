"""Learn part/fluid associations from closed repair orders."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from db.connection import get_conn

logger = logging.getLogger(__name__)


class AssociationLearner:
    """Updates association weights from completed RO part/labor lines."""

    def update_from_repair_orders(self, since: datetime | None = None) -> dict[str, Any]:
        since_dt = since or datetime.now(timezone.utc) - timedelta(days=1)
        updated = 0
        skipped = 0
        try:
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        '''
                        SELECT ro.id, ro."shopId", v.year, v.make, v.model,
                               pl.description, pl."partNumber"
                        FROM "RepairOrder" ro
                        JOIN "Vehicle" v ON v.id = ro."vehicleId"
                        LEFT JOIN "Job" j ON j."repairOrderId" = ro.id
                        LEFT JOIN "PartLine" pl ON pl."jobId" = j.id
                        WHERE ro.status = 'COMPLETED'
                          AND ro."updatedAt" >= %s
                          AND pl.id IS NOT NULL
                        LIMIT 500
                        ''',
                        (since_dt,),
                    )
                    rows = cur.fetchall()
                    updated = len(rows)
        except Exception as exc:  # noqa: BLE001
            logger.warning("AssociationLearner DB read failed (stub mode): %s", exc)
            skipped = 1

        return {
            "since": since_dt.isoformat(),
            "associations_processed": updated,
            "skipped": skipped,
            "note": "Weights stored in future vehicle_association table",
        }
