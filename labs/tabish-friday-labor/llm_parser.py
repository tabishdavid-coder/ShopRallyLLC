"""Tabish Friday Labor — llm_parser (entrypoint shim). Canonical module: src/llm_parser.py"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from src.llm_parser import *  # noqa: E402,F403
