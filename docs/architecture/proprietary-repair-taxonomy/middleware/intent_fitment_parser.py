"""
LLM Intent & Fitment Parsing Middleware
=======================================
Strict backend normalization node: unstructured technician notes → constrained JSON.

Contract:
  - Input: raw natural-language tech note + allow-listed operation keys from DB
  - Output: ONLY a JSON object matching IntentFitmentResult (no prose)
  - Pricing / hours / money must NEVER be inferred or returned here

Dependencies (standard client libraries):
  pip install openai pydantic python-dotenv

Environment:
  OPENAI_API_KEY   — required for live calls
  OPENAI_MODEL     — optional, default gpt-4o-2024-08-06 (structured outputs)
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, TYPE_CHECKING

from pydantic import BaseModel, Field, ValidationError, field_validator

if TYPE_CHECKING:
    from openai import OpenAI


# ---------------------------------------------------------------------------
# Structured output schema (application contract)
# ---------------------------------------------------------------------------

class VehicleParams(BaseModel):
    """Parsed vehicle identity — nulls when not stated."""

    year: int | None = Field(
        default=None,
        description="4-digit model year; expand 2-digit years (15 → 2015) using context.",
    )
    make: str | None = Field(default=None, description="Canonical make, e.g. Honda")
    model: str | None = Field(default=None, description="Canonical model, e.g. Accord")
    engine_configuration: str | None = Field(
        default=None,
        description='Engine string if present, e.g. "2.4L I4"',
    )
    trim: str | None = None
    drive_type: str | None = None

    @field_validator("year")
    @classmethod
    def year_plausible(cls, v: int | None) -> int | None:
        if v is None:
            return v
        if v < 100:  # defensive: model may still emit 2-digit
            v = 2000 + v if v < 50 else 1900 + v
        if not (1980 <= v <= 2100):
            raise ValueError(f"year out of range: {v}")
        return v


class IntentFitmentResult(BaseModel):
    """Strict JSON payload returned to the application layer."""

    vehicle: VehicleParams
    target_operation_keys: list[str] = Field(
        default_factory=list,
        description="Subset of the provided allow-list only.",
    )
    parts_variant_flags: list[str] = Field(
        default_factory=list,
        description=(
            "Dynamic fitment / sub-variant flags from notes "
            "(e.g. premium, ceramic, with_hardware, oem)."
        ),
    )
    position_hints: list[str] = Field(
        default_factory=list,
        description="Position codes if stated: FRONT, REAR, LH, RH, ALL.",
    )
    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Parser self-assessed confidence for downstream gating.",
    )
    unresolved_tokens: list[str] = Field(
        default_factory=list,
        description="Tokens that could not be mapped; never invent keys.",
    )


# OpenAI / JSON Schema response format (structured outputs)
INTENT_FITMENT_JSON_SCHEMA: dict[str, Any] = {
    "name": "intent_fitment_result",
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
                    "engine_configuration": {"type": ["string", "null"]},
                    "trim": {"type": ["string", "null"]},
                    "drive_type": {"type": ["string", "null"]},
                },
                "required": [
                    "year",
                    "make",
                    "model",
                    "engine_configuration",
                    "trim",
                    "drive_type",
                ],
            },
            "target_operation_keys": {
                "type": "array",
                "items": {"type": "string"},
            },
            "parts_variant_flags": {
                "type": "array",
                "items": {"type": "string"},
            },
            "position_hints": {
                "type": "array",
                "items": {"type": "string"},
            },
            "confidence": {"type": "number"},
            "unresolved_tokens": {
                "type": "array",
                "items": {"type": "string"},
            },
        },
        "required": [
            "vehicle",
            "target_operation_keys",
            "parts_variant_flags",
            "position_hints",
            "confidence",
            "unresolved_tokens",
        ],
    },
}

SYSTEM_PROMPT = """You are a strict automotive shop data normalization node.
Extract vehicle parameters, map repair intent to allow-listed operation keys only,
and capture parts sub-variant / fitment flags from technician notes.

Rules:
1. Output JSON matching the schema. No markdown. No conversational text.
2. target_operation_keys MUST be a subset of the provided allow-list. Never invent keys.
3. Expand colloquial years: "15 accord" → year 2015, make Honda, model Accord when clear.
4. Engine shorthand: "2.4" → "2.4L" (add I4/V6 only if stated or unambiguous in notes).
5. Variant flags: premium, economy, ceramic, semi_metallic, oem, aftermarket,
   with_hardware, with_sensors, coated, etc. Lowercase snake_case.
6. Position: FRONT / REAR / LH / RH / ALL when stated.
7. If unsure about an operation mapping, leave it out and add a short token to unresolved_tokens.
8. NEVER output prices, labor hours, rates, taxes, or invoice totals.
"""


def _normalize_allow_list(operation_keys: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for key in operation_keys:
        k = key.strip()
        if not k or k in seen:
            continue
        seen.add(k)
        out.append(k)
    return out


def _filter_to_allow_list(
    parsed: IntentFitmentResult, allow_list: list[str]
) -> IntentFitmentResult:
    """Hard gate: drop any model hallucination outside the DB allow-list."""
    allowed = set(allow_list)
    kept = [k for k in parsed.target_operation_keys if k in allowed]
    rejected = [k for k in parsed.target_operation_keys if k not in allowed]
    unresolved = list(dict.fromkeys([*parsed.unresolved_tokens, *rejected]))
    # Normalize variant flags
    flags = sorted(
        {
            re.sub(r"[^a-z0-9_]+", "_", f.strip().lower()).strip("_")
            for f in parsed.parts_variant_flags
            if f and f.strip()
        }
    )
    positions = sorted(
        {
            p.strip().upper()
            for p in parsed.position_hints
            if p and p.strip().upper() in {"FRONT", "REAR", "LH", "RH", "ALL"}
        }
    )
    return IntentFitmentResult(
        vehicle=parsed.vehicle,
        target_operation_keys=kept,
        parts_variant_flags=flags,
        position_hints=positions,
        confidence=parsed.confidence,
        unresolved_tokens=unresolved,
    )


def parse_technician_intent(
    raw_text: str,
    valid_operation_keys: list[str],
    *,
    client: Any | None = None,
    model: str | None = None,
) -> dict[str, Any]:
    """
    Normalize unstructured technician text into a clean intent/fitment JSON object.

    Parameters
    ----------
    raw_text:
        Free-form tech note, e.g.
        "swapped out front pads on a 15 accord 2.4 and check if he needs the premium variant"
    valid_operation_keys:
        Array of operation_key values from service_operations (billable leaves preferred).

    Returns
    -------
    dict
        JSON-serializable IntentFitmentResult. Never includes conversational filler.
    """
    # Lazy import so offline fixture / schema validation works without openai installed.
    from openai import OpenAI as _OpenAI

    text = (raw_text or "").strip()
    if not text:
        raise ValueError("raw_text must be non-empty")

    allow_list = _normalize_allow_list(valid_operation_keys)
    if not allow_list:
        raise ValueError("valid_operation_keys must contain at least one key")

    openai_client = client or _OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    model_name = model or os.environ.get("OPENAI_MODEL", "gpt-4o-2024-08-06")

    user_payload = {
        "technician_notes": text,
        "valid_operation_keys": allow_list,
        "instructions": (
            "Map notes onto valid_operation_keys only. "
            "Return structured fields for vehicle, operations, and variant flags."
        ),
    }

    response = openai_client.chat.completions.create(
        model=model_name,
        temperature=0,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": INTENT_FITMENT_JSON_SCHEMA,
        },
    )

    content = response.choices[0].message.content
    if not content:
        raise RuntimeError("LLM returned empty content")

    try:
        raw_obj = json.loads(content)
        parsed = IntentFitmentResult.model_validate(raw_obj)
    except (json.JSONDecodeError, ValidationError) as exc:
        raise RuntimeError(f"LLM output failed schema validation: {exc}") from exc

    gated = _filter_to_allow_list(parsed, allow_list)
    # Pure dict — no prose wrapper
    return gated.model_dump(mode="json")


# ---------------------------------------------------------------------------
# CLI smoke test (does not call network unless OPENAI_API_KEY is set)
# ---------------------------------------------------------------------------

def _demo_offline_fixture() -> dict[str, Any]:
    """Deterministic offline shape for unit tests / docs without API key."""
    fixture = IntentFitmentResult(
        vehicle=VehicleParams(
            year=2015,
            make="Honda",
            model="Accord",
            engine_configuration="2.4L",
            trim=None,
            drive_type=None,
        ),
        target_operation_keys=["BRAKES.FRONT.PADS.R_AND_R"],
        parts_variant_flags=["premium"],
        position_hints=["FRONT"],
        confidence=0.91,
        unresolved_tokens=[],
    )
    return fixture.model_dump(mode="json")


if __name__ == "__main__":
    sample_note = (
        "swapped out front pads on a 15 accord 2.4 and check if he needs the premium variant"
    )
    sample_keys = [
        "BRAKES.FRONT.PADS.R_AND_R",
        "BRAKES.FRONT.ROTORS.R_AND_R",
        "BRAKES.REAR.PADS.R_AND_R",
        "ENGINE.OIL.FILTER.REPLACE",
    ]

    if not os.environ.get("OPENAI_API_KEY"):
        # Offline demo — prints the contract shape only
        print(json.dumps(_demo_offline_fixture(), indent=2, sort_keys=True))
    else:
        result = parse_technician_intent(sample_note, sample_keys)
        print(json.dumps(result, indent=2, sort_keys=True))
