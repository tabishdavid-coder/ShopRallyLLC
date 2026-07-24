"""Shared URL building and health probe helpers for OEM scrapers."""

from __future__ import annotations

import json
from typing import Any

import httpx


def build_url(source: dict[str, Any], endpoint_key: str, vehicle: dict[str, Any]) -> str:
    base = source["baseUrl"].rstrip("/")
    endpoints = source.get("endpoints") or {}
    if isinstance(endpoints, str):
        endpoints = json.loads(endpoints)
    template = endpoints.get(endpoint_key) or endpoints.get("search") or "/"
    path = (
        template.replace("{year}", str(vehicle.get("year", "")))
        .replace("{make}", str(vehicle.get("make", "")))
        .replace("{model}", str(vehicle.get("model", "")))
        .replace("{vin}", str(vehicle.get("vin", "")))
    )
    if path.startswith("http"):
        return path
    return f"{base}{path if path.startswith('/') else '/' + path}"


def probe_source(
    source: dict[str, Any], vehicle: dict[str, Any], timeout: float = 20.0
) -> tuple[bool, str, str]:
    url = build_url(source, "health", vehicle)
    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            resp = client.get(url, headers={"User-Agent": "ShopRally-OEM-Health/1.0"})
            snippet = resp.text[:500]
            if resp.status_code >= 400:
                return False, f"HTTP {resp.status_code}", snippet
            selectors = source.get("selectors") or {}
            if isinstance(selectors, str):
                selectors = json.loads(selectors)
            marker = selectors.get("health_marker") or selectors.get("result_marker")
            if marker and marker not in resp.text:
                return False, f"Missing selector marker: {marker}", snippet
            return True, "ok", snippet
    except Exception as exc:  # noqa: BLE001
        return False, str(exc), ""
