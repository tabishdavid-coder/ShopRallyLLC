"""
LLM Intent & Fitment Parsing Middleware
=======================================
Stateless normalization node: technician natural language → constrained JSON.

INVARIANT: never returns hours, rates, taxes, or invoice money.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, TYPE_CHECKING

from pydantic import BaseModel, Field, ValidationError, field_validator

if TYPE_CHECKING:
    from openai import OpenAI

INTENT_JSON_SCHEMA: dict[str, Any] = {
    "name": "technician_intent_fitment",
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
            "operations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "operation_key": {"type": "string"},
                        "quantity": {"type": "number"},
                    },
                    "required": ["operation_key", "quantity"],
                },
            },
            "parts_flags": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "variant": {"type": ["string", "null"]},
                    "notes": {"type": ["string", "null"]},
                },
                "required": ["variant", "notes"],
            },
        },
        "required": ["vehicle", "operations", "parts_flags"],
    },
}

SYSTEM_PROMPT = """You are a strict automotive data normalization node for Tabish Friday Labor.
Extract vehicle identity, map repair intent onto allow-listed operation keys only,
and capture parts variant flags from technician notes.

Rules:
1. Output JSON matching the schema only — no markdown, no prose.
2. operations[].operation_key MUST be a subset of the provided allow-list.
3. Expand colloquial years: "15 accord" → 2015 Honda Accord when clear.
4. Never invent operation keys. If unsure, omit and leave notes.
5. NEVER output prices, labor hours, rates, taxes, or totals.
"""


class VehicleOut(BaseModel):
    year: int | None = None
    make: str | None = None
    model: str | None = None
    engine: str | None = None

    @field_validator("year")
    @classmethod
    def normalize_year(cls, v: int | None) -> int | None:
        if v is None:
            return v
        if v < 100:
            v = 2000 + v if v < 50 else 1900 + v
        if not (1980 <= v <= 2100):
            raise ValueError(f"year out of range: {v}")
        return v


class OperationOut(BaseModel):
    operation_key: str
    quantity: float = 1.0


class PartsFlagsOut(BaseModel):
    variant: str | None = None
    notes: str | None = None


class IntentResult(BaseModel):
    vehicle: VehicleOut
    operations: list[OperationOut] = Field(default_factory=list)
    parts_flags: PartsFlagsOut = Field(default_factory=PartsFlagsOut)


def _gate_operations(parsed: IntentResult, allow_list: list[str]) -> IntentResult:
    allowed = set(allow_list)
    kept: list[OperationOut] = []
    rejected: list[str] = []
    for op in parsed.operations:
        key = op.operation_key.strip()
        if key in allowed:
            kept.append(OperationOut(operation_key=key, quantity=max(op.quantity, 0.01)))
        else:
            rejected.append(key)
    notes = parsed.parts_flags.notes or ""
    if rejected:
        extra = "rejected_keys=" + ",".join(rejected)
        notes = f"{notes}; {extra}".strip("; ").strip()
    variant = parsed.parts_flags.variant
    if variant:
        variant = re.sub(r"[^a-z0-9_]+", "_", variant.strip().lower()).strip("_") or None
    return IntentResult(
        vehicle=parsed.vehicle,
        operations=kept,
        parts_flags=PartsFlagsOut(variant=variant, notes=notes or None),
    )


def parse_technician_intent(
    raw_text: str,
    valid_operation_keys: list[str],
    *,
    client: OpenAI | None = None,
    model: str | None = None,
) -> dict[str, Any]:
    """
    Normalize unstructured technician text into a clean intent/fitment dict.

    Parameters
    ----------
    raw_text:
        Free-form tech note.
    valid_operation_keys:
        Allow-listed operation_code values from service_operations.

    Returns
    -------
    dict
        {vehicle, operations, parts_flags} — never includes pricing fields.
    """
    text = (raw_text or "").strip()
    if not text:
        raise ValueError("raw_text must be non-empty")
    allow = [k.strip() for k in valid_operation_keys if k and k.strip()]
    if not allow:
        raise ValueError("valid_operation_keys must contain at least one key")

    from openai import OpenAI as _OpenAI

    api_key = os.environ.get("OPENAI_API_KEY")
    openai_client = client or _OpenAI(api_key=api_key)
    model_name = model or os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

    user_payload = {
        "technician_notes": text,
        "valid_operation_keys": allow,
    }

    try:
        response = openai_client.chat.completions.create(
            model=model_name,
            temperature=0,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": INTENT_JSON_SCHEMA,
            },
        )
    except Exception as exc:  # noqa: BLE001 — surface provider errors cleanly
        raise RuntimeError(f"LLM provider call failed: {exc}") from exc

    content = response.choices[0].message.content
    if not content:
        raise RuntimeError("LLM returned empty content")

    try:
        parsed = IntentResult.model_validate(json.loads(content))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise RuntimeError(f"LLM output failed schema validation: {exc}") from exc

    gated = _gate_operations(parsed, allow)
    return gated.model_dump(mode="json")


def parse_technician_intent_offline_demo(raw_text: str, valid_operation_keys: list[str]) -> dict[str, Any]:
    """Deterministic offline stand-in when OPENAI_API_KEY is unset (lab/demo)."""
    text = raw_text.lower()
    year = 2015 if "15" in text or "2015" in text else 2014 if "2014" in text else None
    make = "Honda" if "accord" in text or "honda" in text else ("Toyota" if "camry" in text or "toyota" in text else None)
    model = "Accord" if "accord" in text else ("Camry" if "camry" in text else None)
    engine = "3.5L V6" if "v6" in text or "3.5" in text else ("2.4L" if "2.4" in text else None)

    ops: list[OperationOut] = []
    for key in valid_operation_keys:
        kl = key.lower()
        if "pads" in text and "pad" in kl and "front" in text and "front" in kl:
            ops.append(OperationOut(operation_key=key, quantity=1))
        elif "rotor" in text and "rotor" in kl:
            ops.append(OperationOut(operation_key=key, quantity=1))
        elif ("oil" in text or "filter" in text) and "oil" in kl:
            ops.append(OperationOut(operation_key=key, quantity=1))

    variant = "premium" if "premium" in text else ("ceramic" if "ceramic" in text else None)
    result = IntentResult(
        vehicle=VehicleOut(year=year, make=make, model=model, engine=engine),
        operations=ops,
        parts_flags=PartsFlagsOut(variant=variant, notes="offline_demo_parser"),
    )
    return _gate_operations(result, valid_operation_keys).model_dump(mode="json")


# ---------------------------------------------------------------------------
# Technician note → repair procedure extraction
# ---------------------------------------------------------------------------

PROCEDURE_FROM_NOTE_SCHEMA: dict[str, Any] = {
    "name": "tech_note_procedure",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "is_procedure": {"type": "boolean"},
            "title": {"type": ["string", "null"]},
            "operation_hint": {"type": ["string", "null"]},
            "steps": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "step_number": {"type": "integer"},
                        "instruction": {"type": "string"},
                        "torque_spec": {"type": ["string", "null"]},
                        "tool": {"type": ["string", "null"]},
                        "image_url": {"type": ["string", "null"]},
                    },
                    "required": [
                        "step_number",
                        "instruction",
                        "torque_spec",
                        "tool",
                        "image_url",
                    ],
                },
            },
            "confidence": {"type": "number"},
        },
        "required": ["is_procedure", "title", "operation_hint", "steps", "confidence"],
    },
}

PROCEDURE_NOTE_SYSTEM = """You identify whether a technician note contains a step-by-step
repair procedure. If yes, extract ordered steps with optional torque_spec and tool.
If the note is only a brief intent (e.g. "front pads on 15 accord"), set is_procedure=false
and steps=[]. Never invent prices or labor hours. JSON only.
"""


class ProcedureStepOut(BaseModel):
    step_number: int
    instruction: str
    torque_spec: str | None = None
    tool: str | None = None
    image_url: str | None = None


class ProcedureFromNoteOut(BaseModel):
    is_procedure: bool = False
    title: str | None = None
    operation_hint: str | None = None
    steps: list[ProcedureStepOut] = Field(default_factory=list)
    confidence: float = 0.0


def extract_procedure_from_note_offline(raw_text: str) -> dict[str, Any]:
    """
    Deterministic detector for numbered / step-wise tech notes (no LLM).
    Returns structured procedure JSON matching the LLM schema.
    """
    text = (raw_text or "").strip()
    if not text:
        return ProcedureFromNoteOut(is_procedure=False, confidence=0.0).model_dump(mode="json")

    steps: list[ProcedureStepOut] = []
    torque_re = re.compile(r"(\d+(?:\.\d+)?\s*(?:ft-?lbs?|N[·.]?m|nm))", re.I)
    for ln in text.splitlines():
        ln = ln.strip()
        m = re.match(r"^(?:step\s*)?(\d+)[.)]\s*(.+)$", ln, flags=re.I)
        if not m:
            continue
        instruction = m.group(2).strip()
        tm = torque_re.search(instruction)
        steps.append(
            ProcedureStepOut(
                step_number=int(m.group(1)),
                instruction=instruction,
                torque_spec=tm.group(1) if tm else None,
            )
        )

    # Also accept "then / next / finally" prose with ≥3 action sentences
    if len(steps) < 2:
        sentences = re.split(r"(?<=[.!;])\s+", text)
        actionish = [
            s.strip()
            for s in sentences
            if re.search(
                r"\b(remove|install|torque|loosen|raise|compress|reinstall|bleed|replace)\b",
                s,
                re.I,
            )
            and len(s.strip()) > 20
        ]
        if len(actionish) >= 3:
            steps = [
                ProcedureStepOut(step_number=i + 1, instruction=s)
                for i, s in enumerate(actionish[:12])
            ]

    is_proc = len(steps) >= 2
    title = None
    hint = None
    low = text.lower()
    if "pad" in low:
        hint = "BRAKES.FRONT.PADS.R_AND_R"
        title = "Tech procedure — front brake pads"
    elif "rotor" in low:
        hint = "BRAKES.FRONT.ROTORS.R_AND_R"
        title = "Tech procedure — rotors"
    elif is_proc:
        title = "Tech-contributed procedure"

    return ProcedureFromNoteOut(
        is_procedure=is_proc,
        title=title,
        operation_hint=hint,
        steps=steps if is_proc else [],
        confidence=0.85 if is_proc else 0.1,
    ).model_dump(mode="json")


def extract_procedure_from_note(
    raw_text: str,
    *,
    client: OpenAI | None = None,
    model: str | None = None,
) -> dict[str, Any]:
    """
    Use the LLM to identify if a tech note contains a step-by-step description.

    Returns
    -------
    dict
        {
          is_procedure, title, operation_hint,
          steps: [{step_number, instruction, torque_spec, tool, image_url}],
          confidence
        }

    Persist with source='tech_contribution' (typically is_approved=false until review).
    """
    text = (raw_text or "").strip()
    if not text:
        raise ValueError("raw_text must be non-empty")

    if not os.environ.get("OPENAI_API_KEY") and client is None:
        return extract_procedure_from_note_offline(text)

    from openai import OpenAI as _OpenAI

    openai_client = client or _OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    model_name = model or os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

    try:
        response = openai_client.chat.completions.create(
            model=model_name,
            temperature=0,
            messages=[
                {"role": "system", "content": PROCEDURE_NOTE_SYSTEM},
                {"role": "user", "content": text[:8000]},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": PROCEDURE_FROM_NOTE_SCHEMA,
            },
        )
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"LLM procedure extract failed: {exc}") from exc

    content = response.choices[0].message.content
    if not content:
        raise RuntimeError("LLM returned empty procedure content")

    try:
        parsed = ProcedureFromNoteOut.model_validate(json.loads(content))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise RuntimeError(f"Procedure extract failed schema validation: {exc}") from exc

    return parsed.model_dump(mode="json")


if __name__ == "__main__":
    sample = "swapped front pads on a 15 accord 2.4 — customer wants premium"
    keys = [
        "BRAKES.FRONT.PADS.R_AND_R",
        "BRAKES.FRONT.ROTORS.R_AND_R",
        "ENGINE.OIL.FILTER.REPLACE",
    ]
    if os.environ.get("OPENAI_API_KEY"):
        out = parse_technician_intent(sample, keys)
    else:
        out = parse_technician_intent_offline_demo(sample, keys)
    print(json.dumps(out, indent=2))
    note = (
        "1. Raise vehicle and remove wheels.\n"
        "2. Remove caliper bolts and hang caliper.\n"
        "3. Install pads; torque guide pins to 25 ft-lbs.\n"
        "4. Reinstall wheels and torque to 80 ft-lbs."
    )
    print(json.dumps(extract_procedure_from_note(note), indent=2))
