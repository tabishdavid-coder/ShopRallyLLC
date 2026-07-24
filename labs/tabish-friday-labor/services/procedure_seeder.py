"""
Procedure knowledge-base seeder
===============================
Ad-hoc scrape of public DIY repair guides → structured ``procedures`` rows.

- Fixture / offline mode by default (no network).
- Live mode: DuckDuckGo HTML search → fetch candidate pages → LLM structured steps.
- Heavy rate limiting + robots.txt respect.
"""

from __future__ import annotations

import json
import logging
import random
import re
import time
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus, urlparse
from urllib.robotparser import RobotFileParser

from config.settings import settings
from src.db import execute_returning, fetch_one

log = logging.getLogger("tfl.procedures.seeder")

USER_AGENT = (
    "Mozilla/5.0 (compatible; TabishFridayLabor/0.1; +https://getshoprally.com) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

PROCEDURE_STEP_SCHEMA: dict[str, Any] = {
    "name": "repair_procedure_steps",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "title": {"type": "string"},
            "is_procedure": {"type": "boolean"},
            "steps": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "step_number": {"type": "integer"},
                        "instruction": {"type": "string"},
                        "torque_spec": {"type": ["string", "null"]},
                        "tool": {"type": ["string", "null"]},
                        "image_url": {"type": ["string", "null"]},
                    },
                    "required": [
                        "step_number",
                        "instruction",
                        "torque_spec",
                        "tool",
                        "image_url",
                    ],
                },
            },
            "author": {"type": ["string", "null"]},
        },
        "required": ["title", "is_procedure", "steps", "author"],
    },
}

SYSTEM_PROMPT = """You extract automotive repair procedures from DIY article text.
Return JSON only. Each step needs step_number, instruction, optional torque_spec/tool/image_url.
If the text is not a step-by-step repair guide, set is_procedure=false and steps=[].
Never invent unsafe shortcuts; prefer the source wording. Do not invent prices.
"""


class _HTMLText(HTMLParser):
    """Strip tags; number ``<ol><li>`` items so offline step extract works."""

    def __init__(self) -> None:
        super().__init__()
        self.chunks: list[str] = []
        self._skip = False
        self._in_ol = False
        self._li_index = 0
        self._pending_li = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style", "noscript"}:
            self._skip = True
        elif tag == "ol":
            self._in_ol = True
            self._li_index = 0
        elif tag == "li" and self._in_ol:
            self._li_index += 1
            self._pending_li = True

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "noscript"}:
            self._skip = False
        elif tag == "ol":
            self._in_ol = False
            self._li_index = 0
            self._pending_li = False

    def handle_data(self, data: str) -> None:
        if self._skip:
            return
        t = data.strip()
        if not t:
            return
        if self._pending_li:
            self.chunks.append(f"{self._li_index}. {t}")
            self._pending_li = False
        else:
            self.chunks.append(t)


def _delay() -> None:
    # Heavier than catalog scrape — DIY sites are ad-hoc
    base = max(2.0, settings.scraper_delay_seconds * 2)
    time.sleep(base + random.uniform(0.5, 2.0))


def _robots_allows(url: str) -> bool:
    if settings.scraper_mode != "live":
        return True
    try:
        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        rp = RobotFileParser()
        rp.set_url(robots_url)
        _delay()
        rp.read()
        return rp.can_fetch(USER_AGENT, url)
    except Exception as exc:  # noqa: BLE001
        log.info("robots.txt check failed (%s); denying by default for DIY", exc)
        return False


def html_to_text(html: str) -> str:
    parser = _HTMLText()
    parser.feed(html)
    return "\n".join(parser.chunks)


def extract_steps_offline(text: str, *, title_hint: str | None = None) -> dict[str, Any]:
    """Deterministic step extraction from ordered lists / numbered lines (no LLM)."""
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    steps: list[dict[str, Any]] = []
    torque_re = re.compile(
        r"(\d+(?:\.\d+)?\s*(?:ft-?lbs?|N[·.]?m|nm|in-?lbs?))",
        re.I,
    )
    tool_re = re.compile(
        r"\b((?:\d+\s*)?(?:mm|sae)?\s*(?:socket|wrench|c-clamp|jack stands?|torque wrench|piston tool)s?)\b",
        re.I,
    )
    for ln in lines:
        m = re.match(r"^(?:step\s*)?(\d+)[.)]\s*(.+)$", ln, flags=re.I)
        if not m:
            continue
        instruction = m.group(2).strip()
        torque = None
        tm = torque_re.search(instruction)
        if tm:
            torque = tm.group(1)
        tool = None
        um = tool_re.search(instruction)
        if um:
            tool = um.group(1)
        steps.append(
            {
                "step_number": int(m.group(1)),
                "instruction": instruction,
                "torque_spec": torque,
                "tool": tool,
                "image_url": None,
            }
        )
    title = title_hint or "Repair procedure"
    for ln in lines[:5]:
        if "how to" in ln.lower() or "replace" in ln.lower() or "diy" in ln.lower():
            title = ln[:255]
            break
    return {
        "title": title[:255],
        "is_procedure": len(steps) >= 2,
        "steps": steps,
        "author": "offline_extractor",
    }


def extract_steps_with_llm(raw_text: str, *, client: Any | None = None) -> dict[str, Any]:
    """LLM structured extraction — ~$0.01 / guide with gpt-4o-mini."""
    text = (raw_text or "").strip()
    if not text:
        return {"title": "", "is_procedure": False, "steps": [], "author": None}
    if not settings.openai_api_key and client is None:
        return extract_steps_offline(text)

    from openai import OpenAI

    openai_client = client or OpenAI(api_key=settings.openai_api_key)
    model = settings.openai_model
    # Truncate to keep cost minimal
    clipped = text[:12000]
    response = openai_client.chat.completions.create(
        model=model,
        temperature=0,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": clipped},
        ],
        response_format={"type": "json_schema", "json_schema": PROCEDURE_STEP_SCHEMA},
    )
    content = response.choices[0].message.content
    if not content:
        raise RuntimeError("LLM returned empty procedure content")
    return json.loads(content)


def _fixture_guide(year: int, make: str, model: str, component: str) -> Path | None:
    fixtures = settings.fixtures_dir
    # Prefer component-specific DIY HTML
    candidates = [
        fixtures / "diy_brake_pads.html",
        fixtures / f"diy_{component.lower().replace(' ', '_')}.html",
    ]
    for c in candidates:
        if c.exists() and ("brake" in component.lower() or "pad" in component.lower() or c.name == "diy_brake_pads.html"):
            if "brake" in component.lower() or "pad" in component.lower() or "brake" in c.name:
                return c
    # Any diy_*.html
    for c in fixtures.glob("diy_*.html"):
        return c
    return None


def search_diy_urls(query: str, *, max_results: int = 5) -> list[str]:
    """
    Free search via DuckDuckGo HTML (live) or empty (fixture).
    Bing HTML is a fallback if DDG yields nothing.
    """
    if settings.scraper_mode != "live":
        return []
    try:
        import httpx
    except ImportError:
        return []

    urls: list[str] = []
    endpoints = [
        f"https://html.duckduckgo.com/html/?q={quote_plus(query)}",
        f"https://www.bing.com/search?q={quote_plus(query)}",
    ]
    for endpoint in endpoints:
        if not _robots_allows(endpoint):
            continue
        _delay()
        with httpx.Client(
            follow_redirects=True,
            timeout=30.0,
            headers={"User-Agent": USER_AGENT},
        ) as client:
            resp = client.get(endpoint)
            resp.raise_for_status()
            # Extract result links
            for m in re.finditer(r'href="(https?://[^"]+)"', resp.text):
                u = m.group(1)
                host = urlparse(u).netloc.lower()
                if any(
                    bad in host
                    for bad in ("duckduckgo.", "bing.", "microsoft.", "google.")
                ):
                    continue
                if u not in urls:
                    urls.append(u)
                if len(urls) >= max_results:
                    return urls
    return urls[:max_results]


def fetch_page_text(url: str) -> str | None:
    if not _robots_allows(url):
        log.warning("robots.txt disallows %s", url)
        return None
    try:
        import httpx
    except ImportError:
        return None
    _delay()
    with httpx.Client(
        follow_redirects=True,
        timeout=45.0,
        headers={"User-Agent": USER_AGENT},
    ) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return html_to_text(resp.text)


def resolve_operation_id(operation_code: str | None, component: str) -> str | None:
    if operation_code:
        row = fetch_one(
            "SELECT id FROM service_operations WHERE operation_code = %s",
            (operation_code,),
        )
        if row:
            return str(row["id"])
    # heuristic
    cl = component.lower()
    if "pad" in cl and "front" in cl:
        code = "BRAKES.FRONT.PADS.R_AND_R"
    elif "rotor" in cl:
        code = "BRAKES.FRONT.ROTORS.R_AND_R"
    else:
        return None
    row = fetch_one("SELECT id FROM service_operations WHERE operation_code = %s", (code,))
    return str(row["id"]) if row else None


def store_procedure(
    *,
    operation_id: str,
    vehicle_id: str | None,
    title: str,
    steps: list[dict[str, Any]],
    author: str | None,
    source: str = "scraped",
    is_approved: bool = True,
) -> int:
    row = execute_returning(
        """
        INSERT INTO procedures (
          operation_id, vehicle_id, title, steps, author, source, is_approved
        ) VALUES (
          %s::uuid, %s::uuid, %s, %s::jsonb, %s, %s, %s
        )
        RETURNING id
        """,
        (
            operation_id,
            vehicle_id,
            title[:255],
            json.dumps(steps),
            author,
            source,
            is_approved,
        ),
    )
    assert row
    return int(row["id"])


def scrape_public_procedures(
    vehicle_year: int,
    make: str,
    model: str,
    engine: str | None = None,
    *,
    component: str = "front brake pads",
    operation_code: str | None = None,
    vehicle_id: str | None = None,
    max_guides: int = 2,
) -> dict[str, Any]:
    """
    Find repair guides for vehicle + component, extract steps, store as scraped procedures.

    Fixture mode reads ``data/fixtures/diy_*.html`` and uses offline/LLM extraction.
    Live mode searches DuckDuckGo/Bing then fetches pages with rate limits.
    """
    query = f"{vehicle_year} {make} {model} {component} DIY"
    stored: list[int] = []
    sources_used: list[str] = []

    texts: list[tuple[str, str]] = []  # (label, text)

    if settings.scraper_mode != "live":
        path = _fixture_guide(vehicle_year, make, model, component)
        if path:
            html = path.read_text(encoding="utf-8")
            texts.append((f"fixture:{path.name}", html_to_text(html)))
    else:
        for url in search_diy_urls(query, max_results=max_guides + 2)[:max_guides]:
            body = fetch_page_text(url)
            if body and len(body) > 200:
                texts.append((url, body))

    op_id = None
    try:
        op_id = resolve_operation_id(operation_code, component)
    except Exception as exc:  # noqa: BLE001
        log.info("operation resolve skipped (DB?): %s", exc)

    if vehicle_id is None:
        try:
            v = fetch_one(
                """
                SELECT id FROM vehicle_taxonomy
                WHERE model_year = %s AND lower(make) = lower(%s) AND lower(model) = lower(%s)
                LIMIT 1
                """,
                (vehicle_year, make, model),
            )
            if v:
                vehicle_id = str(v["id"])
        except Exception:  # noqa: BLE001
            vehicle_id = None

    for label, text in texts:
        parsed = extract_steps_with_llm(text)
        if not parsed.get("is_procedure") or not parsed.get("steps"):
            # offline retry
            parsed = extract_steps_offline(
                text,
                title_hint=f"{vehicle_year} {make} {model} {component}",
            )
        if not parsed.get("is_procedure") or len(parsed.get("steps") or []) < 2:
            continue
        if not op_id:
            # Still return parsed for offline smoke without DB write
            sources_used.append(label)
            return {
                "ok": True,
                "query": query,
                "stored_ids": [],
                "preview": parsed,
                "sources": sources_used,
                "db_written": False,
            }
        try:
            pid = store_procedure(
                operation_id=op_id,
                vehicle_id=vehicle_id,
                title=str(parsed.get("title") or query)[:255],
                steps=list(parsed["steps"]),
                author=parsed.get("author") or "diy_scrape",
                source="scraped",
                is_approved=True,
            )
            stored.append(pid)
            sources_used.append(label)
        except Exception as exc:  # noqa: BLE001
            log.info("procedure store skipped: %s", exc)
            sources_used.append(label)
            return {
                "ok": True,
                "query": query,
                "stored_ids": [],
                "preview": parsed,
                "sources": sources_used,
                "db_written": False,
                "error": str(exc),
            }

    return {
        "ok": True,
        "query": query,
        "stored_ids": stored,
        "sources": sources_used,
        "db_written": bool(stored),
        "engine": engine,
        "mode": settings.scraper_mode,
    }


if __name__ == "__main__":
    out = scrape_public_procedures(2014, "Honda", "Accord", "3.5L V6")
    print(json.dumps(out, indent=2))
