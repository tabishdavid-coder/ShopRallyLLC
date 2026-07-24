#!/usr/bin/env python3
"""
Re-sync exploded diagram URLs / local caches.

Usage:
  cd labs/tabish-friday-labor
  python scripts/resync_diagrams.py [--limit 50]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from oem_scraper.pipeline import resync_stale_diagrams  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Re-sync OEM diagram caches")
    parser.add_argument("--limit", type=int, default=50)
    args = parser.parse_args()
    result = resync_stale_diagrams(limit=args.limit)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
