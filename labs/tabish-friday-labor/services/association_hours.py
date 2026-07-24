"""
Resolve standalone / additional / combined hours for job associations.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from src.db import fetch_all, fetch_one


def standalone_hours(vehicle_id: str | UUID, operation_id: str | UUID) -> float:
    """
    Prefer labor_time_matrix.base_labor_hrs for the vehicle; else telemetry_score
    when sample_count > 0; else service_operations.standard_hours.
    """
    row = fetch_one(
        """
        SELECT
          ltm.base_labor_hrs,
          ltm.telemetry_score,
          ltm.sample_count,
          so.standard_hours
        FROM service_operations so
        LEFT JOIN labor_time_matrix ltm
          ON ltm.operation_id = so.id AND ltm.vehicle_id = %s
        WHERE so.id = %s
        """,
        (str(vehicle_id), str(operation_id)),
    )
    if not row:
        return 0.0
    if row["base_labor_hrs"] is not None:
        return float(row["base_labor_hrs"])
    if row["sample_count"] and float(row["sample_count"]) > 0 and row["telemetry_score"]:
        return float(row["telemetry_score"])
    return float(row["standard_hours"] or 0)


def compute_addon_hours(
    *,
    primary_hours: float,
    associated_standalone: float,
    avg_combined_labor: float | None,
    overlap_discount: float,
) -> tuple[float, float]:
    """
    Returns (additional_hours, combined_total_hours).

    - If avg_combined_labor exists: additional = avg_combined - primary_hours
    - Else: additional = max(0, associated_standalone - overlap_discount)
    """
    if avg_combined_labor is not None:
        additional = max(0.0, round(float(avg_combined_labor) - primary_hours, 2))
        combined = round(primary_hours + additional, 2)
        return additional, combined
    additional = max(0.0, round(associated_standalone - float(overlap_discount or 0), 2))
    return additional, round(primary_hours + additional, 2)


def list_addons_for_operation(
    vehicle_id: str | UUID,
    operation_id: str | UUID,
) -> list[dict[str, Any]]:
    """Active associations for a primary operation with vehicle-aware hours."""
    primary_hrs = standalone_hours(vehicle_id, operation_id)
    rows = fetch_all(
        """
        SELECT
          oa.id AS association_id,
          oa.frequency_score,
          oa.avg_combined_labor,
          oa.overlap_discount,
          oa.association_type,
          so.id AS operation_id,
          so.operation_code,
          so.description,
          so.standard_hours
        FROM operation_associations oa
        JOIN service_operations so ON so.id = oa.associated_operation_id
        WHERE oa.primary_operation_id = %s
          AND oa.is_active = true
        ORDER BY oa.frequency_score DESC, so.operation_code
        """,
        (str(operation_id),),
    )
    out: list[dict[str, Any]] = []
    for r in rows:
        assoc_standalone = standalone_hours(vehicle_id, r["operation_id"])
        if assoc_standalone <= 0:
            assoc_standalone = float(r["standard_hours"] or 0)
        avg_combined = (
            float(r["avg_combined_labor"]) if r["avg_combined_labor"] is not None else None
        )
        additional, combined = compute_addon_hours(
            primary_hours=primary_hrs,
            associated_standalone=assoc_standalone,
            avg_combined_labor=avg_combined,
            overlap_discount=float(r["overlap_discount"] or 0),
        )
        out.append(
            {
                "operation_id": str(r["operation_id"]),
                "operation_code": r["operation_code"],
                "description": r["description"],
                "standalone_hours": round(assoc_standalone, 2),
                "additional_hours": additional,
                "combined_total_hours": combined,
                "frequency_score": float(r["frequency_score"]),
                "overlap_discount": float(r["overlap_discount"] or 0),
                "association_type": r["association_type"],
                "avg_combined_labor": avg_combined,
            }
        )
    return out


def bulk_estimate_hours(
    vehicle_id: str | UUID,
    operation_ids: list[str | UUID],
) -> dict[str, Any]:
    """
    Total labor for a set of operations considering pairwise overlap discounts /
    learned avg_combined_labor when available.
    """
    ids = [str(x) for x in operation_ids]
    if not ids:
        return {
            "vehicle_id": str(vehicle_id),
            "operation_ids": [],
            "lines": [],
            "naive_total_hours": 0.0,
            "adjusted_total_hours": 0.0,
            "overlap_savings_hours": 0.0,
        }

    # Standalone per op
    lines = []
    hours_map: dict[str, float] = {}
    for oid in ids:
        h = standalone_hours(vehicle_id, oid)
        op = fetch_one(
            "SELECT operation_code, description FROM service_operations WHERE id = %s",
            (oid,),
        )
        hours_map[oid] = h
        lines.append(
            {
                "operation_id": oid,
                "operation_code": op["operation_code"] if op else None,
                "description": op["description"] if op else None,
                "standalone_hours": round(h, 2),
            }
        )

    naive = round(sum(hours_map.values()), 2)

    # Pairwise associations among selected ops (undirected max discount / combined)
    placeholders = ",".join(["%s"] * len(ids))
    assocs = fetch_all(
        f"""
        SELECT
          primary_operation_id::text AS a,
          associated_operation_id::text AS b,
          avg_combined_labor,
          overlap_discount,
          frequency_score
        FROM operation_associations
        WHERE is_active = true
          AND primary_operation_id::text IN ({placeholders})
          AND associated_operation_id::text IN ({placeholders})
        """,
        (*ids, *ids),
    )

    # Greedy: apply highest-frequency pair discounts without double-counting an edge
    used_edges: set[tuple[str, str]] = set()
    savings = 0.0
    applied: list[dict[str, Any]] = []
    for row in sorted(assocs, key=lambda r: float(r["frequency_score"] or 0), reverse=True):
        a, b = str(row["a"]), str(row["b"])
        edge = tuple(sorted((a, b)))
        if edge in used_edges:
            continue
        if a not in hours_map or b not in hours_map:
            continue
        used_edges.add(edge)
        ha, hb = hours_map[a], hours_map[b]
        if row["avg_combined_labor"] is not None:
            combined = float(row["avg_combined_labor"])
            pair_save = max(0.0, ha + hb - combined)
        else:
            pair_save = float(row["overlap_discount"] or 0)
        savings += pair_save
        applied.append(
            {
                "operations": [a, b],
                "savings_hours": round(pair_save, 2),
                "avg_combined_labor": (
                    float(row["avg_combined_labor"])
                    if row["avg_combined_labor"] is not None
                    else None
                ),
                "overlap_discount": float(row["overlap_discount"] or 0),
                "frequency_score": float(row["frequency_score"] or 0),
            }
        )

    adjusted = round(max(0.0, naive - savings), 2)
    return {
        "vehicle_id": str(vehicle_id),
        "operation_ids": ids,
        "lines": lines,
        "pair_adjustments": applied,
        "naive_total_hours": naive,
        "adjusted_total_hours": adjusted,
        "overlap_savings_hours": round(savings, 2),
        # UI hint — collapsible "Frequently Combined Jobs" uses /addons per primary;
        # this bulk payload powers estimate totals when multiple ops are checked.
        "_ui": {
            "section": "Frequently Combined Jobs",
            "hint": "Checkboxes under the selected operation call /addons; cart totals use this bulk estimate.",
        },
    }
