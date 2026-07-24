"""Tabish Friday Labor — labor_guide_api (entrypoint shim). Canonical module: src/labor_guide_api.py"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from src.labor_guide_api import *  # noqa: E402,F403
