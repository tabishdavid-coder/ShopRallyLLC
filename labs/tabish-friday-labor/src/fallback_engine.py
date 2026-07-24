"""
Dynamic Resolution & Fallback Engine
====================================
Lookup chain for missing vehicle×operation labor:

  L0 exact labor_time_matrix
  L1 pgvector top-3 neighbors → weighted median hours
  L2 chassis_multipliers scale neighbor → request tier
  return provisional {'estimated'} row (+ optional persist)

Also:
  - EMA telemetry update after real job closeout
  - async parts placeholder enqueue (Redis or in-process queue)
"""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from decimal import Decimal
from statistics import median
from typing import Any
from uuid import UUID

from src.db import execute, execute_returning, fetch_all, fetch_one

logger = logging.getLogger(__name__)

EMA_ALPHA = Decimal("0.20")
AUTO_PROMOTE_SAMPLES = 5


@dataclass
class LaborResolveResult:
    vehicle_id: str
    operation_id: str
    base_labor_hrs: float
    status: str  # verified | estimated | provisional
    confidence: float
    path: str  # L0_EXACT | L1_VECTOR | L2_CHASSIS | MISS
    neighbor_vehicle_ids: list[str]
    multiplier_applied: float
    matrix_id: str | None
    details: dict[str, Any]

    def as_dict(self) -> dict[str, Any]:
        return {
            "vehicle_id": self.vehicle_id,
            "operation_id": self.operation_id,
            "base_labor_hrs": self.base_labor_hrs,
            "status": self.status,
            "confidence": self.confidence,
            "path": self.path,
            "neighbor_vehicle_ids": self.neighbor_vehicle_ids,
            "multiplier_applied": self.multiplier_applied,
            "matrix_id": self.matrix_id,
            "details": self.details,
        }


def _weighted_median(pairs: list[tuple[float, float]]) -> float:
    """pairs = [(hours, weight)]."""
    if not pairs:
        raise ValueError("no neighbor hours")
    # Expand by discrete weight buckets for a simple weighted median.
    expanded: list[float] = []
    for hours, weight in pairs:
        n = max(1, int(round(weight * 100)))
        expanded.extend([hours] * n)
    return float(median(expanded))


def _distance_to_weight(distance: float) -> float:
    # cosine distance; closer → higher weight
    return max(0.05, 1.0 - min(distance, 0.95))


class FallbackEngine:
    def __init__(self, *, persist_estimates: bool = True) -> None:
        self.persist_estimates = persist_estimates

    def resolve_labor(
        self,
        vehicle_id: str | UUID,
        operation_id: str | UUID,
    ) -> LaborResolveResult:
        vid = str(vehicle_id)
        oid = str(operation_id)

        exact = fetch_one(
            """
            SELECT id, base_labor_hrs, status, confidence
            FROM labor_time_matrix
            WHERE vehicle_id = %s AND operation_id = %s
            """,
            (vid, oid),
        )
        if exact:
            return LaborResolveResult(
                vehicle_id=vid,
                operation_id=oid,
                base_labor_hrs=float(exact["base_labor_hrs"]),
                status=str(exact["status"]),
                confidence=float(exact["confidence"]),
                path="L0_EXACT",
                neighbor_vehicle_ids=[],
                multiplier_applied=1.0,
                matrix_id=str(exact["id"]),
                details={"source": "exact"},
            )

        target = fetch_one(
            "SELECT id, chassis_tier, embedding FROM vehicle_taxonomy WHERE id = %s",
            (vid,),
        )
        if not target:
            raise LookupError(f"vehicle_taxonomy not found: {vid}")

        neighbors = self._vector_neighbors(vid, oid, k=3)
        if not neighbors:
            return LaborResolveResult(
                vehicle_id=vid,
                operation_id=oid,
                base_labor_hrs=0.0,
                status="estimated",
                confidence=0.0,
                path="MISS",
                neighbor_vehicle_ids=[],
                multiplier_applied=1.0,
                matrix_id=None,
                details={"reason": "no_vector_neighbors_with_labor"},
            )

        pairs = [
            (float(n["base_labor_hrs"]), _distance_to_weight(float(n["distance"])))
            for n in neighbors
        ]
        wm = _weighted_median(pairs)
        best = neighbors[0]
        from_tier = str(best["chassis_tier"])
        to_tier = str(target["chassis_tier"])
        mult_row = fetch_one(
            """
            SELECT multiplier FROM chassis_multipliers
            WHERE from_tier = %s::chassis_tier AND to_tier = %s::chassis_tier
            """,
            (from_tier, to_tier),
        )
        multiplier = float(mult_row["multiplier"]) if mult_row else 1.0
        scaled = round(wm * multiplier, 2)
        confidence = round(min(0.85, 0.55 + pairs[0][1] * 0.3), 3)
        path = "L2_CHASSIS" if multiplier != 1.0 else "L1_VECTOR"

        matrix_id = None
        if self.persist_estimates:
            row = execute_returning(
                """
                INSERT INTO labor_time_matrix (
                  vehicle_id, operation_id, base_labor_hrs, telemetry_score,
                  sample_count, status, confidence, inherited_from_id, last_updated
                ) VALUES (
                  %s, %s, %s, 0, 0, 'estimated', %s, %s, now()
                )
                ON CONFLICT (vehicle_id, operation_id) DO UPDATE
                  SET base_labor_hrs = EXCLUDED.base_labor_hrs,
                      confidence = EXCLUDED.confidence,
                      status = 'estimated',
                      inherited_from_id = EXCLUDED.inherited_from_id,
                      last_updated = now()
                RETURNING id
                """,
                (vid, oid, scaled, confidence, best["matrix_id"]),
            )
            matrix_id = str(row["id"]) if row else None

        return LaborResolveResult(
            vehicle_id=vid,
            operation_id=oid,
            base_labor_hrs=scaled,
            status="estimated",
            confidence=confidence,
            path=path,
            neighbor_vehicle_ids=[str(n["vehicle_id"]) for n in neighbors],
            multiplier_applied=multiplier,
            matrix_id=matrix_id,
            details={
                "weighted_median_hours": wm,
                "from_tier": from_tier,
                "to_tier": to_tier,
                "neighbor_distances": [float(n["distance"]) for n in neighbors],
            },
        )

    def _vector_neighbors(
        self, vehicle_id: str, operation_id: str, k: int = 3
    ) -> list[dict[str, Any]]:
        # Prefer true pgvector k-NN when embedding present; else chassis/YMM heuristic.
        has_emb = fetch_one(
            "SELECT embedding IS NOT NULL AS ok FROM vehicle_taxonomy WHERE id = %s",
            (vehicle_id,),
        )
        if has_emb and has_emb["ok"]:
            return fetch_all(
                """
                SELECT
                  vt.id AS vehicle_id,
                  vt.chassis_tier,
                  ltm.id AS matrix_id,
                  ltm.base_labor_hrs,
                  (vt.embedding <=> src.embedding) AS distance
                FROM vehicle_taxonomy src
                JOIN vehicle_taxonomy vt ON vt.id <> src.id AND vt.embedding IS NOT NULL
                JOIN labor_time_matrix ltm
                  ON ltm.vehicle_id = vt.id AND ltm.operation_id = %s
                WHERE src.id = %s
                ORDER BY vt.embedding <=> src.embedding
                LIMIT %s
                """,
                (operation_id, vehicle_id, k),
            )

        # Offline / no-embedding fallback: same make+model family first, else any with labor
        return fetch_all(
            """
            SELECT
              vt.id AS vehicle_id,
              vt.chassis_tier,
              ltm.id AS matrix_id,
              ltm.base_labor_hrs,
              CASE
                WHEN vt.make = src.make AND vt.model = src.model THEN 0.08
                WHEN vt.make = src.make THEN 0.15
                ELSE 0.35
              END AS distance
            FROM vehicle_taxonomy src
            JOIN vehicle_taxonomy vt ON vt.id <> src.id
            JOIN labor_time_matrix ltm
              ON ltm.vehicle_id = vt.id AND ltm.operation_id = %s
            WHERE src.id = %s
            ORDER BY distance ASC, abs(vt.model_year - src.model_year) ASC
            LIMIT %s
            """,
            (operation_id, vehicle_id, k),
        )

    def apply_telemetry(
        self,
        matrix_id: str | UUID,
        actual_hours: float,
    ) -> dict[str, Any]:
        """EMA update of telemetry_score; promote base_labor_hrs after N samples."""
        row = fetch_one(
            """
            SELECT id, base_labor_hrs, telemetry_score, sample_count
            FROM labor_time_matrix WHERE id = %s FOR UPDATE
            """,
            (str(matrix_id),),
        )
        if not row:
            # FOR UPDATE outside txn may not lock; re-read
            row = fetch_one(
                "SELECT id, base_labor_hrs, telemetry_score, sample_count FROM labor_time_matrix WHERE id = %s",
                (str(matrix_id),),
            )
        if not row:
            raise LookupError(f"labor_time_matrix not found: {matrix_id}")

        prev = Decimal(str(row["telemetry_score"]))
        actual = Decimal(str(actual_hours))
        sample_count = int(row["sample_count"])
        if sample_count == 0 or prev == 0:
            new_score = actual
        else:
            new_score = (EMA_ALPHA * actual) + ((Decimal("1") - EMA_ALPHA) * prev)
        new_score = new_score.quantize(Decimal("0.001"))
        new_count = sample_count + 1

        base = Decimal(str(row["base_labor_hrs"]))
        status = "estimated"
        if new_count >= AUTO_PROMOTE_SAMPLES:
            # Blend factory/base toward telemetry
            base = ((Decimal("0.70") * base) + (Decimal("0.30") * new_score)).quantize(
                Decimal("0.01")
            )
            status = "verified"

        updated = execute_returning(
            """
            UPDATE labor_time_matrix
            SET telemetry_score = %s,
                sample_count = %s,
                base_labor_hrs = %s,
                status = %s,
                confidence = LEAST(0.99, confidence + 0.05),
                last_updated = now()
            WHERE id = %s
            RETURNING *
            """,
            (new_score, new_count, base, status, str(matrix_id)),
        )
        execute(
            """
            INSERT INTO labor_telemetry_events (
              labor_time_matrix_id, actual_hours, previous_telemetry, new_telemetry
            ) VALUES (%s, %s, %s, %s)
            """,
            (str(matrix_id), actual, prev, new_score),
        )
        return dict(updated) if updated else {}

    # ------------------------------------------------------------------
    # Parts placeholder / scrape enqueue
    # ------------------------------------------------------------------

    def ensure_parts_placeholder(
        self,
        vehicle_id: str | UUID,
        operation_id: str | UUID,
        *,
        variant_flags: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """If no confirmed fitment, insert pending_scrape stub + enqueue job."""
        vid, oid = str(vehicle_id), str(operation_id)
        existing = fetch_all(
            """
            SELECT id, fitment_status FROM vehicle_part_fitment
            WHERE vehicle_id = %s AND operation_id = %s
            """,
            (vid, oid),
        )
        if any(r["fitment_status"] == "confirmed" for r in existing):
            return {"status": "HIT", "fitments": existing, "job_id": None}

        # Ensure a placeholder manufacturer + part row exists for pending scrape
        mfr = execute_returning(
            """
            INSERT INTO manufacturers (name) VALUES ('PENDING_SCRAPE')
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
            """,
        )
        part = execute_returning(
            """
            INSERT INTO parts_catalog (
              part_number, manufacturer_id, description, category_hint, is_active
            ) VALUES (
              %s, %s, 'Pending OEM scrape', 'PLACEHOLDER', true
            )
            ON CONFLICT (part_number, manufacturer_id) DO UPDATE
              SET description = EXCLUDED.description
            RETURNING id
            """,
            (f"PENDING-{oid[:8]}", str(mfr["id"])),
        )
        fit = execute_returning(
            """
            INSERT INTO vehicle_part_fitment (
              vehicle_id, operation_id, part_id, quantity_required,
              variant_flags, fitment_status
            ) VALUES (%s, %s, %s, 1, %s::jsonb, 'pending_scrape')
            ON CONFLICT (vehicle_id, operation_id, part_id) DO UPDATE
              SET fitment_status = 'pending_scrape',
                  variant_flags = EXCLUDED.variant_flags
            RETURNING id, fitment_status
            """,
            (vid, oid, str(part["id"]), json.dumps(variant_flags or {})),
        )
        job = execute_returning(
            """
            INSERT INTO parts_scrape_jobs (vehicle_id, operation_id, status, payload)
            VALUES (%s, %s, 'queued', %s::jsonb)
            RETURNING id, status
            """,
            (vid, oid, json.dumps({"variant_flags": variant_flags or {}})),
        )
        return {
            "status": "PLACEHOLDER_ENQUEUED",
            "fitment": fit,
            "job_id": str(job["id"]) if job else None,
        }


# In-process async queue (used when Redis is unavailable)
_PARTS_QUEUE: asyncio.Queue[str] | None = None


def get_parts_queue() -> asyncio.Queue[str]:
    global _PARTS_QUEUE
    if _PARTS_QUEUE is None:
        _PARTS_QUEUE = asyncio.Queue()
    return _PARTS_QUEUE


async def enqueue_parts_scrape_job(job_id: str) -> None:
    """Enqueue scrape job id to Redis (if configured) or in-process asyncio queue."""
    try:
        from config.settings import settings

        if settings.redis_url:
            import redis.asyncio as redis  # type: ignore

            client = redis.from_url(settings.redis_url)
            await client.lpush("tfl:parts_scrape", job_id)
            await client.aclose()
            return
    except Exception as exc:  # noqa: BLE001
        logger.warning("Redis enqueue failed (%s); using in-process queue", exc)

    await get_parts_queue().put(job_id)


async def parts_scrape_worker(stop_event: asyncio.Event | None = None) -> None:
    """Background consumer: marks jobs running then delegates to oem_scraper."""
    from src.oem_scraper import fulfill_parts_scrape_job

    q = get_parts_queue()
    while True:
        if stop_event and stop_event.is_set() and q.empty():
            break
        try:
            job_id = await asyncio.wait_for(q.get(), timeout=1.0)
        except asyncio.TimeoutError:
            continue
        try:
            await asyncio.to_thread(fulfill_parts_scrape_job, job_id)
        except Exception:  # noqa: BLE001
            logger.exception("parts scrape job failed: %s", job_id)
        finally:
            q.task_done()
