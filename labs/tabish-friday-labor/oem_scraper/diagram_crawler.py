"""
Exploded-view diagram crawler
=============================
Captures OEM illustration URLs from Partsouq / 7zap / RevolutionParts style
pages (or fixtures). Fixture mode never hits the network.
"""

from __future__ import annotations

import json
import logging
import random
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus, urljoin
from urllib.robotparser import RobotFileParser

from config.settings import settings

logger = logging.getLogger("tfl.diagrams.crawler")

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]


@dataclass
class DiagramHit:
    image_url: str
    source: str
    caption: str | None = None
    category_hint: str | None = None  # e.g. BRAKES.FRONT.PADS
    operation_hint: str | None = None  # e.g. BRAKES.FRONT.PADS.R_AND_R
    local_path: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "image_url": self.image_url,
            "source": self.source,
            "caption": self.caption,
            "category_hint": self.category_hint,
            "operation_hint": self.operation_hint,
            "local_path": self.local_path,
            "captured_at": datetime.now(timezone.utc).isoformat(),
        }


@dataclass
class DiagramScrapeResult:
    year: int
    make: str
    model: str
    engine: str | None
    diagrams: list[DiagramHit] = field(default_factory=list)
    source: str = "fixture"

    def as_dict(self) -> dict[str, Any]:
        return {
            "year": self.year,
            "make": self.make,
            "model": self.model,
            "engine": self.engine,
            "source": self.source,
            "diagrams": [d.as_dict() for d in self.diagrams],
        }


def diagrams_dir() -> Path:
    d = settings.staging_dir / "diagrams"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _delay() -> None:
    time.sleep(max(0.4, settings.scraper_delay_seconds) + random.uniform(0.1, 0.7))


def _robots_allows(url: str) -> bool:
    try:
        from urllib.parse import urlparse

        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        rp = RobotFileParser()
        rp.set_url(robots_url)
        if settings.scraper_mode != "live":
            return True
        _delay()
        rp.read()
        return rp.can_fetch(USER_AGENTS[0], url)
    except Exception as exc:  # noqa: BLE001
        logger.info("robots.txt check skipped (%s); allowing cautiously", exc)
        return True


def extract_diagram_urls_from_payload(payload: dict[str, Any] | list[Any]) -> list[str]:
    """Pull image URLs from Partsouq-style JSON (``image`` / ``img`` / ``illustration``)."""
    found: list[str] = []

    def _accept(val: str) -> str | None:
        v = val.strip()
        if v.startswith("//"):
            return "https:" + v
        if v.startswith(("http://", "https://", "fixture://", "/")):
            return v
        return None

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            for key in ("image", "img", "illustration", "diagram", "imageUrl", "image_url"):
                val = node.get(key)
                if isinstance(val, str):
                    accepted = _accept(val)
                    if accepted:
                        found.append(accepted)
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(payload)
    # de-dupe preserve order
    out: list[str] = []
    seen: set[str] = set()
    for u in found:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def extract_diagram_urls_from_html(html: str, base_url: str = "") -> list[str]:
    """Extract likely exploded-view images from a parts-list page."""
    urls: list[str] = []
    # Prefer explicit diagram/illustration classes or large catalog images
    patterns = [
        r'<img[^>]+(?:class|id)=["\'][^"\']*(?:diagram|explod|illustrat|schema)[^"\']*["\'][^>]+src=["\']([^"\']+)["\']',
        r'<img[^>]+src=["\']([^"\']+)["\'][^>]+(?:class|id)=["\'][^"\']*(?:diagram|explod|illustrat|schema)[^"\']*["\']',
        r'<img[^>]+src=["\']([^"\']+(?:diagram|explod|illustrat|/img/parts/)[^"\']*)["\']',
        r'data-(?:src|image)=["\'](https?://[^"\']+\.(?:jpg|jpeg|png|webp))["\']',
    ]
    for pat in patterns:
        for m in re.finditer(pat, html, flags=re.I):
            raw = m.group(1).strip()
            if raw.startswith("//"):
                raw = "https:" + raw
            elif raw.startswith("/") and base_url:
                raw = urljoin(base_url, raw)
            if raw.startswith("http"):
                urls.append(raw)
    out: list[str] = []
    seen: set[str] = set()
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def _load_diagram_list(path: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Accept ``{\"diagrams\":[...]}`` or a bare list of diagram objects."""
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return data, {}
    if isinstance(data, dict):
        return list(data.get("diagrams") or []), data
    return [], {}


def fixture_captures_for_source(source: str) -> list[DiagramHit]:
    """Load source-specific fixture captures (partsouq / 7zap / revolutionparts)."""
    path = settings.fixtures_dir / f"diagrams_{source.lower()}.json"
    if not path.exists():
        return []
    rows, _meta = _load_diagram_list(path)
    return [
        DiagramHit(
            image_url=d["image_url"],
            source=d.get("source") or source,
            caption=d.get("caption"),
            category_hint=d.get("category_hint"),
            operation_hint=d.get("operation_hint"),
            local_path=d.get("local_path"),
        )
        for d in rows
        if d.get("image_url")
    ]


def _fixture_diagrams(year: int, make: str, model: str) -> DiagramScrapeResult | None:
    key = f"{year}_{make}_{model}".lower().replace(" ", "_").replace("-", "_")
    path = settings.fixtures_dir / f"diagrams_{key}.json"
    if not path.exists():
        # fuzzy vehicle-named fixture
        for candidate in settings.fixtures_dir.glob("diagrams_*.json"):
            name = candidate.name.lower()
            if name in {
                "diagrams_partsouq.json",
                "diagrams_7zap.json",
                "diagrams_revolutionparts.json",
            }:
                continue
            if make.lower() in name and model.lower().replace("-", "_") in name:
                path = candidate
                break
    hits: list[DiagramHit] = []
    engine = None
    source_name = "fixture_missing"
    if path.exists():
        rows, meta = _load_diagram_list(path)
        engine = meta.get("engine")
        source_name = f"fixture:{path.name}"
        hits = [
            DiagramHit(
                image_url=d["image_url"],
                source=d.get("source") or source_name,
                caption=d.get("caption"),
                category_hint=d.get("category_hint"),
                operation_hint=d.get("operation_hint"),
                local_path=d.get("local_path"),
            )
            for d in rows
            if d.get("image_url")
        ]
    # Merge source catalogs when vehicle fixture is thin / missing
    if not hits:
        for src in ("partsouq", "7zap", "revolutionparts"):
            hits.extend(fixture_captures_for_source(src))
        if hits:
            source_name = "fixture:source_catalogs"
    if not hits:
        return None
    return DiagramScrapeResult(
        year=year,
        make=make,
        model=model,
        engine=engine,
        diagrams=hits,
        source=source_name,
    )


def download_diagram(image_url: str, dest_dir: Path | None = None) -> str | None:
    """Download image to local cache. Fixture mode skips network."""
    dest_dir = dest_dir or diagrams_dir()
    dest_dir.mkdir(parents=True, exist_ok=True)
    safe = re.sub(r"[^a-zA-Z0-9._-]+", "_", image_url.split("/")[-1] or "diagram.jpg")
    if "." not in safe:
        safe += ".jpg"
    dest = dest_dir / safe

    if settings.scraper_mode != "live":
        # Keep a tiny placeholder so local_path is set for demos
        if not dest.exists():
            dest.write_bytes(
                b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
                b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00"
                b"\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N"
                b"\x00\x00\x00\x00IEND\xaeB`\x82"
            )
        return str(dest)

    if not _robots_allows(image_url):
        logger.warning("robots.txt disallows %s", image_url)
        return None
    try:
        import httpx
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("httpx required for live diagram download") from exc

    _delay()
    headers = {"User-Agent": random.choice(USER_AGENTS)}
    with httpx.Client(follow_redirects=True, timeout=45.0, headers=headers) as client:
        resp = client.get(image_url)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
    return str(dest)


def scrape_partsouq_diagrams(
    year: int,
    make: str,
    model: str,
    engine: str | None = None,
) -> list[DiagramHit]:
    q = quote_plus(f"{year} {make} {model}")
    url = f"https://partsouq.com/en/search/all?q={q}"
    if settings.scraper_mode != "live":
        return []
    if not _robots_allows(url):
        return []
    try:
        import httpx
    except ImportError:
        return []
    _delay()
    with httpx.Client(follow_redirects=True, timeout=30.0, headers={"User-Agent": USER_AGENTS[0]}) as client:
        resp = client.get(url)
        resp.raise_for_status()
        # Try embedded JSON first
        m = re.search(r"window\.__DATA__\s*=\s*(\{.*?\});", resp.text, re.S)
        urls: list[str] = []
        if m:
            try:
                urls = extract_diagram_urls_from_payload(json.loads(m.group(1)))
            except json.JSONDecodeError:
                urls = []
        if not urls:
            urls = extract_diagram_urls_from_html(resp.text, base_url=url)
    return [
        DiagramHit(image_url=u, source="partsouq", caption=f"{year} {make} {model} exploded view")
        for u in urls[:12]
    ]


def scrape_7zap_diagrams(year: int, make: str, model: str) -> list[DiagramHit]:
    url = f"https://7zap.com/en/search/?q={quote_plus(f'{year} {make} {model}')}"
    if settings.scraper_mode != "live":
        return []
    if not _robots_allows(url):
        return []
    try:
        import httpx
    except ImportError:
        return []
    _delay()
    with httpx.Client(follow_redirects=True, timeout=30.0, headers={"User-Agent": USER_AGENTS[0]}) as client:
        resp = client.get(url)
        resp.raise_for_status()
        urls = extract_diagram_urls_from_html(resp.text, base_url=url)
    return [DiagramHit(image_url=u, source="7zap", caption=f"{make} {model} illustration") for u in urls[:12]]


def scrape_revolution_parts_diagrams(year: int, make: str, model: str) -> list[DiagramHit]:
    url = f"https://www.revolutionparts.com/search?q={quote_plus(f'{year} {make} {model}')}"
    if settings.scraper_mode != "live":
        return []
    if not _robots_allows(url):
        return []
    try:
        import httpx
    except ImportError:
        return []
    _delay()
    with httpx.Client(follow_redirects=True, timeout=30.0, headers={"User-Agent": USER_AGENTS[0]}) as client:
        resp = client.get(url)
        resp.raise_for_status()
        urls = extract_diagram_urls_from_html(resp.text, base_url=url)
    return [
        DiagramHit(image_url=u, source="revolutionparts", caption=f"{make} parts diagram")
        for u in urls[:12]
    ]


def capture_diagrams_for_vehicle(
    year: int,
    make: str,
    model: str,
    engine: str | None = None,
    *,
    download: bool = True,
) -> DiagramScrapeResult:
    """
    Capture exploded diagrams for a vehicle (fixture-first).
    Live mode fans out to Partsouq → 7zap → RevolutionParts with rate limits.
    """
    fixture = _fixture_diagrams(year, make, model)
    if settings.scraper_mode != "live" or fixture:
        result = fixture or DiagramScrapeResult(year, make, model, engine, [], "fixture_missing")
    else:
        hits = (
            scrape_partsouq_diagrams(year, make, model, engine)
            + scrape_7zap_diagrams(year, make, model)
            + scrape_revolution_parts_diagrams(year, make, model)
        )
        # de-dupe by URL
        seen: set[str] = set()
        uniq: list[DiagramHit] = []
        for h in hits:
            if h.image_url in seen:
                continue
            seen.add(h.image_url)
            uniq.append(h)
        result = DiagramScrapeResult(year, make, model, engine, uniq, "live_multi")

    if download:
        for hit in result.diagrams:
            try:
                hit.local_path = download_diagram(hit.image_url)
            except Exception as exc:  # noqa: BLE001
                logger.warning("diagram download failed %s: %s", hit.image_url, exc)
    return result
