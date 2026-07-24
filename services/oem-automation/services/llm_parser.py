"""LLM + rule-based technician note parsing with fallback chain."""

from __future__ import annotations

import os
import re
from typing import Any


def parse_with_llm(text: str, valid_keys: list[str], *, provider: str = "primary") -> dict[str, Any] | None:
    """Call configured LLM provider. Returns None when unavailable (stub-friendly)."""
    api_key = os.getenv(
        "GEMINI_API_KEY" if provider == "primary" else "GEMINI_API_KEY_SECONDARY",
        os.getenv("GEMINI_API_KEY", ""),
    ).strip()
    if not api_key:
        return None

    # Scaffold: real integration would call Gemini/OpenAI here.
    # Offline/demo: return None so rule_based_parse runs.
    _ = text, valid_keys, provider
    return None


def rule_based_parse(text: str, valid_keys: list[str]) -> dict[str, Any]:
    """Keyword rules for common shop phrases — always available offline."""
    lowered = text.lower()
    out: dict[str, Any] = {}

    rules: list[tuple[str, str, Any]] = [
        ("front pads", r"front\s+(?:brake\s+)?pads?", "front_brake_pads"),
        ("rear pads", r"rear\s+(?:brake\s+)?pads?", "rear_brake_pads"),
        ("oil change", r"oil\s+change|lube\s+oil\s+filter|lof\b", "oil_change"),
        ("spark plugs", r"spark\s+plugs?", "spark_plugs"),
        ("trans fluid", r"trans(?:mission)?\s+fluid|atf", "transmission_fluid"),
        ("coolant flush", r"coolant\s+flush|radiator\s+flush", "coolant_flush"),
        ("brake fluid", r"brake\s+fluid", "brake_fluid"),
        ("battery", r"\bbattery\b", "battery"),
        ("alignment", r"alignment|align\b", "alignment"),
        ("tire rotation", r"tire\s+rotat", "tire_rotation"),
    ]

    for _label, pattern, key in rules:
        if key not in valid_keys:
            continue
        if re.search(pattern, lowered):
            out[key] = True

    if "concern" in valid_keys and len(lowered.strip()) > 10:
        out["concern"] = text.strip()[:500]

    return out
