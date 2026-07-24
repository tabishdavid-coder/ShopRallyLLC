"""
Seed industry-pattern job associations (MOTOR / ProDemand-style add-ons).

Ensures required service_operations exist, then upserts operation_associations
with initial frequency_score and overlap_discount values.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.db import execute, execute_returning, fetch_one  # noqa: E402
from src.normalize_taxonomy import upsert_category, upsert_operation  # noqa: E402

logger = logging.getLogger("tfl.assoc.seeder")

# (primary_code, associated_code, overlap_discount_hrs, assoc_standalone_hrs, primary_standalone_hrs)
# frequency_score defaults to 80 for industry seeds.
COMMON_ASSOCIATIONS: list[tuple[str, str, float, float, float]] = [
    # Front Brake Pads → Rotors, Fluid Flush, Hardware
    ("BRAKES.FRONT.PADS.R_AND_R", "BRAKES.FRONT.ROTORS.R_AND_R", 1.20, 1.50, 1.10),
    ("BRAKES.FRONT.PADS.R_AND_R", "BRAKES.FLUID.FLUSH.REPLACE", 0.30, 0.80, 1.10),
    ("BRAKES.FRONT.PADS.R_AND_R", "BRAKES.FRONT.HARDWARE.REPLACE", 0.20, 0.40, 1.10),
    # Spark Plugs → Coils, Intake Gasket
    ("ENGINE.IGNITION.SPARK_PLUGS.REPLACE", "ENGINE.IGNITION.COILS.R_AND_R", 0.40, 1.00, 1.20),
    ("ENGINE.IGNITION.SPARK_PLUGS.REPLACE", "ENGINE.INTAKE.GASKET.R_AND_R", 0.60, 2.50, 1.20),
    # Timing Belt → Water Pump, Tensioner, Serpentine
    ("ENGINE.TIMING.BELT.REPLACE", "ENGINE.COOLING.WATER_PUMP.R_AND_R", 1.50, 2.80, 4.50),
    ("ENGINE.TIMING.BELT.REPLACE", "ENGINE.TIMING.TENSIONER.REPLACE", 0.80, 1.20, 4.50),
    ("ENGINE.TIMING.BELT.REPLACE", "ENGINE.BELT.SERPENTINE.REPLACE", 0.30, 0.50, 4.50),
    # Struts → Mounts, Sway links
    ("SUSPENSION.FRONT.STRUT.R_AND_R", "SUSPENSION.FRONT.STRUT_MOUNT.R_AND_R", 0.50, 0.80, 2.20),
    ("SUSPENSION.FRONT.STRUT.R_AND_R", "SUSPENSION.FRONT.SWAY_LINK.R_AND_R", 0.25, 0.60, 2.20),
    # Oil Change → Cabin / Engine air filter
    ("ENGINE.OIL.FILTER.REPLACE", "ENGINE.FILTER.CABIN_AIR.REPLACE", 0.10, 0.30, 0.40),
    ("ENGINE.OIL.FILTER.REPLACE", "ENGINE.FILTER.AIR.REPLACE", 0.10, 0.30, 0.40),
    # ATF Drain & Fill → Transmission Filter
    ("DRIVETRAIN.TRANSMISSION.ATF.DRAIN_FILL", "DRIVETRAIN.TRANSMISSION.FILTER.REPLACE", 0.40, 1.00, 0.90),
    # Radiator → Hoses, Thermostat
    ("ENGINE.COOLING.RADIATOR.R_AND_R", "ENGINE.COOLING.HOSES.REPLACE", 0.50, 1.00, 2.50),
    ("ENGINE.COOLING.RADIATOR.R_AND_R", "ENGINE.COOLING.THERMOSTAT.REPLACE", 0.40, 0.90, 2.50),
    # Water Pump → Coolant flush, Thermostat
    ("ENGINE.COOLING.WATER_PUMP.R_AND_R", "ENGINE.COOLING.COOLANT.FLUSH", 0.30, 0.80, 2.80),
    ("ENGINE.COOLING.WATER_PUMP.R_AND_R", "ENGINE.COOLING.THERMOSTAT.REPLACE", 0.35, 0.90, 2.80),
    # Alternator → Serpentine Belt
    ("ELECTRICAL.CHARGING.ALTERNATOR.R_AND_R", "ENGINE.BELT.SERPENTINE.REPLACE", 0.25, 0.50, 1.80),
    # Battery → Terminal clean, Alternator test
    ("ELECTRICAL.BATTERY.BATTERY.R_AND_R", "ELECTRICAL.BATTERY.TERMINALS.CLEAN", 0.10, 0.30, 0.40),
    ("ELECTRICAL.BATTERY.BATTERY.R_AND_R", "ELECTRICAL.CHARGING.ALTERNATOR.TEST", 0.05, 0.20, 0.40),
]

# operation_code → (description, default_hours, category path levels 1..4 names)
OPERATION_META: dict[str, tuple[str, float, list[str]]] = {
    "BRAKES.FRONT.PADS.R_AND_R": ("Front brake pads — remove & replace", 1.10, ["Brakes", "Front", "Pads", "Remove & Replace"]),
    "BRAKES.FRONT.ROTORS.R_AND_R": ("Front rotors — remove & replace", 1.50, ["Brakes", "Front", "Rotors", "Remove & Replace"]),
    "BRAKES.FLUID.FLUSH.REPLACE": ("Brake fluid flush", 0.80, ["Brakes", "Fluid", "Flush", "Replace"]),
    "BRAKES.FRONT.HARDWARE.REPLACE": ("Front brake hardware kit", 0.40, ["Brakes", "Front", "Hardware", "Replace"]),
    "ENGINE.IGNITION.SPARK_PLUGS.REPLACE": ("Spark plugs — replace", 1.20, ["Engine", "Ignition", "Spark Plugs", "Replace"]),
    "ENGINE.IGNITION.COILS.R_AND_R": ("Ignition coils — remove & replace", 1.00, ["Engine", "Ignition", "Coils", "Remove & Replace"]),
    "ENGINE.INTAKE.GASKET.R_AND_R": ("Intake gasket — remove & replace", 2.50, ["Engine", "Intake", "Gasket", "Remove & Replace"]),
    "ENGINE.TIMING.BELT.REPLACE": ("Timing belt — replace", 4.50, ["Engine", "Timing", "Belt", "Replace"]),
    "ENGINE.COOLING.WATER_PUMP.R_AND_R": ("Water pump — remove & replace", 2.80, ["Engine", "Cooling", "Water Pump", "Remove & Replace"]),
    "ENGINE.TIMING.TENSIONER.REPLACE": ("Timing belt tensioner — replace", 1.20, ["Engine", "Timing", "Tensioner", "Replace"]),
    "ENGINE.BELT.SERPENTINE.REPLACE": ("Serpentine belt — replace", 0.50, ["Engine", "Belt", "Serpentine", "Replace"]),
    "SUSPENSION.FRONT.STRUT.R_AND_R": ("Front strut assembly — remove & replace", 2.20, ["Suspension", "Front", "Strut", "Remove & Replace"]),
    "SUSPENSION.FRONT.STRUT_MOUNT.R_AND_R": ("Front strut mount — remove & replace", 0.80, ["Suspension", "Front", "Strut Mount", "Remove & Replace"]),
    "SUSPENSION.FRONT.SWAY_LINK.R_AND_R": ("Front sway bar link — remove & replace", 0.60, ["Suspension", "Front", "Sway Link", "Remove & Replace"]),
    "ENGINE.OIL.FILTER.REPLACE": ("Engine oil and filter — replace", 0.40, ["Engine", "Oil", "Filter", "Replace"]),
    "ENGINE.FILTER.CABIN_AIR.REPLACE": ("Cabin air filter — replace", 0.30, ["Engine", "Filter", "Cabin Air", "Replace"]),
    "ENGINE.FILTER.AIR.REPLACE": ("Engine air filter — replace", 0.30, ["Engine", "Filter", "Air", "Replace"]),
    "DRIVETRAIN.TRANSMISSION.ATF.DRAIN_FILL": ("ATF drain and fill", 0.90, ["Drivetrain", "Transmission", "ATF", "Drain Fill"]),
    "DRIVETRAIN.TRANSMISSION.FILTER.REPLACE": ("Transmission filter — replace", 1.00, ["Drivetrain", "Transmission", "Filter", "Replace"]),
    "ENGINE.COOLING.RADIATOR.R_AND_R": ("Radiator — remove & replace", 2.50, ["Engine", "Cooling", "Radiator", "Remove & Replace"]),
    "ENGINE.COOLING.HOSES.REPLACE": ("Coolant hoses — replace", 1.00, ["Engine", "Cooling", "Hoses", "Replace"]),
    "ENGINE.COOLING.THERMOSTAT.REPLACE": ("Thermostat — replace", 0.90, ["Engine", "Cooling", "Thermostat", "Replace"]),
    "ENGINE.COOLING.COOLANT.FLUSH": ("Coolant flush and fill", 0.80, ["Engine", "Cooling", "Coolant", "Flush"]),
    "ELECTRICAL.CHARGING.ALTERNATOR.R_AND_R": ("Alternator — remove & replace", 1.80, ["Electrical", "Charging", "Alternator", "Remove & Replace"]),
    "ELECTRICAL.BATTERY.BATTERY.R_AND_R": ("Battery — remove & replace", 0.40, ["Electrical", "Battery", "Battery", "Remove & Replace"]),
    "ELECTRICAL.BATTERY.TERMINALS.CLEAN": ("Battery terminal clean/service", 0.30, ["Electrical", "Battery", "Terminals", "Clean"]),
    "ELECTRICAL.CHARGING.ALTERNATOR.TEST": ("Alternator output test", 0.20, ["Electrical", "Charging", "Alternator", "Test"]),
}


def _slug(segment: str) -> str:
    import re

    s = re.sub(r"[^A-Za-z0-9]+", "_", segment.strip()).strip("_").upper()
    return s or "UNKNOWN"


def ensure_operation(operation_code: str) -> str:
    """Ensure category path + operation row exist; return operation uuid."""
    meta = OPERATION_META.get(operation_code)
    if not meta:
        raise ValueError(f"No OPERATION_META for {operation_code}")
    description, hours, path = meta
    segs = operation_code.split(".")
    parent_id: str | None = None
    last_cat_id: str | None = None
    for i, name in enumerate(path[:4], start=1):
        key = ".".join(segs[:i]) if len(segs) >= i else _slug(name)
        last_cat_id = upsert_category(i, key, name, parent_id)
        parent_id = last_cat_id
    assert last_cat_id
    return upsert_operation(last_cat_id, operation_code, description, hours)


def seed_common_associations(*, frequency_score: float = 80.0) -> dict[str, Any]:
    """
    Insert initial known add-ons based on industry patterns.
    Returns counts of operations ensured and associations upserted.
    """
    ensured: set[str] = set()
    for primary, associated, *_rest in COMMON_ASSOCIATIONS:
        for code in (primary, associated):
            if code not in ensured:
                ensure_operation(code)
                ensured.add(code)

    upserted = 0
    for primary, associated, overlap, assoc_hrs, primary_hrs in COMMON_ASSOCIATIONS:
        p = fetch_one(
            "SELECT id FROM service_operations WHERE operation_code = %s",
            (primary,),
        )
        a = fetch_one(
            "SELECT id FROM service_operations WHERE operation_code = %s",
            (associated,),
        )
        if not p or not a:
            logger.warning("skip assoc missing ops %s → %s", primary, associated)
            continue

        # Initial avg_combined ≈ standalone sum − overlap
        avg_combined = round(max(0.0, primary_hrs + assoc_hrs - overlap), 2)
        execute(
            """
            INSERT INTO operation_associations (
              primary_operation_id, associated_operation_id, association_type,
              frequency_score, avg_combined_labor, overlap_discount, is_active, last_updated
            ) VALUES (%s, %s, 'add_on', %s, %s, %s, true, now())
            ON CONFLICT (primary_operation_id, associated_operation_id) DO UPDATE SET
              frequency_score = EXCLUDED.frequency_score,
              avg_combined_labor = EXCLUDED.avg_combined_labor,
              overlap_discount = EXCLUDED.overlap_discount,
              is_active = true,
              last_updated = now()
            """,
            (
                str(p["id"]),
                str(a["id"]),
                frequency_score,
                avg_combined,
                overlap,
            ),
        )
        upserted += 1
        logger.info(
            "assoc %s → %s freq=%s overlap=%s combined=%s",
            primary,
            associated,
            frequency_score,
            overlap,
            avg_combined,
        )

    return {
        "ok": True,
        "operations_ensured": len(ensured),
        "associations_upserted": upserted,
        "frequency_score": frequency_score,
    }


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    result = seed_common_associations()
    print(result)


if __name__ == "__main__":
    main()
