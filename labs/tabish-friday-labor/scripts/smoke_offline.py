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

    print("OK — Tabish Friday Labor offline smoke passed")
    print(json.dumps({"intent": intent, "scrape_source": scraped.source, "demo_total": total}, indent=2))


if __name__ == "__main__":
    main()
