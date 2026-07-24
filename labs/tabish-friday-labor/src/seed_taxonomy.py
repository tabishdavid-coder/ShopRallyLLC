"""
Database seeding for Tabish Friday Labor
========================================
1. Insert minimal level-1 service categories (Brakes, Engine, Suspension, …)
2. Run OEM scraper (fixture mode by default) for popular vehicles
3. Normalize into taxonomy + fitment
4. Ensure estimated labor rows exist

Usage:
  cd labs/tabish-friday-labor
  python -m src.seed_taxonomy
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

# Allow `python -m src.seed_taxonomy` from package root
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.db import execute, execute_returning, fetch_all  # noqa: E402
from src.normalize_taxonomy import normalize_scrape_result, upsert_category  # noqa: E402
from src.oem_scraper import persist_scrape_result, scrape_vehicle  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("seed")

LEVEL1 = [
    ("BRAKES", "Brakes"),
    ("ENGINE", "Engine"),
    ("SUSPENSION", "Suspension"),
    ("STEERING", "Steering"),
    ("DRIVETRAIN", "Drivetrain"),
    ("ELECTRICAL", "Electrical"),
    ("HVAC", "HVAC"),
    ("EXHAUST", "Exhaust"),
]

SEED_VEHICLES = [
    # (year, make, model, engine, chassis_tier)
    (2014, "Honda", "Accord", "3.5L V6", "3"),
    (2012, "Toyota", "Camry", "2.5L I4", "2"),
    (2015, "Honda", "Accord", "2.4L I4", "2"),
    (2012, "Honda", "Civic", "1.8L I4", "1"),
]


def seed_level1_categories() -> int:
    n = 0
    for key, name in LEVEL1:
        upsert_category(1, key, name, None)
        n += 1
    return n


def seed_shop_config() -> None:
    execute(
        """
        INSERT INTO shop_config (region, shop_rate)
        VALUES ('Albany/Capital Region', 145.00)
        ON CONFLICT (region) DO UPDATE SET shop_rate = EXCLUDED.shop_rate
        """
    )


def seed_from_scrape() -> list[dict]:
    results = []
    for year, make, model, engine, tier in SEED_VEHICLES:
        log.info("Scraping/fixture %s %s %s %s", year, make, model, engine)
        scraped = scrape_vehicle(year, make, model, engine)
        path = persist_scrape_result(scraped)
        log.info("  staging → %s", path.name)
        summary = normalize_scrape_result(
            scraped,
            chassis_tier=tier,
            default_hours=1.0,
            use_llm=False,
        )
        results.append({"vehicle": f"{year} {make} {model}", **summary})
    return results


def ensure_verified_seed_for_civic_pads() -> None:
    """Give Civic a verified front-pads row so Accord can L1/L2 inherit in demos."""
    civic = execute_returning(
        """
        SELECT id FROM vehicle_taxonomy
        WHERE model_year = 2012 AND make = 'Honda' AND model = 'Civic'
        LIMIT 1
        """
    )
    op = fetch_all(
        """
        SELECT id FROM service_operations
        WHERE operation_code ILIKE '%%PADS%%R_AND_R%%'
           OR operation_code = 'BRAKES.FRONT.PADS.R_AND_R'
        LIMIT 5
        """
    )
    if not civic or not op:
        return
    for row in op:
        execute(
            """
            INSERT INTO labor_time_matrix (
              vehicle_id, operation_id, base_labor_hrs, telemetry_score,
              sample_count, status, confidence, last_updated
            ) VALUES (%s, %s, 1.00, 1.00, 6, 'verified', 0.95, now())
            ON CONFLICT (vehicle_id, operation_id) DO UPDATE
              SET base_labor_hrs = 1.00,
                  status = 'verified',
                  sample_count = GREATEST(labor_time_matrix.sample_count, 6),
                  confidence = 0.95,
                  last_updated = now()
            """,
            (str(civic["id"]), str(row["id"])),
        )


def main() -> None:
    log.info("Tabish Friday Labor — seeding")
    seed_shop_config()
    n = seed_level1_categories()
    log.info("Level-1 categories: %s", n)
    summaries = seed_from_scrape()
    ensure_verified_seed_for_civic_pads()
    assoc_summary: dict = {}
    try:
        from services.job_association_seeder import seed_common_associations

        assoc_summary = seed_common_associations()
        log.info("Job associations: %s", assoc_summary.get("associations_upserted"))
    except Exception as exc:  # noqa: BLE001
        log.warning("Association seed skipped (apply schema_associations.sql?): %s", exc)
    print(json.dumps({"ok": True, "vehicles": summaries, "associations": assoc_summary}, indent=2))


if __name__ == "__main__":
    main()
