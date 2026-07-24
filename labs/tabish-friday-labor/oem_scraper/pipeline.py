"""
OEM scrape → taxonomy insert → diagram capture.

Upon inserting/updating a category or operation (via normalize), create/update
``diagrams`` rows with image_url and optional local_path download.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from config.settings import settings
from oem_scraper.diagram_crawler import (
    DiagramHit,
    DiagramScrapeResult,
    capture_diagrams_for_vehicle,
    download_diagram,
    extract_diagram_urls_from_html,
    extract_diagram_urls_from_payload,
)
from src.db import execute, execute_returning, fetch_all, fetch_one

log = logging.getLogger("tfl.diagrams.pipeline")


def upsert_diagram(
    *,
    category_id: str | None,
    operation_id: str | None,
    vehicle_id: str | None,
    hit: DiagramHit,
    download: bool = True,
) -> int:
    """Insert or update a diagrams row keyed by (operation_id, image_url)."""
    local_path = hit.local_path
    if download and hit.image_url:
        try:
            local_path = download_diagram(hit.image_url) or local_path
        except Exception as exc:  # noqa: BLE001
            log.warning("diagram download skipped: %s", exc)

    existing = fetch_one(
        """
        SELECT id FROM diagrams
        WHERE image_url = %s
          AND (
            (operation_id IS NOT NULL AND operation_id = %s::uuid)
            OR (operation_id IS NULL AND category_id IS NOT DISTINCT FROM %s::uuid)
          )
        LIMIT 1
        """,
        (hit.image_url, operation_id, category_id),
    )
    if existing:
        execute(
            """
            UPDATE diagrams
            SET local_path = COALESCE(%s, local_path),
                source = COALESCE(%s, source),
                caption = COALESCE(%s, caption),
                vehicle_id = COALESCE(%s::uuid, vehicle_id),
                category_id = COALESCE(%s::uuid, category_id),
                captured_at = now(),
                updated_at = now()
            WHERE id = %s
            """,
            (
                local_path,
                hit.source,
                hit.caption,
                vehicle_id,
                category_id,
                int(existing["id"]),
            ),
        )
        return int(existing["id"])

    row = execute_returning(
        """
        INSERT INTO diagrams (
          category_id, operation_id, vehicle_id, image_url, local_path, source, caption
        ) VALUES (
          %s::uuid, %s::uuid, %s::uuid, %s, %s, %s, %s
        )
        RETURNING id
        """,
        (
            category_id,
            operation_id,
            vehicle_id,
            hit.image_url,
            local_path,
            hit.source,
            hit.caption,
        ),
    )
    assert row
    return int(row["id"])


def sync_diagrams_for_operation(
    *,
    operation_id: str,
    category_id: str | None,
    vehicle_id: str | None,
    hits: list[DiagramHit],
    download: bool = True,
) -> list[int]:
    """Create/update diagram rows for a category/operation pair."""
    ids: list[int] = []
    for hit in hits:
        if not hit.image_url:
            continue
        ids.append(
            upsert_diagram(
                category_id=category_id,
                operation_id=operation_id,
                vehicle_id=vehicle_id,
                hit=hit,
                download=download,
            )
        )
    return ids


def persist_diagrams_from_scrape(
    result: DiagramScrapeResult | dict[str, Any],
    *,
    vehicle_id: str | None = None,
    operation_id: str | None = None,
    category_id: str | None = None,
    download: bool = True,
) -> dict[str, Any]:
    """
    Persist captured diagrams. When operation_id is omitted, rows are stored
    at vehicle/category scope (operation_id NULL).
    """
    if isinstance(result, dict):
        hits = [
            DiagramHit(
                image_url=d["image_url"],
                source=d.get("source") or "oem",
                caption=d.get("caption"),
                category_hint=d.get("category_hint"),
                operation_hint=d.get("operation_hint"),
                local_path=d.get("local_path"),
            )
            for d in result.get("diagrams", [])
        ]
        year = int(result.get("year") or 0)
        make = str(result.get("make") or "")
        model = str(result.get("model") or "")
        source = str(result.get("source") or "oem")
    else:
        hits = list(result.diagrams)
        year, make, model, source = result.year, result.make, result.model, result.source

    # Resolve operation/category from hints when possible
    resolved_op = operation_id
    resolved_cat = category_id
    for hit in hits:
        op = resolved_op
        cat = resolved_cat
        if not op and hit.operation_hint:
            row = fetch_one(
                "SELECT id, category_id FROM service_operations WHERE operation_code = %s",
                (hit.operation_hint,),
            )
            if row:
                op = str(row["id"])
                cat = cat or str(row["category_id"])
        if not cat and hit.category_hint:
            row = fetch_one(
                "SELECT id FROM service_categories WHERE key = %s ORDER BY level DESC LIMIT 1",
                (hit.category_hint.split(".")[-1] if "." in hit.category_hint else hit.category_hint,),
            )
            # Prefer full key match
            row = fetch_one(
                "SELECT id FROM service_categories WHERE key = %s LIMIT 1",
                (hit.category_hint,),
            ) or row
            if row:
                cat = str(row["id"])
        if op:
            sync_diagrams_for_operation(
                operation_id=op,
                category_id=cat,
                vehicle_id=vehicle_id,
                hits=[hit],
                download=download,
            )
        else:
            upsert_diagram(
                category_id=cat,
                operation_id=None,
                vehicle_id=vehicle_id,
                hit=hit,
                download=download,
            )

    return {
        "year": year,
        "make": make,
        "model": model,
        "source": source,
        "diagrams_persisted": len(hits),
        "vehicle_id": vehicle_id,
        "operation_id": operation_id,
    }


def capture_and_persist_for_vehicle(
    year: int,
    make: str,
    model: str,
    engine: str | None = None,
    *,
    vehicle_id: str | None = None,
    operation_id: str | None = None,
    category_id: str | None = None,
) -> dict[str, Any]:
    """Fixture-first capture + DB persist (used after taxonomy normalize)."""
    result = capture_diagrams_for_vehicle(year, make, model, engine, download=True)
    return persist_diagrams_from_scrape(
        result,
        vehicle_id=vehicle_id,
        operation_id=operation_id,
        category_id=category_id,
        download=False,  # already downloaded in capture
    )


def ingest_partsouq_group_fixture(
    fixture_path: Path,
    *,
    vehicle_id: str | None = None,
    operation_code: str | None = None,
) -> dict[str, Any]:
    """
    Partsouq spider hook: load a group's parts-diagram JSON, extract ``image``,
    and upsert into diagrams (optionally bound to an operation).
    """
    payload = json.loads(fixture_path.read_text(encoding="utf-8"))
    urls = extract_diagram_urls_from_payload(payload)
    # Also accept relative / fixture schemes stored as 'image'
    if not urls:
        for key in ("image", "img", "illustration", "image_url"):
            val = payload.get(key)
            if isinstance(val, str) and val.strip():
                urls.append(val.strip())
                break

    op_id = None
    cat_id = None
    code = operation_code or payload.get("operation_code")
    if not code and payload.get("operation"):
        # best-effort: map common brake pad name
        name = str(payload["operation"]).lower()
        if "pad" in name and "front" in name:
            code = "BRAKES.FRONT.PADS.R_AND_R"
    if code:
        row = fetch_one(
            "SELECT id, category_id FROM service_operations WHERE operation_code = %s",
            (code,),
        )
        if row:
            op_id = str(row["id"])
            cat_id = str(row["category_id"])

    hits = [
        DiagramHit(
            image_url=u,
            source="partsouq",
            caption=str(payload.get("title") or payload.get("group") or "OEM diagram"),
            operation_hint=code,
        )
        for u in urls
    ]
    if op_id:
        ids = sync_diagrams_for_operation(
            operation_id=op_id,
            category_id=cat_id,
            vehicle_id=vehicle_id,
            hits=hits,
        )
    else:
        ids = [
            upsert_diagram(
                category_id=cat_id,
                operation_id=None,
                vehicle_id=vehicle_id,
                hit=h,
            )
            for h in hits
        ]
    return {"fixture": str(fixture_path), "diagram_ids": ids, "operation_id": op_id}


def extract_from_parts_list_page(html: str, base_url: str, source: str) -> list[DiagramHit]:
    """7zap / RevolutionParts: capture main illustration on the parts list page."""
    urls = extract_diagram_urls_from_html(html, base_url=base_url)
    return [
        DiagramHit(image_url=u, source=source, caption=f"{source} parts illustration")
        for u in urls[:12]
    ]


def resync_stale_diagrams(*, limit: int = 50) -> dict[str, Any]:
    """
    Maintenance: re-sync diagrams if URLs change.
    Fixture/fixture:// URLs only refresh captured_at; live URLs re-download.
    """
    rows = fetch_all(
        """
        SELECT id, image_url, source, local_path
        FROM diagrams
        ORDER BY captured_at ASC NULLS FIRST
        LIMIT %s
        """,
        (limit,),
    )
    updated = 0
    skipped = 0
    for row in rows:
        url = str(row["image_url"])
        if settings.scraper_mode != "live" or url.startswith("fixture://"):
            execute(
                "UPDATE diagrams SET captured_at = now(), updated_at = now() WHERE id = %s",
                (int(row["id"]),),
            )
            skipped += 1
            continue
        path = download_diagram(url)
        if path:
            execute(
                """
                UPDATE diagrams
                SET local_path = %s, captured_at = now(), updated_at = now()
                WHERE id = %s
                """,
                (path, int(row["id"])),
            )
            updated += 1
        else:
            skipped += 1
    return {
        "updated": updated,
        "skipped": skipped,
        "examined": len(rows),
        "mode": settings.scraper_mode,
    }
