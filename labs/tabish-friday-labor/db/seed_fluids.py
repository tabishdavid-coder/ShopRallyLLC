#!/usr/bin/env python3
"""
Pre-populate fluid specs for common vehicles via OEM PDF + fluidcapacity pipeline.

Usage (from labs/tabish-friday-labor):
  # Apply DDL first if needed:
  #   psql "$TFL_DATABASE_URL" -f sql/schema.sql
  python -m db.seed_fluids
  # or: python db/seed_fluids.py

Verifies expected capacities for:
  - 2014 Honda Accord 3.5L V6
  - 2012 Toyota Camry 2.5L I4 / SE
  - 2020 Ford F-150 5.0L
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.db import execute, fetch_all, fetch_one  # noqa: E402
from src.normalize_taxonomy import ensure_vehicle  # noqa: E402
from services.fluid_harvest.fluid_normalizer import harvest_fluids_for_vehicle  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("seed_fluids")

SEED = [
    # (year, make, model, engine, expected ENG_OIL qt, expected ATF qt)
    (2014, "Honda", "Accord", "3.5L V6", 4.5, 3.7),
    (2012, "Toyota", "Camry", "2.5L I4", 4.6, 3.9),
    (2020, "Ford", "F-150", "5.0L V8", 7.7, 13.1),
]


def ensure_fluid_categories() -> None:
    execute(
        """
        INSERT INTO fluid_categories (name, key) VALUES
          ('Engine Oil', 'ENG_OIL'),
          ('Transmission Fluid', 'ATF'),
          ('Brake Fluid', 'BRAKE_FLUID'),
          ('Coolant', 'COOLANT'),
          ('Power Steering Fluid', 'PS_FLUID'),
          ('Differential Fluid', 'DIFF_FLUID'),
          ('Transfer Case Fluid', 'TC_FLUID'),
          ('Washer Fluid', 'WASHER')
        ON CONFLICT (key) DO NOTHING
        """
    )


def capacity_for(vehicle_id: str, category_key: str) -> float | None:
    row = fetch_one(
        """
        SELECT s.capacity
        FROM vehicle_fluid_specs s
        JOIN fluid_categories c ON c.id = s.fluid_category_id
        WHERE s.vehicle_id = %s AND c.key = %s
        ORDER BY s.confidence DESC
        LIMIT 1
        """,
        (vehicle_id, category_key),
    )
    return float(row["capacity"]) if row else None


def main() -> int:
    ensure_fluid_categories()
    report: list[dict] = []
    ok_all = True

    for year, make, model, engine, expect_oil, expect_atf in SEED:
        log.info("Seeding fluids: %s %s %s %s", year, make, model, engine)
        vehicle_id = ensure_vehicle(year, make, model, engine, chassis_tier="2")
        result = harvest_fluids_for_vehicle(vehicle_id, force=True)
        oil = capacity_for(vehicle_id, "ENG_OIL")
        atf = capacity_for(vehicle_id, "ATF")
        oil_ok = oil is not None and abs(oil - expect_oil) <= 0.15
        atf_ok = atf is not None and abs(atf - expect_atf) <= 0.15
        row = {
            "vehicle": f"{year} {make} {model} {engine}",
            "vehicle_id": vehicle_id,
            "harvest": result,
            "eng_oil": oil,
            "atf": atf,
            "eng_oil_ok": oil_ok,
            "atf_ok": atf_ok,
        }
        report.append(row)
        if not (oil_ok and atf_ok and result.get("ok")):
            ok_all = False
            log.error("VERIFY FAIL %s oil=%s (want %s) atf=%s (want %s)", row["vehicle"], oil, expect_oil, atf, expect_atf)
        else:
            log.info("VERIFY OK %s oil=%s atf=%s", row["vehicle"], oil, atf)

    specs = fetch_all(
        """
        SELECT v.model_year, v.make, v.model, c.key, s.capacity, s.confidence, s.source
        FROM vehicle_fluid_specs s
        JOIN vehicle_taxonomy v ON v.id = s.vehicle_id
        JOIN fluid_categories c ON c.id = s.fluid_category_id
        ORDER BY v.model_year, v.make, c.key
        """
    )
    print(json.dumps({"ok": ok_all, "report": report, "specs": specs}, indent=2, default=str))
    return 0 if ok_all else 1


if __name__ == "__main__":
    raise SystemExit(main())
