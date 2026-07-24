#!/usr/bin/env python3
"""Seed scraper_sources from known OEM endpoints."""

from __future__ import annotations

import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Allow running from repo root
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import psycopg2  # noqa: E402

DEFAULT_SOURCES = [
    {
        "sourceName": "partsouq",
        "baseUrl": "https://partsouq.com",
        "priority": 1,
        "endpoints": {
            "health": "/en/catalog/genuine/locate?c=Honda",
            "catalog": "/en/catalog/genuine/parts?c={make}&model={model}&year={year}",
            "search": "/en/search?q={make}+{model}+{year}",
        },
        "selectors": {
            "health_marker": "catalog",
            "result_marker": "part-number",
            "title": "h1",
        },
    },
    {
        "sourceName": "7zap",
        "baseUrl": "https://www.7zap.com",
        "priority": 2,
        "endpoints": {
            "health": "/en/catalog/",
            "catalog": "/en/catalog/{make}/{model}/{year}/",
            "search": "/en/search/?q={make}+{model}",
        },
        "selectors": {
            "health_marker": "catalog",
            "result_marker": "article",
        },
    },
    {
        "sourceName": "fordparts",
        "baseUrl": "https://www.fordparts.com",
        "priority": 3,
        "endpoints": {
            "health": "/",
            "catalog": "/v/{year}/{make}/{model}",
            "search": "/search?q={model}",
        },
        "selectors": {
            "health_marker": "Ford",
            "result_marker": "product",
        },
    },
    {
        "sourceName": "fluidcapacity",
        "baseUrl": "https://www.fluidcapacity.com",
        "priority": 4,
        "endpoints": {
            "health": "/",
            "fluids": "/vehicle/{year}/{make}/{model}/fluids",
            "catalog": "/vehicle/{year}/{make}/{model}",
        },
        "selectors": {
            "health_marker": "fluid",
            "result_marker": "capacity",
        },
    },
    {
        "sourceName": "nhtsa_vpic",
        "baseUrl": "https://vpic.nhtsa.dot.gov/api",
        "priority": 5,
        "endpoints": {
            "health": "/vehicles/DecodeVin/{vin}?format=json",
            "catalog": "/vehicles/DecodeVin/{vin}?format=json",
        },
        "selectors": {
            "health_marker": "Results",
            "result_marker": "Make",
        },
    },
]


def upsert_sources(database_url: str) -> int:
    now = datetime.now(timezone.utc)
    count = 0
    conn = psycopg2.connect(database_url)
    try:
        with conn.cursor() as cur:
            for src in DEFAULT_SOURCES:
                cur.execute(
                    '''
                    INSERT INTO "ScraperSource"
                      (id, "sourceName", "baseUrl", endpoints, selectors, status, priority, "createdAt", "updatedAt")
                    VALUES (%s, %s, %s, %s::jsonb, %s::jsonb, 'active', %s, %s, %s)
                    ON CONFLICT ("sourceName") DO UPDATE SET
                      "baseUrl" = EXCLUDED."baseUrl",
                      endpoints = EXCLUDED.endpoints,
                      selectors = EXCLUDED.selectors,
                      priority = EXCLUDED.priority,
                      "updatedAt" = EXCLUDED."updatedAt"
                    ''',
                    (
                        str(uuid.uuid4()),
                        src["sourceName"],
                        src["baseUrl"],
                        json.dumps(src["endpoints"]),
                        json.dumps(src["selectors"]),
                        src["priority"],
                        now,
                        now,
                    ),
                )
                count += 1
        conn.commit()
    finally:
        conn.close()
    return count


def main() -> None:
    database_url = os.getenv("DATABASE_URL", "")
    if not database_url:
        print("DATABASE_URL required", file=sys.stderr)
        sys.exit(1)
    n = upsert_sources(database_url)
    print(f"Upserted {n} scraper sources")


if __name__ == "__main__":
    main()
