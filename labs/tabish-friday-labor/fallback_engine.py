"""Tabish Friday Labor — fallback_engine (entrypoint shim). Canonical module: src/fallback_engine.py"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from src.fallback_engine import *  # noqa: E402,F403
