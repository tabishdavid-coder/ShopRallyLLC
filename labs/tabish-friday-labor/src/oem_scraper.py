"""
OEM Parts Catalog Scraper
=========================
Crawl *public* OEM / aftermarket catalog pages to extract component hierarchy
and leaf part numbers for a vehicle.

Default mode is ``fixture`` (offline, deterministic) so labs never hammer live
sites. Set ``TFL_SCRAPER_MODE=live`` to enable HTTP fetches with rate limiting
and rotating user-agents.

Supported make adapters (examples): Honda, Toyota.
"""

from __future__ import annotations

import json
import logging
import random
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus

from config.settings import settings

try:
    from src.db import execute, execute_returning, fetch_one
except Exception:  # noqa: BLE001 — offline smoke may lack psycopg
    execute = execute_returning = fetch_one = None  # type: ignore

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
]


@dataclass
class ScrapeResult:
    year: int
    make: str
    model: str
    engine: str | None
    source: str
    category_paths: list[list[str]]
    leaf_parts: list[dict[str, str]]

    def as_dict(self) -> dict[str, Any]:
        return {
            "year": self.year,
            "make": self.make,
            "model": self.model,
            "engine": self.engine,
            "source": self.source,
            "category_paths": self.category_paths,
            "leaf_parts": self.leaf_parts,
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }


class RateLimiter:
    def __init__(self, delay_seconds: float) -> None:
        self.delay = max(0.25, delay_seconds)
        self._last = 0.0

    def wait(self) -> None:
        elapsed = time.monotonic() - self._last
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)
        self._last = time.monotonic()


def _fixture_for(year: int, make: str, model: str, engine: str | None) -> ScrapeResult | None:
    key = f"{year}_{make}_{model}".lower().replace(" ", "_")
    path = settings.fixtures_dir / f"oem_{key}.json"
    if not path.exists():
        # fuzzy match popular fixtures
        for candidate in settings.fixtures_dir.glob("oem_*.json"):
            if make.lower() in candidate.name and model.lower() in candidate.name:
                path = candidate
                break
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return ScrapeResult(
        year=year,
        make=make,
        model=model,
        engine=engine,
        source=f"fixture:{path.name}",
        category_paths=data.get("category_paths", []),
        leaf_parts=data.get("leaf_parts", []),
    )


def _live_fetch_html(url: str, limiter: RateLimiter) -> str:
    import httpx

    limiter.wait()
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
    }
    with httpx.Client(timeout=25.0, follow_redirects=True, headers=headers) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return resp.text


def _parse_generic_catalog_html(html: str) -> tuple[list[list[str]], list[dict[str, str]]]:
    """
    Lightweight HTML parse — extracts breadcrumb-ish paths and part-number-like tokens.
    Live OEM DOM structures vary; adapters refine this. Safe fallback for labs.
    """
    import re
    from html.parser import HTMLParser

    class _Text(HTMLParser):
        def __init__(self) -> None:
            super().__init__()
            self.chunks: list[str] = []

        def handle_data(self, data: str) -> None:
            t = data.strip()
            if t:
                self.chunks.append(t)

    parser = _Text()
    parser.feed(html)
    text = "\n".join(parser.chunks)

    paths: list[list[str]] = []
    for line in text.splitlines():
        if " > " in line and 2 <= line.count(">") <= 5:
            paths.append([p.strip() for p in line.split(">") if p.strip()])

    part_re = re.compile(r"\b([A-Z0-9]{5,}-?[A-Z0-9]{2,})\b")
    parts = [{"part_number": m.group(1), "description": "scraped"} for m in part_re.finditer(text)]
    # de-dupe
    seen: set[str] = set()
    leaf: list[dict[str, str]] = []
    for p in parts:
        if p["part_number"] not in seen:
            seen.add(p["part_number"])
            leaf.append(p)
    return paths[:200], leaf[:200]


def scrape_honda(year: int, model: str, engine: str | None, limiter: RateLimiter) -> ScrapeResult:
    # Public catalog search URL pattern (example). Fixture mode preferred.
    url = (
        "https://www.estore.honda.com/parts/search?"
        f"year={year}&model={quote_plus(model)}"
    )
    try:
        html = _live_fetch_html(url, limiter)
        paths, parts = _parse_generic_catalog_html(html)
        source = url
    except Exception as exc:  # noqa: BLE001
        logger.warning("Honda live scrape failed (%s); using synthetic hierarchy", exc)
        paths, parts = _synthetic_brake_engine_tree("Honda")
        source = f"synthetic:honda:{exc.__class__.__name__}"
    return ScrapeResult(year, "Honda", model, engine, source, paths, parts)


def scrape_toyota(year: int, model: str, engine: str | None, limiter: RateLimiter) -> ScrapeResult:
    url = f"https://www.toyota.com/parts/search?year={year}&model={quote_plus(model)}"
    try:
        html = _live_fetch_html(url, limiter)
        paths, parts = _parse_generic_catalog_html(html)
        source = url
    except Exception as exc:  # noqa: BLE001
        logger.warning("Toyota live scrape failed (%s); using synthetic hierarchy", exc)
        paths, parts = _synthetic_brake_engine_tree("Toyota")
        source = f"synthetic:toyota:{exc.__class__.__name__}"
    return ScrapeResult(year, "Toyota", model, engine, source, paths, parts)


def _synthetic_brake_engine_tree(make: str) -> tuple[list[list[str]], list[dict[str, str]]]:
    """Broad demo hierarchy when fixtures / live scrape are unavailable."""
    paths = [
        ["Brakes", "Front", "Pads", "Remove & Replace"],
        ["Brakes", "Front", "Rotors", "Remove & Replace"],
        ["Brakes", "Front", "Caliper", "Remove & Replace"],
        ["Brakes", "Rear", "Pads", "Remove & Replace"],
        ["Brakes", "Hydraulic", "Brake Fluid", "Flush"],
        ["Engine", "Lubrication", "Oil Filter", "Replace"],
        ["Engine", "Cooling", "Thermostat", "Remove & Replace"],
        ["Engine", "Cooling", "Water Pump", "Remove & Replace"],
        ["Engine", "Ignition", "Spark Plugs", "Replace"],
        ["Engine", "Timing", "Timing Belt", "Remove & Replace"],
        ["Suspension", "Front", "Strut", "Remove & Replace"],
        ["Suspension", "Front", "Control Arm", "Remove & Replace"],
        ["Suspension", "Front", "Ball Joint", "Remove & Replace"],
        ["Suspension", "Rear", "Shock", "Remove & Replace"],
        ["Steering", "Linkage", "Outer Tie Rod", "Remove & Replace"],
        ["Steering", "Power Assist", "Rack & Pinion", "Remove & Replace"],
        ["Drivetrain", "Transmission", "ATF Fluid", "Flush"],
        ["Drivetrain", "Axle", "CV Axle", "Remove & Replace"],
        ["Electrical", "Charging", "Alternator", "Remove & Replace"],
        ["Electrical", "Charging", "Battery", "Replace"],
        ["Electrical", "Starting", "Starter", "Remove & Replace"],
        ["HVAC", "A/C", "Compressor", "Remove & Replace"],
        ["HVAC", "Heating", "Heater Core", "Remove & Replace"],
        ["Exhaust", "System", "Catalytic Converter", "Remove & Replace"],
        ["Exhaust", "System", "O2 Sensor", "Remove & Replace"],
    ]
    prefix = "HON" if make.lower() == "honda" else "TOY"
    parts = [
        {"part_number": f"{prefix}-PAD-F-45022", "description": "Front brake pad set"},
        {"part_number": f"{prefix}-ROT-F-45251", "description": "Front rotor"},
        {"part_number": f"{prefix}-OIL-FLTR", "description": "Oil filter"},
        {"part_number": f"{prefix}-ALT-31100", "description": "Alternator"},
        {"part_number": f"{prefix}-CV-AXLE", "description": "CV axle"},
    ]
    return paths, parts


def scrape_vehicle(
    year: int,
    make: str,
    model: str,
    engine: str | None = None,
) -> ScrapeResult:
    """
    Scrape (or load fixture for) a vehicle's public OEM catalog hierarchy.

    Returns category paths + leaf part numbers. Does not write to production
    taxonomy tables — call ``normalize_taxonomy`` / staging helpers next.
    """
    make_norm = make.strip().title()
    model_norm = model.strip()

    if settings.scraper_mode != "live":
        fixture = _fixture_for(year, make_norm, model_norm, engine)
        if fixture:
            return fixture
        paths, parts = _synthetic_brake_engine_tree(make_norm)
        return ScrapeResult(
            year,
            make_norm,
            model_norm,
            engine,
            "synthetic:fixture-miss",
            paths,
            parts,
        )

    limiter = RateLimiter(settings.scraper_delay_seconds)
    if make_norm == "Honda":
        return scrape_honda(year, model_norm, engine, limiter)
    if make_norm == "Toyota":
        return scrape_toyota(year, model_norm, engine, limiter)

    # Generic public parts search fallback
    url = f"https://partsouq.com/en/search/all?q={quote_plus(f'{year} {make_norm} {model_norm}')}"
    try:
        html = _live_fetch_html(url, limiter)
        paths, parts = _parse_generic_catalog_html(html)
        source = url
    except Exception as exc:  # noqa: BLE001
        paths, parts = _synthetic_brake_engine_tree(make_norm)
        source = f"synthetic:generic:{exc.__class__.__name__}"
    return ScrapeResult(year, make_norm, model_norm, engine, source, paths, parts)


def persist_scrape_result(result: ScrapeResult) -> Path:
    """Write JSON staging file + optional DB staging row."""
    settings.staging_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    fname = f"{result.year}_{result.make}_{result.model}_{stamp}.json".replace(" ", "_")
    path = settings.staging_dir / fname
    path.write_text(json.dumps(result.as_dict(), indent=2), encoding="utf-8")

    if execute is not None:
        try:
            execute(
                """
                INSERT INTO oem_scrape_staging (year, make, model, engine, source, raw_payload)
                VALUES (%s, %s, %s, %s, %s, %s::jsonb)
                """,
                (
                    result.year,
                    result.make,
                    result.model,
                    result.engine,
                    result.source,
                    json.dumps(result.as_dict()),
                ),
            )
        except Exception as exc:  # noqa: BLE001
            logger.info("DB staging skip (DB unavailable?): %s", exc)

    return path


def fulfill_parts_scrape_job(job_id: str) -> None:
    """Worker entry: resolve queued parts_scrape_jobs row via OEM scrape + upsert."""
    if fetch_one is None or execute is None or execute_returning is None:
        raise RuntimeError("Database helpers unavailable")

    job = fetch_one("SELECT * FROM parts_scrape_jobs WHERE id = %s", (job_id,))
    if not job:
        return
    execute(
        "UPDATE parts_scrape_jobs SET status = 'running' WHERE id = %s",
        (job_id,),
    )
    vehicle = fetch_one("SELECT * FROM vehicle_taxonomy WHERE id = %s", (str(job["vehicle_id"]),))
    if not vehicle:
        execute(
            "UPDATE parts_scrape_jobs SET status = 'failed', finished_at = now() WHERE id = %s",
            (job_id,),
        )
        return

    result = scrape_vehicle(
        int(vehicle["model_year"]),
        str(vehicle["make"]),
        str(vehicle["model"]),
        str(vehicle["engine_config"]),
    )
    persist_scrape_result(result)

    # Attach first leaf part as confirmed fitment for the operation (lab behavior)
    if result.leaf_parts:
        leaf = result.leaf_parts[0]
        mfr = execute_returning(
            """
            INSERT INTO manufacturers (name) VALUES (%s)
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
            """,
            (vehicle["make"],),
        )
        part = execute_returning(
            """
            INSERT INTO parts_catalog (
              part_number, manufacturer_id, description, category_hint, is_active
            ) VALUES (%s, %s, %s, 'OEM_SCRAPE', true)
            ON CONFLICT (part_number, manufacturer_id) DO UPDATE
              SET description = EXCLUDED.description
            RETURNING id
            """,
            (leaf["part_number"], str(mfr["id"]), leaf.get("description") or leaf["part_number"]),
        )
        execute(
            """
            INSERT INTO vehicle_part_fitment (
              vehicle_id, operation_id, part_id, quantity_required,
              variant_flags, fitment_status
            ) VALUES (%s, %s, %s, 1, '{}'::jsonb, 'confirmed')
            ON CONFLICT (vehicle_id, operation_id, part_id) DO UPDATE
              SET fitment_status = 'confirmed'
            """,
            (str(job["vehicle_id"]), str(job["operation_id"]), str(part["id"])),
        )

    execute(
        "UPDATE parts_scrape_jobs SET status = 'done', finished_at = now() WHERE id = %s",
        (job_id,),
    )


if __name__ == "__main__":
    r = scrape_vehicle(2014, "Honda", "Accord", "3.5L V6")
    out = persist_scrape_result(r)
    print(f"Wrote {out} paths={len(r.category_paths)} parts={len(r.leaf_parts)}")
