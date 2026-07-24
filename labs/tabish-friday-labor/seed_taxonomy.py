"""Tabish Friday Labor — seed_taxonomy (entrypoint shim). Canonical module: src/seed_taxonomy.py"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from src.seed_taxonomy import *  # noqa: E402,F403
