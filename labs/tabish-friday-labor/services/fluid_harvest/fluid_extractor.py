"""
PDF → fluid capacities extractor
================================
PyPDF2 text extract + OpenAI/DeepSeek-compatible structured JSON.
Offline/fixture path uses companion .txt or regex heuristics (no API key).
"""

from __future__ import annotations

import json
import logging
import re
import time
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field, ValidationError, field_validator

from config.settings import settings
from services.fluid_harvest.categories import CATEGORY_KEYS, map_label_to_category_key

logger = logging.getLogger("tfl.fluids.extractor")

FLUID_EXTRACT_SCHEMA: dict[str, Any] = {
    "name": "vehicle_fluid_specs_extract",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "vehicle": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "year": {"type": ["integer", "null"]},
                    "make": {"type": ["string", "null"]},
                    "model": {"type": ["string", "null"]},
                    "engine": {"type": ["string", "null"]},
                },
                "required": ["year", "make", "model", "engine"],
            },
            "fluids": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "category_key": {
                            "type": "string",
                            "enum": sorted(CATEGORY_KEYS),
                        },
                        "capacity": {"type": "number"},
                        "capacity_unit": {"type": "string"},
                        "fluid_type": {"type": ["string", "null"]},
                        "alternative_types": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "notes": {"type": ["string", "null"]},
                    },
                    "required": [
                        "category_key",
                        "capacity",
                        "capacity_unit",
                        "fluid_type",
                        "alternative_types",
                        "notes",
                    ],
                },
            },
            "source_section": {"type": ["string", "null"]},
        },
        "required": ["vehicle", "fluids", "source_section"],
    },
}

SYSTEM_PROMPT = """You are a strict automotive fluid-capacity extraction node.
Read owner's-manual text (Capacities / Specifications / Fluids sections only)
and extract every fluid capacity and type.

Rules:
1. Capacities MUST be in US quarts (qt). Convert liters → quarts (1 L ≈ 1.05669 qt).
2. category_key MUST be one of: ENG_OIL, ATF, BRAKE_FLUID, COOLANT, PS_FLUID,
   DIFF_FLUID, TC_FLUID, WASHER.
3. Prefer fill / refill capacities used for service, not dry-fill unless noted.
4. Capture OEM fluid type (e.g. 0W-20, ATF DW-1, DOT 3, Toyota Long Life Coolant).
5. Output JSON matching the schema only — no markdown.
6. Never invent capacities. Omit unclear rows.
"""


class FluidSpecOut(BaseModel):
    category_key: str
    capacity: float
    capacity_unit: str = "qt"
    fluid_type: str | None = None
    alternative_types: list[str] = Field(default_factory=list)
    notes: str | None = None

    @field_validator("category_key")
    @classmethod
    def valid_key(cls, v: str) -> str:
        if v not in CATEGORY_KEYS:
            raise ValueError(f"unknown category_key: {v}")
        return v

    @field_validator("capacity")
    @classmethod
    def positive_cap(cls, v: float) -> float:
        if v < 0:
            raise ValueError("capacity must be >= 0")
        return round(float(v), 2)

    @field_validator("capacity_unit")
    @classmethod
    def unit_qt(cls, v: str) -> str:
        u = (v or "qt").lower().strip()
        if u in ("l", "liter", "liters", "litre", "litres"):
            return "qt"  # caller should convert; keep unit label qt after convert
        return "qt" if u in ("qt", "quart", "quarts") else u


class FluidExtractResult(BaseModel):
    vehicle: dict[str, Any]
    fluids: list[FluidSpecOut] = Field(default_factory=list)
    source_section: str | None = None


def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract all text via PyPDF2; fall back to sibling .txt fixture."""
    txt_sidecar = pdf_path.with_suffix(".txt")
    if txt_sidecar.exists():
        return txt_sidecar.read_text(encoding="utf-8", errors="ignore")

    # Fixture manuals directory
    fixture_txt = settings.fixtures_dir / "manuals" / (pdf_path.stem + ".txt")
    if fixture_txt.exists():
        return fixture_txt.read_text(encoding="utf-8", errors="ignore")

    try:
        from PyPDF2 import PdfReader
    except ImportError as exc:
        raise RuntimeError(
            "PyPDF2 is required for PDF extraction. pip install -r requirements.txt"
        ) from exc

    reader = PdfReader(str(pdf_path))
    chunks: list[str] = []
    for page in reader.pages:
        try:
            chunks.append(page.extract_text() or "")
        except Exception as exc:  # noqa: BLE001
            logger.warning("page extract failed: %s", exc)
    return "\n".join(chunks)


def _liters_to_quarts(value: float) -> float:
    return round(value * 1.05669, 2)


def _offline_regex_extract(
    text: str,
    vehicle_year_make_model: str,
) -> FluidExtractResult:
    """Heuristic offline extractor for fixture manuals (no LLM)."""
    fluids: list[FluidSpecOut] = []
    # Patterns like: Engine oil .... 4.4 qt  0W-20
    line_re = re.compile(
        r"(?P<label>[A-Za-z][A-Za-z0-9 ./()\-]{2,60}?)\s*[.\-–—:·\s]{2,}\s*"
        r"(?P<cap>\d+(?:\.\d+)?)\s*(?P<unit>qt|quarts?|L|liters?|litres?)\b"
        r"(?:\s+[—\-:]?\s*(?P<ftype>[A-Za-z0-9.\- /]{2,40}))?",
        re.I,
    )
    scored: list[tuple[int, FluidSpecOut]] = []
    for m in line_re.finditer(text):
        label = m.group("label").strip()
        key = map_label_to_category_key(label)
        if not key:
            continue
        cap = float(m.group("cap"))
        unit = m.group("unit").lower()
        if unit.startswith("l"):
            cap = _liters_to_quarts(cap)
        ftype = (m.group("ftype") or "").strip() or None
        if ftype and len(ftype) > 60:
            ftype = ftype[:60]
        label_l = label.lower()
        score = 0
        if "with filter" in label_l or "including filter" in label_l:
            score += 2
        if "without filter" in label_l or "w/o filter" in label_l:
            score -= 2
        scored.append(
            (
                score,
                FluidSpecOut(
                    category_key=key,
                    capacity=cap,
                    capacity_unit="qt",
                    fluid_type=ftype,
                    alternative_types=[],
                    notes=f"offline regex extract ({label})",
                ),
            )
        )

    # Deduplicate by category keeping highest score (service fill preferred)
    by_key: dict[str, tuple[int, FluidSpecOut]] = {}
    for score, f in scored:
        prev = by_key.get(f.category_key)
        if prev is None or score > prev[0]:
            by_key[f.category_key] = (score, f)
    uniq = [pair[1] for pair in by_key.values()]

    parts = vehicle_year_make_model.strip().split()
    year = int(parts[0]) if parts and parts[0].isdigit() else None
    make = parts[1] if len(parts) > 1 else None
    model = " ".join(parts[2:]) if len(parts) > 2 else None
    return FluidExtractResult(
        vehicle={"year": year, "make": make, "model": model, "engine": None},
        fluids=uniq,
        source_section="Capacities (offline)",
    )


def _call_llm(text: str, vehicle_year_make_model: str, *, attempt: int) -> dict[str, Any]:
    from openai import OpenAI

    kwargs: dict[str, Any] = {"api_key": settings.openai_api_key}
    base = os_base_url()
    if base:
        kwargs["base_url"] = base
    client = OpenAI(**kwargs)
    # Truncate huge manuals — keep capacities-ish windows
    clipped = text
    if len(clipped) > 24_000:
        # Prefer sections mentioning capacities
        lower = clipped.lower()
        idx = lower.find("capacit")
        if idx < 0:
            idx = lower.find("specif")
        start = max(0, idx - 500) if idx >= 0 else 0
        clipped = clipped[start : start + 24_000]

    user = (
        f"Vehicle: {vehicle_year_make_model}\n\n"
        f"Owner's manual text:\n---\n{clipped}\n---\n"
        "Extract fluid capacities (quarts) and types from Capacities/Specifications."
    )
    resp = client.chat.completions.create(
        model=settings.openai_model,
        temperature=0,
        response_format={
            "type": "json_schema",
            "json_schema": FLUID_EXTRACT_SCHEMA,
        },
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user},
        ],
    )
    content = resp.choices[0].message.content or "{}"
    logger.info("LLM fluid extract attempt=%s chars=%s", attempt, len(content))
    return json.loads(content)


def os_base_url() -> str | None:
    import os

    return os.getenv("OPENAI_BASE_URL") or os.getenv("DEEPSEEK_BASE_URL") or None


def extract_fluids_from_pdf(
    pdf_path: str | Path,
    vehicle_year_make_model: str,
    *,
    max_retries: int = 3,
) -> dict[str, Any]:
    """
    Extract fluid specs from a PDF path.

    Returns JSON matching vehicle_fluid_specs-shaped rows under ``fluids``.
    """
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(path)

    text = extract_text_from_pdf(path)
    if not text.strip():
        raise ValueError(f"No text extracted from {path}")

    if not settings.openai_api_key or settings.scraper_mode != "live":
        result = _offline_regex_extract(text, vehicle_year_make_model)
        return {
            **result.model_dump(),
            "source": "oem_manual_offline",
            "pdf_path": str(path),
        }

    last_err: Exception | None = None
    for attempt in range(1, max_retries + 1):
        try:
            raw = _call_llm(text, vehicle_year_make_model, attempt=attempt)
            # Convert liters if model forgot
            for row in raw.get("fluids", []):
                unit = str(row.get("capacity_unit", "qt")).lower()
                if unit.startswith("l"):
                    row["capacity"] = _liters_to_quarts(float(row["capacity"]))
                    row["capacity_unit"] = "qt"
            parsed = FluidExtractResult.model_validate(raw)
            return {
                **parsed.model_dump(),
                "source": "oem_manual_llm",
                "pdf_path": str(path),
            }
        except (ValidationError, json.JSONDecodeError, Exception) as exc:  # noqa: BLE001
            last_err = exc
            logger.warning("extract retry %s failed: %s", attempt, exc)
            time.sleep(0.4 * attempt)

    # Final fallback — offline heuristics on the same text
    logger.error("LLM extract failed after retries: %s — using offline", last_err)
    result = _offline_regex_extract(text, vehicle_year_make_model)
    return {
        **result.model_dump(),
        "source": "oem_manual_offline_fallback",
        "pdf_path": str(path),
        "error": str(last_err) if last_err else None,
    }
