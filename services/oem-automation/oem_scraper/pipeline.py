"""OEM catalog scrape pipeline — DataResolver fallback + cache."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from db.connection import fetch_active_sources
from oem_scraper.urls import build_url, probe_source
from services.redundancy import AllSourcesFailedException, DataResolver

logger = logging.getLogger(__name__)

_resolver = DataResolver()
_pipeline_cache: dict[str, Any] = {}

# Re-export for health_monitor backward compatibility
_build_url = build_url
_probe_source = probe_source


class ScrapeResult:
    def __init__(
        self,
        *,
        ok: bool,
        source_name: str | None,
        payload: dict[str, Any] | None,
        from_cache: bool,
        stale: bool,
        error: str | None = None,
    ):
        self.ok = ok
        self.source_name = source_name
        self.payload = payload
        self.from_cache = from_cache
        self.stale = stale
        self.error = error


def scrape_vehicle(
    vehicle: dict[str, Any],
    *,
    endpoint_key: str = "catalog",
    cache: dict[str, Any] | None = None,
) -> ScrapeResult:
    """Try active sources via DataResolver; fall back to cache."""
    vehicle_id = f"{vehicle.get('year')}|{vehicle.get('make')}|{vehicle.get('model')}"
    cache_key = f"parts|{vehicle_id}|{endpoint_key}"
    sources = fetch_active_sources()
    shared_cache = cache if cache is not None else _pipeline_cache

    def _fetch(source: dict[str, Any]) -> dict[str, Any]:
        ok, msg, _ = probe_source(source, vehicle)
        if not ok:
            raise RuntimeError(msg)
        url = build_url(source, endpoint_key, vehicle)
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            resp = client.get(url, headers={"User-Agent": "ShopRally-OEM-Scraper/1.0"})
            if resp.status_code >= 400:
                raise RuntimeError(f"HTTP {resp.status_code}")
            payload = {
                "source": source["sourceName"],
                "url": url,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
                "raw_length": len(resp.text),
                "snippet": resp.text[:1000],
            }
            shared_cache[cache_key] = payload
            return payload

    if not sources:
        stub = {
            "source": "stub",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "snippet": "offline stub",
        }
        return ScrapeResult(ok=True, source_name="stub", payload=stub, from_cache=False, stale=True)

    try:
        result = _resolver.fetch_with_fallback(
            sources, cache_key, None, _fetch, data_type="parts"
        )
        meta = result.get("meta") or {}
        return ScrapeResult(
            ok=True,
            source_name=meta.get("source") or result.get("source"),
            payload=result,
            from_cache=bool(meta.get("cache_hit")),
            stale=meta.get("health_status") == "stale",
        )
    except AllSourcesFailedException as exc:
        if cache_key in shared_cache:
            return ScrapeResult(
                ok=True,
                source_name=None,
                payload=shared_cache[cache_key],
                from_cache=True,
                stale=True,
                error=str(exc),
            )
        return ScrapeResult(
            ok=False,
            source_name=None,
            payload=None,
            from_cache=False,
            stale=True,
            error=str(exc),
        )


def run_quarterly_scrape(vehicle_seed: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Full OEM scrape pass for configured model years (stub-friendly)."""
    vehicles = vehicle_seed or [
        {"year": 2024, "make": "Ford", "model": "F-150", "vin": ""},
        {"year": 2024, "make": "Toyota", "model": "Camry", "vin": ""},
        {"year": 2024, "make": "Honda", "model": "Accord", "vin": ""},
    ]
    cache: dict[str, Any] = {}
    results = []
    for vehicle in vehicles:
        result = scrape_vehicle(vehicle, cache=cache)
        results.append(
            {
                "vehicle": vehicle,
                "ok": result.ok,
                "source": result.source_name,
                "from_cache": result.from_cache,
                "stale": result.stale,
                "error": result.error,
            }
        )
    return {"vehicles": len(vehicles), "results": results, "cache_entries": len(cache)}
