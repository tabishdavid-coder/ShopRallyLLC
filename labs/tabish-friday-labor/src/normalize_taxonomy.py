"""
Normalize scraped OEM category paths → Tabish Friday Labor taxonomy keys.

Maps breadcrumb paths into service_categories (levels 1–4), service_operations,
and vehicle_part_fitment rows. Uses a deterministic mapping table first; optional
LLM assist when ``use_llm=True``.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from src.db import execute, execute_returning
from src.oem_scraper import ScrapeResult
from src.taxonomy_keys import path_to_keys

logger = logging.getLogger(__name__)

__all__ = ["normalize_scrape_result", "normalize_staging_file", "path_to_keys"]


def upsert_category(level: int, key: str, name: str, parent_id: str | None) -> str:
    row = execute_returning(
        """
        INSERT INTO service_categories (parent_id, level, key, name, sort_order)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (level, key) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
        """,
        (parent_id, level, key, name, level * 10),
    )
    assert row
    return str(row["id"])


def upsert_operation(category_id: str, operation_code: str, description: str, hours: float = 1.0) -> str:
    row = execute_returning(
        """
        INSERT INTO service_operations (category_id, operation_code, description, standard_hours)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (operation_code) DO UPDATE
          SET description = EXCLUDED.description,
              category_id = EXCLUDED.category_id
        RETURNING id
        """,
        (category_id, operation_code, description, hours),
    )
    assert row
    return str(row["id"])


def ensure_vehicle(year: int, make: str, model: str, engine: str, chassis_tier: str = "2") -> str:
    row = execute_returning(
        """
        INSERT INTO vehicle_taxonomy (model_year, make, model, engine_config, chassis_tier)
        VALUES (%s, %s, %s, %s, %s::chassis_tier)
        ON CONFLICT (model_year, make, model, engine_config) DO UPDATE
          SET chassis_tier = EXCLUDED.chassis_tier
        RETURNING id
        """,
        (year, make, model, engine, chassis_tier),
    )
    assert row
    return str(row["id"])


def normalize_scrape_result(
    result: ScrapeResult | dict[str, Any],
    *,
    chassis_tier: str = "2",
    default_hours: float = 1.0,
    use_llm: bool = False,
) -> dict[str, Any]:
    """
    Insert categories/operations/fitment from a scrape result.

    Returns counts of upserts performed.
    """
    data = result.as_dict() if isinstance(result, ScrapeResult) else result
    year = int(data["year"])
    make = str(data["make"])
    model = str(data["model"])
    engine = str(data.get("engine") or "UNSPECIFIED")

    if use_llm:
        logger.info("LLM path reserved — deterministic mapper used for production safety")

    vehicle_id = ensure_vehicle(year, make, model, engine, chassis_tier=chassis_tier)
    op_ids: list[str] = []
    cat_count = 0

    for path in data.get("category_paths", []):
        if not path:
            continue
        keys = path_to_keys(path)
        parent_id = None
        last_cat_id = None
        for idx, key in enumerate(keys):
            level = idx + 1
            name = path[idx] if idx < len(path) else key
            last_cat_id = upsert_category(level, key, name, parent_id)
            parent_id = last_cat_id
            cat_count += 1
        # Pad to level 4 with R_AND_R if scraper path was shallow
        while len(keys) < 4 and last_cat_id:
            level = len(keys) + 1
            key = keys[-1] + (".R_AND_R" if level == 4 else ".COMPONENT")
            name = "Remove & Replace" if level == 4 else "Component"
            last_cat_id = upsert_category(level, key, name, last_cat_id)
            keys.append(key)
            cat_count += 1

        operation_code = keys[-1]
        op_id = upsert_operation(
            last_cat_id,  # type: ignore[arg-type]
            operation_code,
            " / ".join(path),
            hours=default_hours,
        )
        op_ids.append(op_id)

        # Placeholder estimated labor
        execute(
            """
            INSERT INTO labor_time_matrix (
              vehicle_id, operation_id, base_labor_hrs, telemetry_score,
              sample_count, status, confidence, last_updated
            ) VALUES (%s, %s, %s, 0, 0, 'estimated', 0.40, now())
            ON CONFLICT (vehicle_id, operation_id) DO NOTHING
            """,
            (vehicle_id, op_id, default_hours),
        )

    # Parts
    mfr = execute_returning(
        """
        INSERT INTO manufacturers (name) VALUES (%s)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
        """,
        (make,),
    )
    part_count = 0
    for leaf in data.get("leaf_parts", []):
        part = execute_returning(
            """
            INSERT INTO parts_catalog (
              part_number, manufacturer_id, description, category_hint, is_active
            ) VALUES (%s, %s, %s, 'OEM_SCRAPE', true)
            ON CONFLICT (part_number, manufacturer_id) DO UPDATE
              SET description = EXCLUDED.description
            RETURNING id
            """,
            (
                leaf["part_number"],
                str(mfr["id"]),
                leaf.get("description") or leaf["part_number"],
            ),
        )
        part_count += 1
        if op_ids:
            execute(
                """
                INSERT INTO vehicle_part_fitment (
                  vehicle_id, operation_id, part_id, quantity_required,
                  variant_flags, fitment_status
                ) VALUES (%s, %s, %s, 1, '{}'::jsonb, 'confirmed')
                ON CONFLICT (vehicle_id, operation_id, part_id) DO NOTHING
                """,
                (vehicle_id, op_ids[0], str(part["id"])),
            )

    return {
        "vehicle_id": vehicle_id,
        "categories_upserted": cat_count,
        "operations_upserted": len(op_ids),
        "parts_upserted": part_count,
    }


def normalize_staging_file(path: Path, **kwargs: Any) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    out = normalize_scrape_result(data, **kwargs)
    try:
        execute(
            """
            UPDATE oem_scrape_staging
            SET normalized_at = now()
            WHERE year = %s AND make = %s AND model = %s AND normalized_at IS NULL
            """,
            (data["year"], data["make"], data["model"]),
        )
    except Exception:  # noqa: BLE001
        pass
    return out


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python -m src.normalize_taxonomy <staging.json>")
        raise SystemExit(2)
    print(json.dumps(normalize_staging_file(Path(sys.argv[1])), indent=2))
