"""
Tabish Friday Labor — FastAPI Labor Guide backend
=================================================
Standalone API. Not mounted into ShopRally CRM.

Endpoints:
  GET  /health
  GET  /vehicles/search?q=
  GET  /vehicles/{id}/operations
  POST /technician/note
  GET  /billing/estimate
"""

from __future__ import annotations

import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from config.settings import settings  # noqa: E402
from src.billing_calculator import BillingCalculator  # noqa: E402
from src.db import fetch_all, fetch_one  # noqa: E402
from src.fallback_engine import (  # noqa: E402
    FallbackEngine,
    enqueue_parts_scrape_job,
    parts_scrape_worker,
)
from src.llm_parser import (  # noqa: E402
    parse_technician_intent,
    parse_technician_intent_offline_demo,
)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("tfl.api")

_worker_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _worker_task
    stop = asyncio.Event()
    _worker_task = asyncio.create_task(parts_scrape_worker(stop))
    log.info("Tabish Friday Labor API on %s:%s", settings.host, settings.port)
    yield
    stop.set()
    if _worker_task:
        await asyncio.wait([_worker_task], timeout=3)


app = FastAPI(
    title="Tabish Friday Labor",
    description="Proprietary self-correcting labor guide (standalone lab)",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC = ROOT / "static"
if STATIC.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC)), name="static")


class TechnicianNoteIn(BaseModel):
    text: str = Field(min_length=1)
    resolve_labor: bool = True
    enqueue_parts: bool = True


class BillingQuery(BaseModel):
    vehicle_id: UUID
    operation_id: UUID
    quantity: float = 1.0
    region: str | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "tabish-friday-labor"}


@app.get("/")
def index() -> FileResponse:
    index_path = STATIC / "index.html"
    if not index_path.exists():
        raise HTTPException(404, "UI not built — open /docs for API")
    return FileResponse(index_path)


@app.get("/vehicles/search")
def vehicles_search(q: str = Query(min_length=1, max_length=120)) -> dict[str, Any]:
    """Fuzzy search vehicle_taxonomy via trigram / ILIKE."""
    pattern = f"%{q.strip()}%"
    rows = fetch_all(
        """
        SELECT id, model_year, make, model, engine_config, chassis_tier,
               similarity(make || ' ' || model || ' ' || engine_config, %s) AS score
        FROM vehicle_taxonomy
        WHERE make ILIKE %s
           OR model ILIKE %s
           OR engine_config ILIKE %s
           OR (make || ' ' || model || ' ' || engine_config) ILIKE %s
        ORDER BY score DESC NULLS LAST, model_year DESC
        LIMIT 25
        """,
        (q.strip(), pattern, pattern, pattern, pattern),
    )
    return {"query": q, "results": rows}


@app.get("/vehicles/{vehicle_id}/operations")
def vehicle_operations(vehicle_id: UUID) -> dict[str, Any]:
    """Full hierarchical tree of operations for a vehicle with labor status."""
    vehicle = fetch_one("SELECT * FROM vehicle_taxonomy WHERE id = %s", (str(vehicle_id),))
    if not vehicle:
        raise HTTPException(404, "vehicle not found")

    categories = fetch_all(
        """
        SELECT id, parent_id, level, key, name, sort_order
        FROM service_categories
        ORDER BY level, sort_order, name
        """
    )
    operations = fetch_all(
        """
        SELECT
          so.id,
          so.category_id,
          so.operation_code,
          so.description,
          so.standard_hours,
          ltm.base_labor_hrs,
          ltm.status AS labor_status,
          ltm.confidence,
          ltm.id AS matrix_id
        FROM service_operations so
        LEFT JOIN labor_time_matrix ltm
          ON ltm.operation_id = so.id AND ltm.vehicle_id = %s
        ORDER BY so.operation_code
        """,
        (str(vehicle_id),),
    )

    # Build tree
    by_parent: dict[str | None, list[dict[str, Any]]] = {}
    for cat in categories:
        by_parent.setdefault(str(cat["parent_id"]) if cat["parent_id"] else None, []).append(cat)

    ops_by_cat: dict[str, list[dict[str, Any]]] = {}
    for op in operations:
        ops_by_cat.setdefault(str(op["category_id"]), []).append(
            {
                **op,
                "labor_hours": float(op["base_labor_hrs"])
                if op["base_labor_hrs"] is not None
                else float(op["standard_hours"]),
                "status": op["labor_status"] or "estimated",
            }
        )

    def build(parent: str | None = None) -> list[dict[str, Any]]:
        nodes = []
        for cat in by_parent.get(parent, []):
            node = {
                "id": str(cat["id"]),
                "level": cat["level"],
                "key": cat["key"],
                "name": cat["name"],
                "children": build(str(cat["id"])),
                "operations": ops_by_cat.get(str(cat["id"]), []) if cat["level"] == 4 else [],
            }
            nodes.append(node)
        return nodes

    return {"vehicle": vehicle, "tree": build(None)}


@app.post("/technician/note")
async def technician_note(body: TechnicianNoteIn) -> dict[str, Any]:
    """Parse note → resolve vehicle/operations → optional fallback + parts enqueue."""
    keys = [
        r["operation_code"]
        for r in fetch_all("SELECT operation_code FROM service_operations ORDER BY operation_code")
    ]
    if not keys:
        raise HTTPException(503, "No service_operations seeded — run seed_taxonomy")

    if settings.openai_api_key:
        intent = parse_technician_intent(body.text, keys)
    else:
        intent = parse_technician_intent_offline_demo(body.text, keys)

    vehicle_row = None
    v = intent["vehicle"]
    if v.get("year") and v.get("make") and v.get("model"):
        vehicle_row = fetch_one(
            """
            SELECT * FROM vehicle_taxonomy
            WHERE model_year = %s
              AND lower(make) = lower(%s)
              AND lower(model) = lower(%s)
            ORDER BY
              CASE WHEN %s IS NULL THEN 0
                   WHEN lower(engine_config) LIKE lower(%s) THEN 0
                   ELSE 1 END
            LIMIT 1
            """,
            (
                v["year"],
                v["make"],
                v["model"],
                v.get("engine"),
                f"%{v.get('engine') or ''}%",
            ),
        )

    engine = FallbackEngine(persist_estimates=True)
    billing = BillingCalculator(default_region=settings.default_region)
    resolved_ops: list[dict[str, Any]] = []

    for op in intent["operations"]:
        op_row = fetch_one(
            "SELECT id, operation_code, description FROM service_operations WHERE operation_code = %s",
            (op["operation_key"],),
        )
        if not op_row or not vehicle_row:
            resolved_ops.append(
                {
                    "operation_key": op["operation_key"],
                    "quantity": op["quantity"],
                    "resolved": False,
                    "reason": "vehicle_or_operation_not_found",
                }
            )
            continue

        labor = None
        if body.resolve_labor:
            labor = engine.resolve_labor(str(vehicle_row["id"]), str(op_row["id"])).as_dict()

        parts = None
        if body.enqueue_parts:
            parts = engine.ensure_parts_placeholder(
                str(vehicle_row["id"]),
                str(op_row["id"]),
                variant_flags={"variant": intent["parts_flags"].get("variant")},
            )
            if parts.get("job_id"):
                await enqueue_parts_scrape_job(parts["job_id"])

        line = None
        if labor and labor.get("matrix_id") and labor["base_labor_hrs"] > 0:
            try:
                line = billing.calculate_labor_line(
                    str(vehicle_row["id"]),
                    str(op_row["id"]),
                    op["quantity"],
                )
            except LookupError:
                line = None

        resolved_ops.append(
            {
                "operation_key": op["operation_key"],
                "operation_id": str(op_row["id"]),
                "quantity": op["quantity"],
                "resolved": True,
                "labor": labor,
                "parts": parts,
                "billing_preview": line,
            }
        )

    return {
        "intent": intent,
        "vehicle": vehicle_row,
        "operations": resolved_ops,
        "notes": "LLM/offline parser never supplies hours or rates; billing uses DB only.",
    }


@app.get("/billing/estimate")
def billing_estimate(
    vehicle_id: UUID,
    operation_id: UUID,
    quantity: float = Query(default=1.0, gt=0),
    region: str | None = None,
) -> dict[str, Any]:
    """Strict billing: DB hours × shop_config rate. No LLM input."""
    calc = BillingCalculator(default_region=settings.default_region)
    try:
        return calc.calculate_labor_line(vehicle_id, operation_id, quantity, region=region)
    except LookupError as exc:
        raise HTTPException(404, str(exc)) from exc


def main() -> None:
    import uvicorn

    uvicorn.run(
        "src.labor_guide_api:app",
        host=settings.host,
        port=settings.port,
        reload=False,
    )


if __name__ == "__main__":
    main()
