"""Redundancy layer — multi-source fallback, TTL cache, health tracking."""

from __future__ import annotations

import json
import logging
import os
import re
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable

import httpx

from config import load_settings
from db.connection import (
    fetch_active_sources,
    fetch_all_sources,
    fetch_source_by_name,
    insert_fallback_event,
    insert_source_health_log,
    record_source_attempt,
)
from fallback_engine import FallbackEngine
from oem_scraper.urls import build_url, probe_source

logger = logging.getLogger(__name__)

# Cache TTLs (seconds) — keyed by data type prefix
DEFAULT_CACHE_TTLS: dict[str, int] = {
    "parts": 86_400,
    "fluids": 43_200,
    "labor": 3_600,
    "vin": 604_800,
    "health": 300,
    "default": 3_600,
}


class AllSourcesFailedException(Exception):
    """Raised when every source in the fallback chain fails and no cache is available."""

    def __init__(self, message: str, *, attempts: list[dict[str, Any]] | None = None):
        super().__init__(message)
        self.attempts = attempts or []


@dataclass
class CacheEntry:
    data: Any
    stored_at: float

    @property
    def age_seconds(self) -> int:
        return int(time.time() - self.stored_at)


class TTLCache:
    """In-memory TTL cache with optional Redis passthrough."""

    def __init__(self) -> None:
        self._memory: dict[str, CacheEntry] = {}
        self._redis = None
        redis_url = os.getenv("REDIS_URL", "").strip()
        if redis_url:
            try:
                import redis  # type: ignore[import-untyped]

                self._redis = redis.from_url(redis_url, decode_responses=True)
            except Exception as exc:  # noqa: BLE001
                logger.warning("REDIS_URL set but redis unavailable: %s", exc)

    def get(self, key: str, ttl: int) -> tuple[Any | None, bool, int | None]:
        """Return (data, cache_hit, age_seconds)."""
        entry = self._memory.get(key)
        if entry and entry.age_seconds <= ttl:
            return entry.data, True, entry.age_seconds

        if self._redis:
            try:
                raw = self._redis.get(f"oem:{key}")
                if raw:
                    payload = json.loads(raw)
                    stored_at = payload.get("_stored_at", time.time())
                    age = int(time.time() - stored_at)
                    if age <= ttl:
                        return payload.get("data"), True, age
            except Exception as exc:  # noqa: BLE001
                logger.debug("Redis cache read failed: %s", exc)

        if entry:
            return entry.data, True, entry.age_seconds
        return None, False, None

    def set(self, key: str, data: Any) -> None:
        self._memory[key] = CacheEntry(data=data, stored_at=time.time())
        if self._redis:
            try:
                self._redis.setex(
                    f"oem:{key}",
                    DEFAULT_CACHE_TTLS["default"],
                    json.dumps({"data": data, "_stored_at": time.time()}),
                )
            except Exception as exc:  # noqa: BLE001
                logger.debug("Redis cache write failed: %s", exc)


_resolver_cache = TTLCache()


def _resolve_ttl(cache_key: str, cache_ttl: int | None) -> int:
    if cache_ttl is not None:
        return cache_ttl
    prefix = cache_key.split("|", 1)[0]
    return DEFAULT_CACHE_TTLS.get(prefix, DEFAULT_CACHE_TTLS["default"])


def _attach_cache_meta(data: Any, cache_hit: bool, age: int | None) -> dict[str, Any]:
    if isinstance(data, dict) and "data" in data and "meta" in data:
        meta = dict(data.get("meta") or {})
        meta["cache_hit"] = cache_hit
        meta["cache_age_seconds"] = age
        return {**data, "meta": meta}
    return {
        "data": data,
        "meta": {
            "cache_hit": cache_hit,
            "cache_age_seconds": age,
            "fallback_used": cache_hit,
            "health_status": "cached" if cache_hit else "live",
        },
    }


@dataclass
class DataResolver:
    """Ordered multi-source fetch with cache fallback and health telemetry."""

    cache: TTLCache = field(default_factory=lambda: _resolver_cache)

    def fetch_with_fallback(
        self,
        source_list: list[dict[str, Any]],
        cache_key: str,
        cache_ttl: int | None,
        fetch_fn: Callable[[dict[str, Any]], Any],
        *,
        data_type: str = "generic",
    ) -> dict[str, Any]:
        """Try sources in order; cache success; on total failure serve stale cache or raise."""
        ttl = _resolve_ttl(cache_key, cache_ttl)
        attempts: list[dict[str, Any]] = []
        primary_source = source_list[0]["sourceName"] if source_list else None
        started_chain = time.perf_counter()

        for idx, source in enumerate(source_list):
            source_name = source.get("sourceName", "unknown")
            attempt_start = time.perf_counter()
            try:
                result = fetch_fn(source)
                elapsed_ms = int((time.perf_counter() - attempt_start) * 1000)
                record_source_attempt(
                    source["id"],
                    success=True,
                    response_time_ms=elapsed_ms,
                    health_status="healthy",
                )
                insert_source_health_log(
                    source_id=source["id"],
                    status="healthy",
                    response_time_ms=elapsed_ms,
                )
                payload = result if isinstance(result, dict) else {"value": result}
                payload.setdefault("meta", {})
                payload["meta"].update(
                    {
                        "source": source_name,
                        "fallback_used": idx > 0,
                        "cache_hit": False,
                        "cache_age_seconds": None,
                        "health_status": "live",
                    }
                )
                self.cache.set(cache_key, payload)
                if idx > 0:
                    insert_fallback_event(
                        data_type=data_type,
                        primary_source=primary_source,
                        fallback_source=source_name,
                        success=True,
                        details={"cache_key": cache_key, "attempt": idx + 1},
                    )
                return payload
            except Exception as exc:  # noqa: BLE001
                elapsed_ms = int((time.perf_counter() - attempt_start) * 1000)
                msg = str(exc)
                attempts.append({"source": source_name, "error": msg})
                logger.warning("Source %s failed (%s): %s", source_name, data_type, msg)
                record_source_attempt(
                    source["id"],
                    success=False,
                    response_time_ms=elapsed_ms,
                    health_status="degraded",
                    error_message=msg,
                )
                insert_source_health_log(
                    source_id=source["id"],
                    status="degraded",
                    response_time_ms=elapsed_ms,
                    error_message=msg,
                )

        cached, hit, age = self.cache.get(cache_key, ttl)
        if cached is not None:
            insert_fallback_event(
                data_type=data_type,
                primary_source=primary_source,
                fallback_source="cache",
                success=True,
                details={
                    "cache_key": cache_key,
                    "cache_age_seconds": age,
                    "attempts": attempts,
                },
            )
            wrapped = _attach_cache_meta(cached, True, age)
            if isinstance(wrapped.get("meta"), dict):
                wrapped["meta"]["fallback_used"] = True
                wrapped["meta"]["health_status"] = "cached"
            return wrapped

        insert_fallback_event(
            data_type=data_type,
            primary_source=primary_source,
            fallback_source=None,
            success=False,
            details={"cache_key": cache_key, "attempts": attempts, "elapsed_ms": int((time.perf_counter() - started_chain) * 1000)},
        )
        raise AllSourcesFailedException(
            f"All sources failed for {data_type} ({cache_key})",
            attempts=attempts,
        )

    def get_vehicle_parts(self, vehicle_id: str, operation_id: str) -> dict[str, Any]:
        """Fetch parts catalog via ordered scraper sources."""
        vehicle = _vehicle_from_id(vehicle_id)
        cache_key = f"parts|{vehicle_id}|{operation_id}"
        sources = fetch_active_sources()

        def _fetch(source: dict[str, Any]) -> dict[str, Any]:
            ok, msg, _snippet = probe_source(source, vehicle)
            if not ok:
                raise RuntimeError(msg)
            url = build_url(source, "catalog", vehicle)
            with httpx.Client(timeout=30.0, follow_redirects=True) as client:
                resp = client.get(url, headers={"User-Agent": "ShopRally-OEM-Scraper/1.0"})
                if resp.status_code >= 400:
                    raise RuntimeError(f"HTTP {resp.status_code}")
                return {
                    "vehicle_id": vehicle_id,
                    "operation_id": operation_id,
                    "parts": [],
                    "raw_snippet": resp.text[:1000],
                    "url": url,
                }

        if not sources:
            stub = _stub_parts(vehicle_id, operation_id)
            self.cache.set(cache_key, stub)
            return stub

        try:
            return self.fetch_with_fallback(sources, cache_key, DEFAULT_CACHE_TTLS["parts"], _fetch, data_type="parts")
        except AllSourcesFailedException:
            stub = _stub_parts(vehicle_id, operation_id, stale=True)
            return _attach_cache_meta(stub, True, None)

    def get_fluid_specs(self, vehicle_id: str) -> dict[str, Any]:
        """PDF → fluidcapacity → prior model year (confidence 40)."""
        vehicle = _vehicle_from_id(vehicle_id)
        cache_key = f"fluids|{vehicle_id}"
        sources = [
            s
            for s in fetch_active_sources()
            if "fluid" in s["sourceName"].lower() or s["sourceName"] == "fluidcapacity"
        ] or fetch_active_sources()

        def _fetch_fluidcapacity(source: dict[str, Any]) -> dict[str, Any]:
            ok, msg, _ = probe_source(source, vehicle)
            if not ok:
                raise RuntimeError(msg)
            url = build_url(source, "fluids", vehicle)
            with httpx.Client(timeout=25.0, follow_redirects=True) as client:
                resp = client.get(url, headers={"User-Agent": "ShopRally-Fluids/1.0"})
                if resp.status_code >= 400:
                    raise RuntimeError(f"HTTP {resp.status_code}")
                return {
                    "vehicle_id": vehicle_id,
                    "fluids": {
                        "engine_oil": {"capacity_qt": None, "spec": "See source"},
                        "raw_snippet": resp.text[:800],
                    },
                    "confidence": 90,
                    "source": source["sourceName"],
                }

        try:
            return self.fetch_with_fallback(
                sources, cache_key, DEFAULT_CACHE_TTLS["fluids"], _fetch_fluidcapacity, data_type="fluids"
            )
        except AllSourcesFailedException:
            pass

        year = vehicle.get("year")
        if isinstance(year, int) and year > 1990:
            prior = year - 1
            note = (
                f"PDF + fluidcapacity unavailable — using {prior} model year fluids. "
                "Confirm capacity/spec with OEM documentation before service."
            )
            payload = {
                "vehicle_id": vehicle_id,
                "fluids": {
                    "engine_oil": {"capacity_qt": 5.0, "spec": f"Prior MY {prior} — verify capacity"},
                    "coolant": {"capacity_gal": 2.0},
                    "prior_model_year": prior,
                },
                "confidence": 40,
                "tech_note": note,
                "meta": {
                    "source": f"prior_year_{prior}",
                    "fallback_used": True,
                    "cache_hit": False,
                    "cache_age_seconds": None,
                    "health_status": "stale",
                },
            }
            insert_fallback_event(
                data_type="fluids",
                primary_source=sources[0]["sourceName"] if sources else None,
                fallback_source=f"prior_year_{prior}",
                success=True,
                details={"confidence": 40, "note": note},
            )
            return payload

        raise AllSourcesFailedException("No fluid data available")

    def get_labor_estimate(self, vehicle_id: str, operation_id: str) -> dict[str, Any]:
        """FallbackEngine → SQL avg → 1.0 hr default with warning."""
        cache_key = f"labor|{vehicle_id}|{operation_id}"
        cached, hit, age = self.cache.get(cache_key, DEFAULT_CACHE_TTLS["labor"])
        if hit and cached:
            return _attach_cache_meta(cached, True, age)

        engine = FallbackEngine()
        telemetry = engine.update_telemetry_batch(
            [{"vehicle_id": vehicle_id, "operation_id": operation_id}]
        )
        avg_hours = engine.lookup_average_hours(vehicle_id, operation_id)
        if avg_hours is not None:
            payload = {
                "vehicle_id": vehicle_id,
                "operation_id": operation_id,
                "hours": avg_hours,
                "source": "sql_average",
                "meta": {
                    "source": "sql_average",
                    "fallback_used": True,
                    "cache_hit": False,
                    "cache_age_seconds": None,
                    "health_status": "cached",
                },
            }
            insert_fallback_event(
                data_type="labor",
                primary_source="fallback_engine",
                fallback_source="sql_average",
                success=True,
                details={"hours": avg_hours, "telemetry": telemetry},
            )
            self.cache.set(cache_key, payload)
            return payload

        warning = "No labor guide match — defaulting to 1.0 hr; verify before quoting."
        payload = {
            "vehicle_id": vehicle_id,
            "operation_id": operation_id,
            "hours": 1.0,
            "warning": warning,
            "meta": {
                "source": "default_1hr",
                "fallback_used": True,
                "cache_hit": False,
                "cache_age_seconds": None,
                "health_status": "stale",
            },
        }
        insert_fallback_event(
            data_type="labor",
            primary_source="fallback_engine",
            fallback_source="default_1hr",
            success=True,
            details={"warning": warning},
        )
        self.cache.set(cache_key, payload)
        return payload

    def get_vin_decode(self, vin: str) -> dict[str, Any]:
        """NHTSA vPIC → commercial provider (if configured) → manual entry prompt."""
        cache_key = f"vin|{vin.upper()}"
        nhtsa = fetch_source_by_name("nhtsa_vpic")
        sources: list[dict[str, Any]] = []
        if nhtsa and nhtsa.get("status") == "active":
            sources.append(nhtsa)

        commercial_key = os.getenv("VIN_PROVIDER_API_KEY", "").strip()
        if commercial_key:
            commercial = fetch_source_by_name("commercial_vin") or {
                "id": "stub-commercial",
                "sourceName": "commercial_vin",
                "baseUrl": os.getenv("VIN_PROVIDER_BASE_URL", "https://api.vinaudit.com"),
                "endpoints": {"health": "/v1/decode", "catalog": "/v1/decode/{vin}"},
                "selectors": {},
                "status": "active",
            }
            sources.append(commercial)

        vehicle = {"vin": vin, "year": "", "make": "", "model": ""}

        def _decode(source: dict[str, Any]) -> dict[str, Any]:
            url = build_url(source, "catalog", vehicle)
            headers = {"User-Agent": "ShopRally-VIN/1.0"}
            if source.get("sourceName") == "commercial_vin" and commercial_key:
                headers["Authorization"] = f"Bearer {commercial_key}"
            with httpx.Client(timeout=20.0, follow_redirects=True) as client:
                resp = client.get(url, headers=headers)
                if resp.status_code >= 400:
                    raise RuntimeError(f"HTTP {resp.status_code}")
                data = resp.json() if "json" in resp.headers.get("content-type", "") else {"raw": resp.text[:500]}
                return {"vin": vin, "decoded": data, "provider": source["sourceName"]}

        if sources:
            try:
                return self.fetch_with_fallback(
                    sources, cache_key, DEFAULT_CACHE_TTLS["vin"], _decode, data_type="vin"
                )
            except AllSourcesFailedException:
                pass

        insert_fallback_event(
            data_type="vin",
            primary_source=sources[0]["sourceName"] if sources else "nhtsa_vpic",
            fallback_source="manual_entry",
            success=False,
            details={"vin": vin},
        )
        return {
            "vin": vin,
            "decoded": None,
            "prompt": "Enter year, make, model, and trim manually — automated VIN decode unavailable.",
            "meta": {
                "source": "manual_entry",
                "fallback_used": True,
                "cache_hit": False,
                "cache_age_seconds": None,
                "health_status": "stale",
            },
        }

    def parse_technician_note(self, text: str, valid_keys: list[str]) -> dict[str, Any]:
        """Primary LLM → secondary LLM → rule_based_parse."""
        from services.llm_parser import parse_with_llm, rule_based_parse

        for provider, label in (("primary", "llm_primary"), ("secondary", "llm_secondary")):
            try:
                parsed = parse_with_llm(text, valid_keys, provider=provider)
                if parsed:
                    return {
                        "fields": parsed,
                        "source": label,
                        "meta": {
                            "source": label,
                            "fallback_used": provider == "secondary",
                            "cache_hit": False,
                            "cache_age_seconds": None,
                            "health_status": "live",
                        },
                    }
            except Exception as exc:  # noqa: BLE001
                logger.warning("LLM parse (%s) failed: %s", provider, exc)

        fields = rule_based_parse(text, valid_keys)
        insert_fallback_event(
            data_type="technician_note",
            primary_source="llm_primary",
            fallback_source="rule_fallback",
            success=True,
            details={"matched_keys": list(fields.keys())},
        )
        return {
            "fields": fields,
            "source": "rule_fallback",
            "meta": {
                "source": "rule_fallback",
                "fallback_used": True,
                "cache_hit": False,
                "cache_age_seconds": None,
                "health_status": "cached",
            },
        }


def _vehicle_from_id(vehicle_id: str) -> dict[str, Any]:
    """Parse vehicle_id stub `year|make|model` or return probe defaults."""
    settings = load_settings()
    if "|" in vehicle_id:
        parts = vehicle_id.split("|")
        if len(parts) >= 3:
            try:
                return {
                    "year": int(parts[0]),
                    "make": parts[1],
                    "model": parts[2],
                    "vin": parts[3] if len(parts) > 3 else "",
                }
            except ValueError:
                pass
    return dict(settings.health_probe_vehicle)


def _stub_parts(vehicle_id: str, operation_id: str, *, stale: bool = False) -> dict[str, Any]:
    return {
        "vehicle_id": vehicle_id,
        "operation_id": operation_id,
        "parts": [{"name": "Stub part", "part_number": "STUB-001", "qty": 1}],
        "meta": {
            "source": "stub",
            "fallback_used": stale,
            "cache_hit": stale,
            "cache_age_seconds": None,
            "health_status": "stale" if stale else "live",
        },
    }


def get_system_health() -> dict[str, Any]:
    """Aggregate redundancy health for GET /system/health."""
    sources = fetch_all_sources()
    from db.connection import fetch_recent_fallback_events, fetch_source_health_summary

    return {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "sources": sources,
        "fallback_events": fetch_recent_fallback_events(25),
        "health_log_summary": fetch_source_health_summary(50),
        "redundancy": {
            "cache_backend": "redis" if os.getenv("REDIS_URL") else "memory",
            "ttl_seconds": DEFAULT_CACHE_TTLS,
        },
    }
