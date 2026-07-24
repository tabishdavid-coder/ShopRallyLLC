"""Canonical fluid category keys and label mapping helpers."""

from __future__ import annotations

import re

FLUID_CATEGORIES: list[tuple[str, str]] = [
    ("ENG_OIL", "Engine Oil"),
    ("ATF", "Transmission Fluid"),
    ("BRAKE_FLUID", "Brake Fluid"),
    ("COOLANT", "Coolant"),
    ("PS_FLUID", "Power Steering Fluid"),
    ("DIFF_FLUID", "Differential Fluid"),
    ("TC_FLUID", "Transfer Case Fluid"),
    ("WASHER", "Washer Fluid"),
]

CATEGORY_KEYS = {key for key, _ in FLUID_CATEGORIES}

# fluidcapacity.com / OEM free-text labels → our keys
_LABEL_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"engine\s*oil|motor\s*oil|crankcase", re.I), "ENG_OIL"),
    (re.compile(r"automatic\s*trans|atf|cvt\s*fluid|transmission", re.I), "ATF"),
    (re.compile(r"manual\s*trans|gearbox\s*oil", re.I), "ATF"),
    (re.compile(r"brake\s*fluid", re.I), "BRAKE_FLUID"),
    (re.compile(r"coolant|antifreeze|engine\s*coolant", re.I), "COOLANT"),
    (re.compile(r"power\s*steer", re.I), "PS_FLUID"),
    (re.compile(r"transfer\s*case", re.I), "TC_FLUID"),
    (re.compile(r"diff|axle\s*oil|rear\s*axle|front\s*axle", re.I), "DIFF_FLUID"),
    (re.compile(r"washer|windshield\s*washer", re.I), "WASHER"),
]


def map_label_to_category_key(label: str) -> str | None:
    text = (label or "").strip()
    if not text:
        return None
    for pattern, key in _LABEL_PATTERNS:
        if pattern.search(text):
            return key
    return None


def slug_engine(engine: str | None) -> str:
    if not engine:
        return "unknown"
    s = engine.lower().strip()
    s = s.replace(" ", "-").replace("/", "-")
    s = re.sub(r"[^a-z0-9.\-]", "", s)
    s = re.sub(r"-+", "-", s)
    return s or "unknown"


def slug_model(model: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", model.lower().strip()).strip("-")
