"""
Owner's Manual PDF crawler
==========================
Generates candidate OEM PDF URLs for major US makes (2010–2025), HEAD-checks
them, stores valid hits in ``owner_manual_urls``, and downloads PDFs with
polite rate limiting.

Default ``TFL_SCRAPER_MODE=fixture`` never hits the network.
"""

from __future__ import annotations

import logging
import random
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Iterable
from urllib.parse import quote

from config.settings import settings
from services.fluid_harvest.categories import slug_model

logger = logging.getLogger("tfl.fluids.manuals")

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.4 Safari/605.1.15",
]

YearRange = tuple[int, int]
UrlGenerator = Callable[[str, int, int], list[str]]


@dataclass
class ManualUrlHit:
    make: str
    model: str
    year_start: int
    year_end: int
    url: str
    http_status: int
    url_pattern: str


def _delay() -> None:
    base = max(0.35, settings.scraper_delay_seconds)
    time.sleep(base + random.uniform(0.05, 0.55))


# ---------------------------------------------------------------------------
# OEM URL pattern generators (public owner's-manual / literature patterns)
# ---------------------------------------------------------------------------

def ford_urls(model: str, year_start: int, year_end: int) -> list[str]:
    m = slug_model(model)
    urls: list[str] = []
    for y in range(year_start, year_end + 1):
        urls.append(
            f"https://www.fordservicecontent.com/Ford_Content/Catalog/"
            f"owner_information/{y}/{m}/OM/{y}_{m}_owners_manual_en_US.pdf"
        )
        urls.append(
            f"https://www.ford.com/cmslibs/content/dam/brand_ford/"
            f"en_us/brand/resources/owner-manuals/{y}/{m}-om.pdf"
        )
    return urls


def gm_urls(model: str, year_start: int, year_end: int) -> list[str]:
    m = slug_model(model)
    urls: list[str] = []
    for y in range(year_start, year_end + 1):
        urls.append(
            f"https://www.chevrolet.com/content/dam/chevrolet/na/us/english/"
            f"index/ownership/manuals/{y}/{m}-owners-manual.pdf"
        )
        urls.append(
            f"https://my.gm.com/content/dam/gmownerenhancedsecure/"
            f"manuals/{y}/{m}/owners_manual.pdf"
        )
    return urls


def stellantis_urls(model: str, year_start: int, year_end: int) -> list[str]:
    m = slug_model(model)
    urls: list[str] = []
    for y in range(year_start, year_end + 1):
        urls.append(
            f"https://www.mopar.com/moparservice/getManualContent?"
            f"year={y}&model={quote(model)}&lang=en"
        )
        urls.append(
            f"https://www.dodge.com/content/dam/fca-brands/na/dodge/en_us/"
            f"owners/{y}/{m}-owners-manual.pdf"
        )
    return urls


def toyota_urls(model: str, year_start: int, year_end: int) -> list[str]:
    m = slug_model(model)
    urls: list[str] = []
    for y in range(year_start, year_end + 1):
        urls.append(
            f"https://www.toyota.com/t3Portal/document/om-s/{y}/"
            f"OM{y}{m.upper()}/pdf/OM{y}{m.upper()}.pdf"
        )
        urls.append(
            f"https://www.toyota.com/content/dam/toyota/owners/"
            f"manuals/{y}/{m}/owners-manual.pdf"
        )
    return urls


def honda_urls(model: str, year_start: int, year_end: int) -> list[str]:
    m = slug_model(model)
    urls: list[str] = []
    for y in range(year_start, year_end + 1):
        urls.append(
            f"https://techinfo.honda.com/rjanisis/pubs/OM/{y}/"
            f"{m}/A/{y}{m}OM.pdf"
        )
        urls.append(
            f"https://owners.honda.com/Documentum/Owner/"
            f"{y}/{m}/OM/{y}_{m}_OM.pdf"
        )
    return urls


def nissan_urls(model: str, year_start: int, year_end: int) -> list[str]:
    m = slug_model(model)
    urls: list[str] = []
    for y in range(year_start, year_end + 1):
        urls.append(
            f"https://www.nissanusa.com/content/dam/Nissan/"
            f"us/owners/{y}/{m}/owners-manual.pdf"
        )
    return urls


def hyundai_kia_urls(model: str, year_start: int, year_end: int) -> list[str]:
    m = slug_model(model)
    urls: list[str] = []
    for y in range(year_start, year_end + 1):
        urls.append(
            f"https://owners.hyundaiusa.com/content/dam/hyundai/"
            f"us/myhyundai/manuals/{y}/{m}-owners-manual.pdf"
        )
        urls.append(
            f"https://owners.kia.com/content/dam/kia/"
            f"us/owners/manuals/{y}/{m}-om.pdf"
        )
    return urls


def vw_audi_urls(model: str, year_start: int, year_end: int) -> list[str]:
    m = slug_model(model)
    urls: list[str] = []
    for y in range(year_start, year_end + 1):
        urls.append(
            f"https://userguide.volkswagen.com/storage/assets/"
            f"{y}/{m}/en_US/owners-manual.pdf"
        )
        urls.append(
            f"https://www.audiusa.com/content/dam/audiusa/"
            f"owners/manuals/{y}/{m}-owners-manual.pdf"
        )
    return urls


def bmw_urls(model: str, year_start: int, year_end: int) -> list[str]:
    m = slug_model(model)
    urls: list[str] = []
    for y in range(year_start, year_end + 1):
        urls.append(
            f"https://www.bmwusa.com/content/dam/bmwusa/"
            f"owners/{y}/{m}/owners-manual.pdf"
        )
    return urls


def mercedes_urls(model: str, year_start: int, year_end: int) -> list[str]:
    m = slug_model(model)
    urls: list[str] = []
    for y in range(year_start, year_end + 1):
        urls.append(
            f"https://www.mbusa.com/content/dam/mbusa/"
            f"owners/manuals/{y}/{m}-om.pdf"
        )
    return urls


def subaru_urls(model: str, year_start: int, year_end: int) -> list[str]:
    m = slug_model(model)
    urls: list[str] = []
    for y in range(year_start, year_end + 1):
        urls.append(
            f"https://www.subaru.com/content/dam/subaru/"
            f"owners/manuals/{y}/{m}-owners-manual.pdf"
        )
    return urls


def mazda_urls(model: str, year_start: int, year_end: int) -> list[str]:
    m = slug_model(model)
    urls: list[str] = []
    for y in range(year_start, year_end + 1):
        urls.append(
            f"https://www.mazdausa.com/content/dam/mazda/"
            f"owners/{y}/{m}/owners-manual.pdf"
        )
    return urls


def volvo_urls(model: str, year_start: int, year_end: int) -> list[str]:
    m = slug_model(model)
    urls: list[str] = []
    for y in range(year_start, year_end + 1):
        urls.append(
            f"https://www.volvocars.com/us/support/manuals/"
            f"{y}/{m}/owners-manual.pdf"
        )
    return urls


OEM_GENERATORS: dict[str, UrlGenerator] = {
    "ford": ford_urls,
    "gm": gm_urls,
    "chevrolet": gm_urls,
    "gmc": gm_urls,
    "buick": gm_urls,
    "cadillac": gm_urls,
    "stellantis": stellantis_urls,
    "dodge": stellantis_urls,
    "chrysler": stellantis_urls,
    "jeep": stellantis_urls,
    "ram": stellantis_urls,
    "toyota": toyota_urls,
    "honda": honda_urls,
    "acura": honda_urls,
    "nissan": nissan_urls,
    "infiniti": nissan_urls,
    "hyundai": hyundai_kia_urls,
    "kia": hyundai_kia_urls,
    "volkswagen": vw_audi_urls,
    "vw": vw_audi_urls,
    "audi": vw_audi_urls,
    "bmw": bmw_urls,
    "mercedes": mercedes_urls,
    "mercedes-benz": mercedes_urls,
    "subaru": subaru_urls,
    "mazda": mazda_urls,
    "volvo": volvo_urls,
}

MAJOR_US_OEMS = [
    "Ford",
    "GM",
    "Stellantis",
    "Toyota",
    "Honda",
    "Nissan",
    "Hyundai",
    "Kia",
    "Volkswagen",
    "Audi",
    "BMW",
    "Mercedes",
    "Subaru",
    "Mazda",
    "Volvo",
]


def generate_pdf_urls(
    make: str,
    model: str,
    year_start: int = 2010,
    year_end: int = 2025,
) -> list[tuple[str, str]]:
    """Return list of (url_pattern_label, url) candidates for an OEM/model range."""
    gen = OEM_GENERATORS.get(make.lower().strip())
    if not gen:
        logger.warning("No URL generator for make=%s", make)
        return []
    urls = gen(model, year_start, year_end)
    pattern = f"{make.lower()}:{slug_model(model)}:{year_start}-{year_end}"
    return [(pattern, u) for u in urls]


def head_check_url(url: str) -> int:
    """HEAD (or GET fallback) a URL. Fixture mode returns 200 for known seeds."""
    if settings.scraper_mode != "live":
        # Deterministic fixture acceptance for seed vehicles
        if re.search(r"(accord|camry|f-?150)", url, re.I):
            return 200
        return 404

    try:
        import httpx
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("httpx required for live manual crawl") from exc

    headers = {"User-Agent": random.choice(USER_AGENTS)}
    _delay()
    with httpx.Client(follow_redirects=True, timeout=20.0, headers=headers) as client:
        try:
            resp = client.head(url)
            if resp.status_code in (405, 403):
                resp = client.get(url, headers={**headers, "Range": "bytes=0-0"})
            return int(resp.status_code)
        except httpx.HTTPError as exc:
            logger.warning("HEAD failed %s: %s", url, exc)
            return 0


def persist_manual_url(hit: ManualUrlHit) -> None:
    from src.db import execute

    execute(
        """
        INSERT INTO owner_manual_urls
          (make, model, year_start, year_end, url_pattern, url, http_status, fetched_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            hit.make,
            hit.model,
            hit.year_start,
            hit.year_end,
            hit.url_pattern,
            hit.url,
            hit.http_status,
            datetime.now(timezone.utc),
        ),
    )


def discover_manual_urls(
    make: str,
    model: str,
    year_start: int = 2010,
    year_end: int = 2025,
    *,
    persist: bool = True,
    max_checks: int = 40,
) -> list[ManualUrlHit]:
    """Generate + HEAD-check candidate manual URLs; optionally persist 2xx hits."""
    hits: list[ManualUrlHit] = []
    candidates = generate_pdf_urls(make, model, year_start, year_end)[:max_checks]
    for pattern, url in candidates:
        status = head_check_url(url)
        if 200 <= status < 300:
            # Infer year from URL when possible
            ym = re.search(r"(20\d{2})", url)
            y = int(ym.group(1)) if ym else year_start
            hit = ManualUrlHit(
                make=make,
                model=model,
                year_start=y,
                year_end=y,
                url=url,
                http_status=status,
                url_pattern=pattern,
            )
            hits.append(hit)
            if persist:
                try:
                    persist_manual_url(hit)
                except Exception as exc:  # noqa: BLE001
                    logger.warning("persist_manual_url failed: %s", exc)
    logger.info(
        "discover_manual_urls %s %s %s-%s → %s hits",
        make,
        model,
        year_start,
        year_end,
        len(hits),
    )
    return hits


def pdf_temp_dir() -> Path:
    d = settings.staging_dir / "owner_manuals"
    d.mkdir(parents=True, exist_ok=True)
    return d


def download_pdf(url: str, dest_dir: Path | None = None) -> Path | None:
    """
    Download a PDF to a temp folder. Fixture mode copies / returns fixture path
    when a matching seed PDF text fixture exists.
    """
    dest_dir = dest_dir or pdf_temp_dir()
    dest_dir.mkdir(parents=True, exist_ok=True)
    safe = re.sub(r"[^a-zA-Z0-9._-]+", "_", url.split("/")[-1] or "manual.pdf")
    if not safe.lower().endswith(".pdf"):
        safe += ".pdf"
    dest = dest_dir / safe

    if settings.scraper_mode != "live":
        # Prefer sibling fixture text marker (extractor reads .txt fixtures)
        fixture_hint = settings.fixtures_dir / "manuals" / safe.replace(".pdf", ".txt")
        if fixture_hint.exists():
            dest.write_bytes(b"%PDF-1.4\n% fixture stub\n")
            # Place companion .txt next to stub for extractor offline path
            (dest.with_suffix(".txt")).write_text(
                fixture_hint.read_text(encoding="utf-8"),
                encoding="utf-8",
            )
            return dest
        logger.info("fixture mode: no PDF download for %s", url)
        return None

    try:
        import httpx
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("httpx required for live PDF download") from exc

    headers = {"User-Agent": random.choice(USER_AGENTS)}
    _delay()
    with httpx.Client(follow_redirects=True, timeout=60.0, headers=headers) as client:
        resp = client.get(url)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
        logger.info("Downloaded %s → %s (%s bytes)", url, dest, len(resp.content))
        return dest


def crawl_oem_range(
    makes: Iterable[str] | None = None,
    models_by_make: dict[str, list[str]] | None = None,
    year_start: int = 2010,
    year_end: int = 2025,
) -> list[ManualUrlHit]:
    """Batch discover manuals across OEMs/models."""
    makes = list(makes or MAJOR_US_OEMS)
    models_by_make = models_by_make or {
        "Ford": ["F-150", "Escape"],
        "Toyota": ["Camry", "Corolla"],
        "Honda": ["Accord", "Civic"],
        "Nissan": ["Altima"],
        "Hyundai": ["Sonata"],
        "Kia": ["Optima"],
        "Subaru": ["Outback"],
        "Mazda": ["Mazda3"],
        "Volkswagen": ["Jetta"],
        "BMW": ["3-Series"],
        "Mercedes": ["C-Class"],
        "Volvo": ["XC60"],
        "GM": ["Silverado"],
        "Stellantis": ["Ram-1500"],
        "Audi": ["A4"],
    }
    all_hits: list[ManualUrlHit] = []
    for make in makes:
        for model in models_by_make.get(make, []):
            all_hits.extend(
                discover_manual_urls(make, model, year_start, year_end, persist=True)
            )
    return all_hits
