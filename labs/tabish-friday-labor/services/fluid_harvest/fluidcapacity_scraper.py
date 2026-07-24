"""
fluidcapacity.com cross-reference spider
========================================
Given make/model/year/engine, fetch the matching page and extract fluid rows.
Fixture mode loads JSON from data/fixtures — no network, no fees.
"""

from __future__ import annotations

import json
import logging
import random
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

from config.settings import settings
from services.fluid_harvest.categories import (
    map_label_to_category_key,
    slug_engine,
    slug_model,
)

logger = logging.getLogger("tfl.fluids.fluidcapacity")

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]


@dataclass
class FluidCapacityRow:
    category_key: str
    capacity: float | None
    capacity_unit: str
    fluid_type: str | None
    notes: str | None
    source_label: str
    raw: dict[str, Any]

    def as_dict(self) -> dict[str, Any]:
        return {
            "category_key": self.category_key,
            "capacity": self.capacity,
            "capacity_unit": self.capacity_unit,
            "fluid_type": self.fluid_type,
            "notes": self.notes,
            "source_label": self.source_label,
            "raw": self.raw,
        }


def build_fluidcapacity_url(
    year: int,
    make: str,
    model: str,
    engine: str | None,
) -> str:
    """e.g. https://www.fluidcapacity.com/2012/toyota/camry/2.5l-l4/"""
    eng = slug_engine(engine)
    # normalize common "2.5L I4" → "2.5l-l4"
    eng = eng.replace("i4", "l4").replace("i-4", "l4").replace("v-6", "v6")
    return (
        f"https://www.fluidcapacity.com/{year}/"
        f"{quote(make.lower())}/{quote(slug_model(model))}/{eng}/"
    )


def _fixture_path(year: int, make: str, model: str, engine: str | None) -> Any:
    key = f"{year}_{make}_{model}".lower().replace(" ", "_").replace("-", "")
    # try a few aliases
    candidates = [
        settings.fixtures_dir / f"fluidcapacity_{key}.json",
        settings.fixtures_dir
        / f"fluidcapacity_{year}_{slug_model(make)}_{slug_model(model)}.json",
    ]
    eng = slug_engine(engine).replace("-", "")
    candidates.append(
        settings.fixtures_dir
        / f"fluidcapacity_{year}_{slug_model(make)}_{slug_model(model)}_{eng}.json"
    )
    for p in candidates:
        if p.exists():
            return p
    return None


def _parse_capacity(text: str) -> tuple[float | None, str]:
    m = re.search(r"(\d+(?:\.\d+)?)\s*(qt|quarts?|L|liters?|litres?)", text, re.I)
    if not m:
        m2 = re.search(r"(\d+(?:\.\d+)?)", text)
        return (float(m2.group(1)), "qt") if m2 else (None, "qt")
    val = float(m.group(1))
    unit = m.group(2).lower()
    if unit.startswith("l"):
        val = round(val * 1.05669, 2)
        return val, "qt"
    return val, "qt"


def parse_fluidcapacity_html(html: str) -> list[FluidCapacityRow]:
    """Lightweight HTML table parser (no BeautifulSoup dependency)."""
    rows: list[FluidCapacityRow] = []
    # row-ish: <tr>...</tr>
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", html, flags=re.I | re.S):
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, flags=re.I | re.S)
        cells = [re.sub(r"<[^>]+>", " ", c) for c in cells]
        cells = [re.sub(r"\s+", " ", c).strip() for c in cells]
        if len(cells) < 2:
            continue
        label = cells[0]
        key = map_label_to_category_key(label)
        if not key:
            continue
        cap_text = cells[1]
        capacity, unit = _parse_capacity(cap_text)
        ftype = cells[2] if len(cells) > 2 else None
        notes = cells[3] if len(cells) > 3 else None
        rows.append(
            FluidCapacityRow(
                category_key=key,
                capacity=capacity,
                capacity_unit=unit,
                fluid_type=ftype or None,
                notes=notes or None,
                source_label=label,
                raw={"cells": cells},
            )
        )
    return rows


def parse_fluidcapacity_fixture(data: dict[str, Any]) -> list[FluidCapacityRow]:
    rows: list[FluidCapacityRow] = []
    for item in data.get("fluids", []):
        label = str(item.get("label") or item.get("category") or "")
        key = item.get("category_key") or map_label_to_category_key(label)
        if not key:
            continue
        cap = item.get("capacity")
        unit = str(item.get("capacity_unit") or "qt")
        if isinstance(cap, (int, float)) and unit.lower().startswith("l"):
            cap = round(float(cap) * 1.05669, 2)
            unit = "qt"
        rows.append(
            FluidCapacityRow(
                category_key=str(key),
                capacity=float(cap) if cap is not None else None,
                capacity_unit="qt" if unit.lower().startswith(("qt", "quart")) else unit,
                fluid_type=item.get("fluid_type"),
                notes=item.get("notes"),
                source_label=label or str(key),
                raw=item,
            )
        )
    return rows


def scrape_fluidcapacity(
    year: int,
    make: str,
    model: str,
    engine: str | None = None,
) -> dict[str, Any]:
    """
    Scrape fluidcapacity.com (or fixture) for a vehicle.
    Returns structured dict with URL + rows.
    """
    url = build_fluidcapacity_url(year, make, model, engine)

    if settings.scraper_mode != "live":
        path = _fixture_path(year, make, model, engine)
        if not path:
            logger.warning("No fluidcapacity fixture for %s %s %s %s", year, make, model, engine)
            return {
                "url": url,
                "source": "fluidcapacity_fixture_missing",
                "fluids": [],
                "scraped_at": datetime.now(timezone.utc).isoformat(),
            }
        data = json.loads(path.read_text(encoding="utf-8"))
        rows = parse_fluidcapacity_fixture(data)
        return {
            "url": data.get("url") or url,
            "source": "fluidcapacity_fixture",
            "fluids": [r.as_dict() for r in rows],
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }

    try:
        import httpx
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("httpx required for live fluidcapacity scrape") from exc

    time.sleep(max(0.35, settings.scraper_delay_seconds) + random.uniform(0.1, 0.6))
    headers = {"User-Agent": random.choice(USER_AGENTS)}
    with httpx.Client(follow_redirects=True, timeout=30.0, headers=headers) as client:
        resp = client.get(url)
        if resp.status_code >= 400:
            logger.warning("fluidcapacity %s → %s", url, resp.status_code)
            return {
                "url": url,
                "source": "fluidcapacity_http_error",
                "http_status": resp.status_code,
                "fluids": [],
                "scraped_at": datetime.now(timezone.utc).isoformat(),
            }
        rows = parse_fluidcapacity_html(resp.text)

    return {
        "url": url,
        "source": "fluidcapacity_live",
        "fluids": [r.as_dict() for r in rows],
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }


def upsert_fluidcapacity_staging(
    vehicle_id: str | None,
    year: int,
    make: str,
    model: str,
    engine: str | None,
    scrape: dict[str, Any],
) -> int:
    """Persist scrape rows into fluid_capacity_staging. Returns insert count."""
    from src.db import execute

    n = 0
    for row in scrape.get("fluids", []):
        execute(
            """
            INSERT INTO fluid_capacity_staging
              (vehicle_id, year, make, model, engine, category_key,
               capacity, capacity_unit, fluid_type, notes, source_url, raw_row)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
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
                row.get("notes"),
                scrape.get("url"),
                json.dumps(row.get("raw") or row),
            ),
        )
        n += 1
    return n
