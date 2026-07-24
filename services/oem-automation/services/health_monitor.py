"""Health monitor — ping sources via DataResolver, consecutive failure degradation."""

from __future__ import annotations

import json
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from config import load_settings
from db.connection import (
    degrade_source_priority,
    fetch_all_sources,
    fetch_source_by_name,
    get_consecutive_health_outcomes,
    insert_health_alert,
    insert_source_health_log,
    record_source_attempt,
    restore_source_priority,
    update_source_health,
)
from oem_scraper.urls import build_url, probe_source
from services.redundancy import DataResolver

logger = logging.getLogger(__name__)
_resolver = DataResolver()


def _log_scraper_error(source: dict[str, Any], error: str, snippet: str) -> None:
    settings = load_settings()
    log_dir = Path(settings.log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / "scraper_errors.log"
    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "source": source.get("sourceName"),
        "error": error,
        "response_snippet": snippet[:500],
        "old_config": {
            "baseUrl": source.get("baseUrl"),
            "endpoints": source.get("endpoints"),
            "selectors": source.get("selectors"),
        },
    }
    with log_path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry) + os.linesep)


def _apply_consecutive_rules(source: dict[str, Any], ok: bool, error: str | None) -> None:
    """2 consecutive failures → degraded + priority 999; 2 consecutive passes → restore."""
    outcomes = get_consecutive_health_outcomes(source["id"], limit=2)
    if not ok:
        if len(outcomes) >= 2 and not outcomes[0] and not outcomes[1]:
            priority = int(source.get("priority") or 10)
            degrade_source_priority(source["id"], original_priority=priority)
            insert_health_alert(
                source_id=source["id"],
                source_name=source["sourceName"],
                severity="warning",
                message=f"Source demoted after 2 consecutive failures: {error}",
                detail={"priority": 999, "original_priority": priority},
            )
        return

    if len(outcomes) >= 2 and outcomes[0] and outcomes[1]:
        if source.get("status") == "degraded" or source.get("priority") == 999:
            restore_source_priority(source["id"])


def check_source(source: dict[str, Any], vehicle: dict[str, Any]) -> dict[str, Any]:
    url = build_url(source, "health", vehicle)
    selectors = source.get("selectors") or {}
    if isinstance(selectors, str):
        selectors = json.loads(selectors)
    marker = selectors.get("health_marker") or selectors.get("result_marker")
    snippet = ""

    started = time.perf_counter()
    try:
        ok, msg, snippet = probe_source(source, vehicle)
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        if not ok:
            raise RuntimeError(msg)

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
        update_source_health(source["id"], status="active", last_error=None, mark_healthy=True)
        _apply_consecutive_rules(source, True, None)
        return {"ok": True, "source": source["sourceName"], "url": url, "response_time_ms": elapsed_ms}
    except Exception as exc:  # noqa: BLE001
        msg = str(exc)
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        _log_scraper_error(source, msg, snippet)
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
        update_source_health(source["id"], status="degraded", last_error=msg, mark_healthy=False)
        _apply_consecutive_rules(source, False, msg)
        insert_health_alert(
            source_id=source["id"],
            source_name=source["sourceName"],
            severity="warning",
            message=f"Health check failed: {msg}",
            detail={"url": url, "marker": marker},
        )
        return {"ok": False, "source": source["sourceName"], "error": msg, "url": url}


def run_health_checks(vehicle: dict[str, Any] | None = None) -> dict[str, Any]:
    settings = load_settings()
    probe = vehicle or settings.health_probe_vehicle
    sources = [s for s in fetch_all_sources() if s.get("status") != "disabled"]
    results = [check_source(source, probe) for source in sources]

    # DataResolver integration smoke — parts + fluids (stub-friendly)
    vehicle_id = f"{probe.get('year')}|{probe.get('make')}|{probe.get('model')}"
    resolver_checks: dict[str, Any] = {}
    try:
        resolver_checks["parts"] = _resolver.get_vehicle_parts(vehicle_id, "health_probe")
    except Exception as exc:  # noqa: BLE001
        resolver_checks["parts"] = {"error": str(exc)}
    try:
        resolver_checks["fluids"] = _resolver.get_fluid_specs(vehicle_id)
    except Exception as exc:  # noqa: BLE001
        resolver_checks["fluids"] = {"error": str(exc)}

    ok_count = sum(1 for r in results if r.get("ok"))
    return {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "probe_vehicle": probe,
        "sources_checked": len(results),
        "healthy": ok_count,
        "degraded": len(results) - ok_count,
        "results": results,
        "resolver_smoke": resolver_checks,
    }


def build_repair_prompt(source_name: str, sample_response: str | None = None) -> dict[str, Any]:
    source = fetch_source_by_name(source_name)
    if not source:
        return {"error": f"Unknown source: {source_name}"}

    selectors = source.get("selectors") or {}
    endpoints = source.get("endpoints") or {}
    last_error = source.get("lastError") or "No recorded error"

    prompt = f"""# ShopRally OEM source repair — {source_name}

## Context
An automated health check failed for scraper source `{source_name}`.
Update the Postgres `ScraperSource` row AND adjust spider/pipeline code if selectors changed.

## Broken config (current DB)
```json
{json.dumps({"baseUrl": source.get("baseUrl"), "endpoints": endpoints, "selectors": selectors}, indent=2)}
```

## Last error
{last_error}

## Sample response (truncated)
```
{(sample_response or "No sample provided — re-run health check or paste HTML/JSON from browser.")[:2000]}
```

## Tasks
1. Inspect the sample response and identify new DOM/JSON paths.
2. Emit SQL UPDATE for `"ScraperSource"` WHERE `"sourceName" = '{source_name}'`:
   - Fix `endpoints` JSON (health + catalog/fluids paths)
   - Fix `selectors` JSON (`health_marker`, `result_marker`, etc.)
   - Set `status = 'active'` after verification
3. Update `services/oem-automation/oem_scraper/pipeline.py` or `fluid_harvest/fluid_normalizer.py` if parsing logic changed.
4. Re-run: `python -m services.health_monitor` or platform UI **Run health check**.

## SQL template
```sql
UPDATE "ScraperSource"
SET endpoints = '{{...}}'::jsonb,
    selectors = '{{...}}'::jsonb,
    status = 'active',
    "lastError" = NULL,
    "updatedAt" = NOW()
WHERE "sourceName" = '{source_name}';
```
"""
    return {
        "source_name": source_name,
        "prompt": prompt,
        "config": {"baseUrl": source.get("baseUrl"), "endpoints": endpoints, "selectors": selectors},
        "last_error": last_error,
    }
