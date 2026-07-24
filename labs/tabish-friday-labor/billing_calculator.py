"""Tabish Friday Labor — billing_calculator (entrypoint shim). Canonical module: src/billing_calculator.py"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from src.billing_calculator import *  # noqa: E402,F403
