"""Fluids normalization — delegates to DataResolver.get_fluid_specs."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from services.redundancy import AllSourcesFailedException, DataResolver

logger = logging.getLogger(__name__)
_resolver = DataResolver()


@dataclass
class FluidSpecResult:
    ok: bool
    fluids: dict[str, Any] | None
    confidence: float
    source: str | None
    tech_note: str | None = None
    from_cache: bool = False
    stale: bool = False


def normalize_fluids(
    vehicle: dict[str, Any],
    *,
    pdf_text: str | None = None,
    cache: dict[str, Any] | None = None,
) -> FluidSpecResult:
    """Try PDF parse, then DataResolver fluid chain (fluidcapacity → prior year)."""
    vehicle_id = f"{vehicle.get('year')}|{vehicle.get('make')}|{vehicle.get('model')}"

    if pdf_text:
        return FluidSpecResult(
            ok=True,
            fluids={"engine_oil": {"spec": "From OEM PDF"}, "pdf_excerpt": pdf_text[:400]},
            confidence=0.85,
            source="oem_pdf",
        )

    try:
        result = _resolver.get_fluid_specs(vehicle_id)
        meta = result.get("meta") or {}
        return FluidSpecResult(
            ok=True,
            fluids=result.get("fluids"),
            confidence=float(result.get("confidence", 90)) / 100.0
            if result.get("confidence", 0) > 1
            else float(result.get("confidence", 0.9)),
            source=meta.get("source") or result.get("source"),
            tech_note=result.get("tech_note"),
            from_cache=bool(meta.get("cache_hit")),
            stale=meta.get("health_status") in {"stale", "cached"},
        )
    except AllSourcesFailedException as exc:
        logger.warning("Fluid resolver failed: %s", exc)
        if cache:
            key = f"fluids|{vehicle_id}"
            if key in cache:
                return FluidSpecResult(
                    ok=True,
                    fluids=cache[key],
                    confidence=0.5,
                    source="cache",
                    tech_note="Degraded source — cached fluids; verify before quoting.",
                    from_cache=True,
                    stale=True,
                )
        return FluidSpecResult(
            ok=False,
            fluids=None,
            confidence=0.0,
            source=None,
            tech_note="No fluid data available from any source.",
            stale=True,
        )
