"""
Association learning engine
===========================
Learns frequently-combined jobs from closed repair_order_lines telemetry.

Callable as a scheduled task or after each repair-order close.
Uses batch SQL for large datasets (no per-pair Python loops against the DB).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from src.db import connect, execute, fetch_all, fetch_one

logger = logging.getLogger("tfl.assoc.learner")

# Promote new pairs above this frequency; demote active pairs below this.
PROMOTE_THRESHOLD = 10.0
DEMOTE_THRESHOLD = 5.0


@dataclass
class LearnerResult:
    orders_scanned: int
    pairs_staged: int
    associations_updated: int
    associations_inserted: int
    associations_deactivated: int

    def as_dict(self) -> dict[str, Any]:
        return {
            "orders_scanned": self.orders_scanned,
            "pairs_staged": self.pairs_staged,
            "associations_updated": self.associations_updated,
            "associations_inserted": self.associations_inserted,
            "associations_deactivated": self.associations_deactivated,
        }


class AssociationLearner:
    """
    Rebuilds co-occurrence stats from closed repair orders and upserts
    ``operation_associations`` with frequency_score / avg_combined_labor /
    overlap_discount.
    """

    def __init__(
        self,
        *,
        promote_threshold: float = PROMOTE_THRESHOLD,
        demote_threshold: float = DEMOTE_THRESHOLD,
    ) -> None:
        self.promote_threshold = promote_threshold
        self.demote_threshold = demote_threshold

    def update_from_repair_orders(self, db_conn: Any | None = None) -> dict[str, Any]:
        """
        Query closed repair orders (lines grouped by repair_order_id) and update
        association scores in batch.

        ``db_conn`` may be a psycopg connection; when None, uses the shared pool helper.
        """
        if db_conn is not None:
            return self._run_on_conn(db_conn).as_dict()

        with connect() as conn:
            result = self._run_on_conn(conn)
            conn.commit()
            return result.as_dict()

    def _run_on_conn(self, conn: Any) -> LearnerResult:
        with conn.cursor() as cur:
            # Count closed orders
            cur.execute(
                """
                SELECT COUNT(DISTINCT repair_order_id) AS n
                FROM repair_order_lines
                WHERE is_closed = true
                  AND operation_id IS NOT NULL
                """
            )
            orders_scanned = int((cur.fetchone() or {}).get("n") or 0)

            # Rebuild staging in one shot
            cur.execute("TRUNCATE association_cooccurrence_staging")

            # Directed pairs (A primary → B associated) for every unordered pair on an order.
            # Also capture sum of actual_hours when at least one line has a recorded time.
            cur.execute(
                """
                WITH closed AS (
                  SELECT
                    repair_order_id,
                    operation_id,
                    COALESCE(actual_hours, 0) AS hrs,
                    (actual_hours IS NOT NULL) AS has_time
                  FROM repair_order_lines
                  WHERE is_closed = true
                    AND operation_id IS NOT NULL
                ),
                appearances AS (
                  SELECT operation_id, COUNT(DISTINCT repair_order_id) AS n
                  FROM closed
                  GROUP BY operation_id
                ),
                pairs AS (
                  SELECT
                    a.repair_order_id,
                    a.operation_id AS primary_operation_id,
                    b.operation_id AS associated_operation_id,
                    a.hrs + b.hrs AS pair_hours,
                    (a.has_time OR b.has_time) AS timed
                  FROM closed a
                  JOIN closed b
                    ON a.repair_order_id = b.repair_order_id
                   AND a.operation_id <> b.operation_id
                ),
                agg AS (
                  SELECT
                    primary_operation_id,
                    associated_operation_id,
                    COUNT(*)::integer AS co_count,
                    COALESCE(SUM(pair_hours) FILTER (WHERE timed), 0) AS combined_hours_sum,
                    COUNT(*) FILTER (WHERE timed)::integer AS combined_hours_n
                  FROM pairs
                  GROUP BY primary_operation_id, associated_operation_id
                )
                INSERT INTO association_cooccurrence_staging (
                  primary_operation_id, associated_operation_id,
                  co_count, primary_appearances, combined_hours_sum, combined_hours_n
                )
                SELECT
                  agg.primary_operation_id,
                  agg.associated_operation_id,
                  agg.co_count,
                  COALESCE(ap.n, 0)::integer,
                  agg.combined_hours_sum,
                  agg.combined_hours_n
                FROM agg
                LEFT JOIN appearances ap ON ap.operation_id = agg.primary_operation_id
                """
            )

            cur.execute("SELECT COUNT(*) AS n FROM association_cooccurrence_staging")
            pairs_staged = int((cur.fetchone() or {}).get("n") or 0)

            # Standalone averages: prefer labor_time_matrix.telemetry_score when sample_count > 0,
            # else AVG(actual_hours) from closed lines, else service_operations.standard_hours.
            cur.execute(
                """
                CREATE TEMP TABLE IF NOT EXISTS _standalone_hrs ON COMMIT DROP AS
                WITH telemetry AS (
                  SELECT
                    operation_id,
                    AVG(telemetry_score) FILTER (WHERE sample_count > 0 AND telemetry_score > 0)
                      AS telem_avg
                  FROM labor_time_matrix
                  GROUP BY operation_id
                ),
                clocked AS (
                  SELECT
                    operation_id,
                    AVG(actual_hours) FILTER (WHERE actual_hours IS NOT NULL) AS clock_avg
                  FROM repair_order_lines
                  WHERE is_closed = true
                  GROUP BY operation_id
                )
                SELECT
                  so.id AS operation_id,
                  COALESCE(t.telem_avg, c.clock_avg, so.standard_hours, 0)::numeric(5,2)
                    AS standalone_hours
                FROM service_operations so
                LEFT JOIN telemetry t ON t.operation_id = so.id
                LEFT JOIN clocked c ON c.operation_id = so.id
                """
            )

            # Upsert existing + insert new above promote threshold
            cur.execute(
                """
                WITH scored AS (
                  SELECT
                    s.primary_operation_id,
                    s.associated_operation_id,
                    CASE
                      WHEN s.primary_appearances > 0
                      THEN ROUND((s.co_count::numeric / s.primary_appearances) * 100, 2)
                      ELSE 0
                    END AS frequency_score,
                    CASE
                      WHEN s.combined_hours_n > 0
                      THEN ROUND(s.combined_hours_sum / s.combined_hours_n, 2)
                      ELSE NULL
                    END AS avg_combined_labor,
                    sa.standalone_hours AS primary_standalone,
                    sb.standalone_hours AS associated_standalone
                  FROM association_cooccurrence_staging s
                  JOIN _standalone_hrs sa ON sa.operation_id = s.primary_operation_id
                  JOIN _standalone_hrs sb ON sb.operation_id = s.associated_operation_id
                ),
                prepared AS (
                  SELECT
                    primary_operation_id,
                    associated_operation_id,
                    frequency_score,
                    avg_combined_labor,
                    GREATEST(
                      0,
                      ROUND(
                        (primary_standalone + associated_standalone)
                        - COALESCE(
                            avg_combined_labor,
                            primary_standalone + associated_standalone
                          ),
                        2
                      )
                    ) AS overlap_discount,
                    (frequency_score >= %s) AS should_active
                  FROM scored
                ),
                upserted AS (
                  INSERT INTO operation_associations (
                    primary_operation_id, associated_operation_id, association_type,
                    frequency_score, avg_combined_labor, overlap_discount,
                    is_active, last_updated
                  )
                  SELECT
                    primary_operation_id,
                    associated_operation_id,
                    'add_on',
                    frequency_score,
                    avg_combined_labor,
                    overlap_discount,
                    should_active,
                    now()
                  FROM prepared
                  WHERE frequency_score >= %s
                     OR EXISTS (
                       SELECT 1 FROM operation_associations oa
                       WHERE oa.primary_operation_id = prepared.primary_operation_id
                         AND oa.associated_operation_id = prepared.associated_operation_id
                     )
                  ON CONFLICT (primary_operation_id, associated_operation_id) DO UPDATE SET
                    frequency_score = EXCLUDED.frequency_score,
                    avg_combined_labor = COALESCE(
                      EXCLUDED.avg_combined_labor,
                      operation_associations.avg_combined_labor
                    ),
                    overlap_discount = EXCLUDED.overlap_discount,
                    is_active = CASE
                      WHEN EXCLUDED.frequency_score < %s THEN false
                      WHEN EXCLUDED.frequency_score >= %s THEN true
                      ELSE operation_associations.is_active
                    END,
                    last_updated = now()
                  RETURNING
                    (xmax = 0) AS inserted
                )
                SELECT
                  COUNT(*) FILTER (WHERE inserted) AS inserted,
                  COUNT(*) FILTER (WHERE NOT inserted) AS updated
                FROM upserted
                """,
                (
                    self.promote_threshold,  # should_active
                    self.promote_threshold,  # insert new pairs at/above promote
                    self.demote_threshold,
                    self.promote_threshold,
                ),
            )
            row = cur.fetchone() or {}
            inserted = int(row.get("inserted") or 0)
            updated = int(row.get("updated") or 0)

            # Deactivate known pairs that fell below demote threshold (or vanished)
            cur.execute(
                """
                UPDATE operation_associations oa
                SET is_active = false,
                    last_updated = now()
                WHERE oa.is_active = true
                  AND (
                    NOT EXISTS (
                      SELECT 1 FROM association_cooccurrence_staging s
                      WHERE s.primary_operation_id = oa.primary_operation_id
                        AND s.associated_operation_id = oa.associated_operation_id
                    )
                    OR EXISTS (
                      SELECT 1 FROM association_cooccurrence_staging s
                      WHERE s.primary_operation_id = oa.primary_operation_id
                        AND s.associated_operation_id = oa.associated_operation_id
                        AND s.primary_appearances > 0
                        AND (s.co_count::numeric / s.primary_appearances) * 100 < %s
                    )
                  )
                  -- Do not demote industry seeds that have never seen telemetry yet
                  AND EXISTS (
                    SELECT 1 FROM repair_order_lines r
                    WHERE r.is_closed = true
                      AND r.operation_id = oa.primary_operation_id
                  )
                """,
                (self.demote_threshold,),
            )
            deactivated = cur.rowcount or 0

        logger.info(
            "AssociationLearner: orders=%s pairs=%s inserted=%s updated=%s deactivated=%s",
            orders_scanned,
            pairs_staged,
            inserted,
            updated,
            deactivated,
        )
        return LearnerResult(
            orders_scanned=orders_scanned,
            pairs_staged=pairs_staged,
            associations_updated=updated,
            associations_inserted=inserted,
            associations_deactivated=deactivated,
        )

    def on_repair_order_closed(self, repair_order_id: str) -> dict[str, Any]:
        """Mark lines closed and refresh association scores."""
        execute(
            """
            UPDATE repair_order_lines
            SET is_closed = true,
                closed_at = COALESCE(closed_at, now())
            WHERE repair_order_id = %s
            """,
            (repair_order_id,),
        )
        return self.update_from_repair_orders()


def update_associations_from_repair_orders() -> dict[str, Any]:
    """Module-level entry for schedulers / cron."""
    return AssociationLearner().update_from_repair_orders()
