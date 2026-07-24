"""Deterministic OEM path → operation_key helpers (no DB dependency)."""

from __future__ import annotations

import re

SEGMENT_MAP = {
    "brakes": "BRAKES",
    "brake": "BRAKES",
    "front": "FRONT",
    "rear": "REAR",
    "pads": "PADS",
    "pad": "PADS",
    "rotors": "ROTORS",
    "rotor": "ROTORS",
    "engine": "ENGINE",
    "lubrication": "OIL",
    "oil filter": "FILTER",
    "oil & filter": "FILTER",
    "oil": "OIL",
    "filter": "FILTER",
    "suspension": "SUSPENSION",
    "strut": "STRUT",
    "struts": "STRUT",
    "remove & replace": "R_AND_R",
    "remove and replace": "R_AND_R",
    "r&r": "R_AND_R",
    "replace": "REPLACE",
    "inspect": "INSPECT",
}


def slug_segment(segment: str) -> str:
    s = segment.strip().lower()
    if s in SEGMENT_MAP:
        return SEGMENT_MAP[s]
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_").upper()
    return s or "UNKNOWN"


def path_to_keys(path: list[str]) -> list[str]:
    """Return cumulative keys for levels 1..len(path) (max 4)."""
    parts = [slug_segment(p) for p in path[:4]]
    return [".".join(parts[: i + 1]) for i in range(len(parts))]
