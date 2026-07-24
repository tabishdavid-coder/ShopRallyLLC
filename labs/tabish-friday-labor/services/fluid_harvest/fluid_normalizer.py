"""
Fluid normalizer & merger
=========================
Merge OEM manual extraction with fluidcapacity.com, assign confidence, upsert
into vehicle_fluid_specs. Supports single-vehicle harvest and bulk seed.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from config.settings import settings
from services.fluid_harvest.categories import CATEGORY_KEYS
from services.fluid_harvest.fluid_extractor import extract_fluids_from_pdf
from services.fluid_harvest.fluidcapacity_scraper import (
    scrape_fluidcapacity,
    upsert_fluidcapacity_staging,
)
from services.fluid_harvest.owner_manual_scraper import (
    discover_manual_urls,
    download_pdf,
)

logger = logging.getLogger("tfl.fluids.normalizer")

CAPACITY_TOLERANCE_QT = 0.15


@dataclass
class MergedFluid:
    category_key: str
    capacity: float
    capacity_unit: str
    fluid_type: str | None
    alternative_types: list[str]
    notes: str | None
    source: str
    confidence: int
    discrepancy: bool = False


def _log_job(
    vehicle_id: str | None,
    job_type: str,
    status: str,
    *,
    source: str | None = None,
    detail: dict[str, Any] | None = None,
    error: str | None = None,
    log_id: int | None = None,
) -> int | None:
    try:
        from src.db import execute_returning, execute
    except Exception:  # noqa: BLE001
        return None

    if log_id is None:
        row = execute_returning(
            """
            INSERT INTO fluid_scrape_log
              (vehicle_id, job_type, status, source, detail, error, started_at)
            VALUES (%s, %s, %s, %s, %s::jsonb, %s, now())
            RETURNING id
            """,
            (
                vehicle_id,
                job_type,
                status,
                source,
                json.dumps(detail or {}),
                error,
            ),
        )
        return int(row["id"]) if row else None

    execute(
        """
        UPDATE fluid_scrape_log
        SET status = %s,
            source = COALESCE(%s, source),
            detail = COALESCE(%s::jsonb, detail),
            error = %s,
            finished_at = CASE WHEN %s IN ('done', 'failed', 'skipped') THEN now() ELSE finished_at END
        WHERE id = %s
        """,
        (status, source, json.dumps(detail) if detail is not None else None, error, status, log_id),
    )
    return log_id


def _category_id(key: str) -> int | None:
    from src.db import fetch_one

    row = fetch_one("SELECT id FROM fluid_categories WHERE key = %s", (key,))
    return int(row["id"]) if row else None


def vehicle_has_fluid_specs(vehicle_id: str) -> bool:
    from src.db import fetch_one

    row = fetch_one(
        "SELECT 1 AS ok FROM vehicle_fluid_specs WHERE vehicle_id = %s LIMIT 1",
        (vehicle_id,),
    )
    return bool(row)


def _index_by_category(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for r in rows:
        key = r.get("category_key")
        if key in CATEGORY_KEYS and key not in out:
            out[str(key)] = r
    return out


def _types_agree(a: str | None, b: str | None) -> bool:
    if not a or not b:
        return True  # missing type is not a hard conflict
    na = re_norm_type(a)
    nb = re_norm_type(b)
    return na == nb or na in nb or nb in na


def re_norm_type(s: str) -> str:
    return "".join(ch for ch in s.lower() if ch.isalnum())


def merge_fluid_sources(
    oem_fluids: list[dict[str, Any]],
    fc_fluids: list[dict[str, Any]],
) -> list[MergedFluid]:
    """
    Confidence rules:
      - both agree capacity (±0.15 qt) and type → 100
      - only one source → 80 (flag review via notes)
      - both differ → 50 + discrepancy
    """
    oem = _index_by_category(oem_fluids)
    fc = _index_by_category(fc_fluids)
    keys = sorted(set(oem) | set(fc))
    merged: list[MergedFluid] = []

    for key in keys:
        o = oem.get(key)
        f = fc.get(key)
        if o and f and o.get("capacity") is not None and f.get("capacity") is not None:
            oc = float(o["capacity"])
            fc_cap = float(f["capacity"])
            cap_ok = abs(oc - fc_cap) <= CAPACITY_TOLERANCE_QT
            type_ok = _types_agree(o.get("fluid_type"), f.get("fluid_type"))
            if cap_ok and type_ok:
                merged.append(
                    MergedFluid(
                        category_key=key,
                        capacity=round((oc + fc_cap) / 2, 2) if oc != fc_cap else oc,
                        capacity_unit="qt",
                        fluid_type=o.get("fluid_type") or f.get("fluid_type"),
                        alternative_types=list(
                            {
                                *(o.get("alternative_types") or []),
                                *([f["fluid_type"]] if f.get("fluid_type") else []),
                            }
                        ),
                        notes=_join_notes(o.get("notes"), f.get("notes"), "OEM+fluidcapacity agree"),
                        source="oem+fluidcapacity",
                        confidence=100,
                    )
                )
            else:
                # Prefer OEM capacity when conflict; flag review
                merged.append(
                    MergedFluid(
                        category_key=key,
                        capacity=oc,
                        capacity_unit="qt",
                        fluid_type=o.get("fluid_type") or f.get("fluid_type"),
                        alternative_types=[x for x in [f.get("fluid_type")] if x],
                        notes=_join_notes(
                            o.get("notes"),
                            f.get("notes"),
                            f"DISCREPANCY OEM={oc}qt/{o.get('fluid_type')} vs "
                            f"fluidcapacity={fc_cap}qt/{f.get('fluid_type')}",
                        ),
                        source="oem+fluidcapacity_conflict",
                        confidence=50,
                        discrepancy=True,
                    )
                )
        elif o and o.get("capacity") is not None:
            merged.append(
                MergedFluid(
                    category_key=key,
                    capacity=float(o["capacity"]),
                    capacity_unit="qt",
                    fluid_type=o.get("fluid_type"),
                    alternative_types=list(o.get("alternative_types") or []),
                    notes=_join_notes(o.get("notes"), None, "OEM only — review recommended"),
                    source="oem_manual",
                    confidence=80,
                )
            )
        elif f and f.get("capacity") is not None:
            merged.append(
                MergedFluid(
                    category_key=key,
                    capacity=float(f["capacity"]),
                    capacity_unit="qt",
                    fluid_type=f.get("fluid_type"),
                    alternative_types=[],
                    notes=_join_notes(f.get("notes"), None, "fluidcapacity only — review recommended"),
                    source="fluidcapacity",
                    confidence=80,
                )
            )
    return merged


def _join_notes(*parts: str | None) -> str | None:
    cleaned = [p.strip() for p in parts if p and str(p).strip()]
    return " | ".join(cleaned) if cleaned else None


def _fixture_manual_for(year: int, make: str, model: str) -> Path | None:
    key = slugish(f"{year}_{make}_{model}")
    candidates = [
        settings.fixtures_dir / "manuals" / f"{key}.txt",
        settings.fixtures_dir / "manuals" / f"{year}_{slugish(make)}_{slugish(model)}.txt",
        settings.fixtures_dir
        / "manuals"
        / f"{year}_{slugish(make)}_{slugish(model)}_owners_manual_en_US.txt",
    ]
    for p in candidates:
        if p.exists():
            return p
    return None


def slugish(s: str) -> str:
    return s.lower().replace(" ", "_").replace("-", "_")


def _harvest_oem(
    vehicle_id: str,
    year: int,
    make: str,
    model: str,
    engine: str | None,
) -> list[dict[str, Any]]:
    from src.db import execute

    ymm = f"{year} {make} {model}"
    fluids: list[dict[str, Any]] = []

    # Prefer local fixture manual text
    fixture = _fixture_manual_for(year, make, model)
    pdf_path: Path | None = None
    if fixture:
        stub = settings.staging_dir / "owner_manuals" / f"{fixture.stem}.pdf"
        stub.parent.mkdir(parents=True, exist_ok=True)
        stub.write_bytes(b"%PDF-1.4\n%fixture\n")
        stub.with_suffix(".txt").write_text(fixture.read_text(encoding="utf-8"), encoding="utf-8")
        pdf_path = stub
    else:
        hits = discover_manual_urls(make, model, year, year, persist=True, max_checks=8)
        for hit in hits:
            pdf_path = download_pdf(hit.url)
            if pdf_path:
                break

    if not pdf_path:
        logger.warning("No OEM manual for %s", ymm)
        return []

    extracted = extract_fluids_from_pdf(pdf_path, ymm)
    fluids = list(extracted.get("fluids") or [])

    for row in fluids:
        execute(
            """
            INSERT INTO fluid_oem_staging
              (vehicle_id, year, make, model, engine, category_key, capacity,
               capacity_unit, fluid_type, alternative_types, notes, source, pdf_path, raw_payload)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
            """,
            (
                vehicle_id,
                year,
                make,
                model,
                engine,
                row["category_key"],
                row.get("capacity"),
                row.get("capacity_unit") or "qt",
                row.get("fluid_type"),
                row.get("alternative_types") or [],
                row.get("notes"),
                extracted.get("source") or "oem_manual",
                str(pdf_path),
                json.dumps(row),
            ),
        )
    return fluids


def upsert_resolved_specs(vehicle_id: str, merged: list[MergedFluid]) -> int:
    from src.db import execute

    n = 0
    now = datetime.now(timezone.utc)
    for m in merged:
        cat_id = _category_id(m.category_key)
        if cat_id is None:
            logger.warning("missing fluid_categories row for %s", m.category_key)
            continue
        execute(
            """
            INSERT INTO vehicle_fluid_specs
              (vehicle_id, fluid_category_id, capacity, capacity_unit, fluid_type,
               alternative_types, notes, source, confidence, last_verified)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (vehicle_id, fluid_category_id, capacity) DO UPDATE SET
              fluid_type = EXCLUDED.fluid_type,
              alternative_types = EXCLUDED.alternative_types,
              notes = EXCLUDED.notes,
              source = EXCLUDED.source,
              confidence = EXCLUDED.confidence,
              last_verified = EXCLUDED.last_verified,
              updated_at = now()
            """,
            (
                vehicle_id,
                cat_id,
                m.capacity,
                m.capacity_unit,
                m.fluid_type,
                m.alternative_types,
                m.notes,
                m.source,
                m.confidence,
                now,
            ),
        )
        n += 1
        if m.discrepancy:
            execute(
                """
                INSERT INTO fluid_discrepancy_reports
                  (vehicle_id, fluid_category_id, observed_capacity, observed_unit,
                   observed_type, note, status, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, 'open', 'harvester')
                """,
                (
                    vehicle_id,
                    cat_id,
                    m.capacity,
                    m.capacity_unit,
                    m.fluid_type,
                    m.notes or "auto discrepancy",
                ),
            )
    return n


def harvest_fluids_for_vehicle(
    vehicle_id: str,
    *,
    force: bool = False,
) -> dict[str, Any]:
    """
    Full pipeline for one vehicle_taxonomy id.
    Skips when specs already exist unless force=True.
    """
    from src.db import fetch_one

    vehicle = fetch_one("SELECT * FROM vehicle_taxonomy WHERE id = %s", (vehicle_id,))
    if not vehicle:
        return {"ok": False, "error": "vehicle_not_found"}

    if vehicle_has_fluid_specs(vehicle_id) and not force:
        return {"ok": True, "skipped": True, "reason": "specs_exist", "vehicle_id": vehicle_id}

    log_id = _log_job(vehicle_id, "harvest", "running", source="pipeline")
    year = int(vehicle["model_year"])
    make = str(vehicle["make"])
    model = str(vehicle["model"])
    engine = str(vehicle.get("engine_config") or "")

    try:
        oem_fluids = _harvest_oem(vehicle_id, year, make, model, engine)
        fc = scrape_fluidcapacity(year, make, model, engine)
        upsert_fluidcapacity_staging(vehicle_id, year, make, model, engine, fc)
        merged = merge_fluid_sources(oem_fluids, list(fc.get("fluids") or []))
        inserted = upsert_resolved_specs(vehicle_id, merged)
        summary = {
            "ok": True,
            "vehicle_id": vehicle_id,
            "oem_count": len(oem_fluids),
            "fluidcapacity_count": len(fc.get("fluids") or []),
            "merged_count": len(merged),
            "inserted": inserted,
            "confidence_histogram": _hist(merged),
        }
        _log_job(vehicle_id, "harvest", "done", source="pipeline", detail=summary, log_id=log_id)
        return summary
    except Exception as exc:  # noqa: BLE001
        logger.exception("harvest failed for %s", vehicle_id)
        _log_job(
            vehicle_id,
            "harvest",
            "failed",
            source="pipeline",
            error=str(exc),
            log_id=log_id,
        )
        return {"ok": False, "error": str(exc), "vehicle_id": vehicle_id}


def _hist(merged: list[MergedFluid]) -> dict[str, int]:
    h: dict[str, int] = {}
    for m in merged:
        k = str(m.confidence)
        h[k] = h.get(k, 0) + 1
    return h


def bulk_seed_missing_fluids(*, limit: int = 500, force: bool = False) -> dict[str, Any]:
    """Pre-seed fluids for vehicle_taxonomy rows lacking specs."""
    from src.db import fetch_all

    if force:
        rows = fetch_all(
            """
            SELECT id FROM vehicle_taxonomy
            ORDER BY model_year DESC, make, model
            LIMIT %s
            """,
            (limit,),
        )
    else:
        rows = fetch_all(
            """
            SELECT v.id
            FROM vehicle_taxonomy v
            LEFT JOIN vehicle_fluid_specs s ON s.vehicle_id = v.id
            WHERE s.id IS NULL
            ORDER BY v.model_year DESC, v.make, v.model
            LIMIT %s
            """,
            (limit,),
        )

    results = []
    for r in rows:
        results.append(harvest_fluids_for_vehicle(str(r["id"]), force=force))
    ok = sum(1 for x in results if x.get("ok"))
    return {"processed": len(results), "ok": ok, "results": results}
