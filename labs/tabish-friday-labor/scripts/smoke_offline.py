#!/usr/bin/env python3
"""Offline smoke tests — no Postgres / OpenAI required."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.llm_parser import parse_technician_intent_offline_demo  # noqa: E402
from src.oem_scraper import scrape_vehicle  # noqa: E402
from src.taxonomy_keys import path_to_keys  # noqa: E402
from services.association_hours import compute_addon_hours  # noqa: E402
from services.fluid_harvest.fluid_extractor import extract_fluids_from_pdf  # noqa: E402
from services.fluid_harvest.fluid_normalizer import merge_fluid_sources  # noqa: E402
from services.fluid_harvest.fluidcapacity_scraper import scrape_fluidcapacity  # noqa: E402
from services.fluid_harvest.owner_manual_scraper import generate_pdf_urls  # noqa: E402
from services.job_association_seeder import COMMON_ASSOCIATIONS  # noqa: E402


def main() -> None:
    keys = [
        "BRAKES.FRONT.PADS.R_AND_R",
        "BRAKES.FRONT.ROTORS.R_AND_R",
        "ENGINE.OIL.FILTER.REPLACE",
    ]
    intent = parse_technician_intent_offline_demo(
        "front pads on a 15 accord 2.4 premium please",
        keys,
    )
    assert intent["vehicle"]["make"] == "Honda"
    assert intent["operations"], "expected at least one operation"
    assert "labor" not in intent and "price" not in json.dumps(intent).lower()

    scraped = scrape_vehicle(2014, "Honda", "Accord", "3.5L V6")
    assert scraped.category_paths, "fixture paths required"
    assert scraped.leaf_parts, "fixture parts required"

    keys_path = path_to_keys(["Brakes", "Front", "Pads", "Remove & Replace"])
    assert keys_path[-1] == "BRAKES.FRONT.PADS.R_AND_R"

    # Billing money math (pure, no DB)
    hours = 1.1
    rate = 145.00
    total = round(hours * rate * 1, 2)
    assert total == 159.5

    # Fluid harvest offline path (fixtures, no Postgres)
    urls = generate_pdf_urls("Honda", "Accord", 2014, 2014)
    assert urls, "OEM URL patterns required"

    manual = ROOT / "data" / "fixtures" / "manuals" / "2014_honda_accord.txt"
    stub_pdf = ROOT / "staging" / "owner_manuals" / "2014_honda_accord.pdf"
    stub_pdf.parent.mkdir(parents=True, exist_ok=True)
    stub_pdf.write_bytes(b"%PDF-1.4\n%fixture\n")
    stub_pdf.with_suffix(".txt").write_text(manual.read_text(encoding="utf-8"), encoding="utf-8")
    oem = extract_fluids_from_pdf(stub_pdf, "2014 Honda Accord")
    assert any(f["category_key"] == "ENG_OIL" for f in oem["fluids"]), oem

    fc = scrape_fluidcapacity(2014, "Honda", "Accord", "3.5L V6")
    assert fc["fluids"], "fluidcapacity fixture required"
    merged = merge_fluid_sources(oem["fluids"], fc["fluids"])
    oil = next(m for m in merged if m.category_key == "ENG_OIL")
    assert oil.confidence == 100, oil
    assert abs(oil.capacity - 4.5) <= 0.15, oil

    # Job association hour math (pads → rotors industry seed)
    pads_rotors = next(
        a
        for a in COMMON_ASSOCIATIONS
        if a[0] == "BRAKES.FRONT.PADS.R_AND_R" and a[1] == "BRAKES.FRONT.ROTORS.R_AND_R"
    )
    _primary, _assoc, overlap, assoc_hrs, primary_hrs = pads_rotors
    avg_combined = primary_hrs + assoc_hrs - overlap
    additional, combined = compute_addon_hours(
        primary_hours=primary_hrs,
        associated_standalone=assoc_hrs,
        avg_combined_labor=avg_combined,
        overlap_discount=overlap,
    )
    assert abs(additional - (avg_combined - primary_hrs)) < 0.01
    assert abs(combined - avg_combined) < 0.01
    assert len(COMMON_ASSOCIATIONS) >= 20

    print("OK — Tabish Friday Labor offline smoke passed (labor + fluids + associations)")
    print(
        json.dumps(
            {
                "intent": intent,
                "scrape_source": scraped.source,
                "demo_total": total,
                "fluid_oil": {"capacity": oil.capacity, "confidence": oil.confidence, "source": oil.source},
                "addon_pads_rotors": {
                    "additional_hours": additional,
                    "combined_total_hours": combined,
                    "overlap_discount": overlap,
                },
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
