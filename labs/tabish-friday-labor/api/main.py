"""
Tabish Friday Labor — API entrypoint
(labor guide + fluids + associations + diagrams + procedures).

Run:
  uvicorn api.main:app --host 127.0.0.1 --port 8791
  # or: python -m api.main
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.labor_guide_api import app, main  # noqa: E402

__all__ = ["app", "main"]

if __name__ == "__main__":
    main()
