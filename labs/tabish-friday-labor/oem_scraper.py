"""Tabish Friday Labor — oem_scraper (entrypoint shim). Canonical module: src/oem_scraper.py"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from src.oem_scraper import *  # noqa: E402,F403
