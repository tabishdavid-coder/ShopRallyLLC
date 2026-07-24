"""
Tabish Friday Labor — FastAPI Labor Guide backend
=================================================
Standalone API. Not mounted into ShopRally CRM.

Endpoints:
  GET  /health
  GET  /vehicles/search?q=
  GET  /vehicles/{id}/operations
  GET  /vehicles/{id}/operations/{operation_id}/addons
  GET  /vehicles/{id}/operations/{operation_id}/diagrams
  GET  /vehicles/{id}/operations/{operation_id}/procedures
  POST /procedures/submit
  POST /procedures/{id}/vote
  POST /vehicles/{id}/labor/bulk-estimate
  GET  /vehicles/{id}/fluids
  POST /vehicles                    (VIN/YMME upsert → background fluid harvest)
  POST /fluids/discrepancy
  POST /fluids/harvest/{vehicle_id}
  POST /associations/learn
  POST /repair-orders/{id}/close
  POST /technician/note
  GET  /billing/estimate

Frontend guidelines (labor guide UI comments echoed in API responses):
  - Tabs: Labor | Add-ons | Diagrams | Procedures
  - When a diagram is available, display it inline; use lazy loading if multiple.
"""

from __future__ import annotations

import asyncio
import json
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from config.settings import settings  # noqa: E402
from services.association_hours import (  # noqa: E402
    bulk_estimate_hours,
    list_addons_for_operation,
)
from services.association_learner import AssociationLearner  # noqa: E402
from services.fluid_harvest.fluid_normalizer import (  # noqa: E402
    harvest_fluids_for_vehicle,
)
from src.billing_calculator import BillingCalculator  # noqa: E402
from src.db import execute, execute_returning, fetch_all, fetch_one  # noqa: E402
from src.fallback_engine import (  # noqa: E402
    FallbackEngine,
    enqueue_parts_scrape_job,
    parts_scrape_worker,
)
from src.llm_parser import (  # noqa: E402
    extract_procedure_from_note,
    extract_procedure_from_note_offline,
    parse_technician_intent,
    parse_technician_intent_offline_demo,
)
from src.normalize_taxonomy import ensure_vehicle  # noqa: E402

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


class VehicleUpsertIn(BaseModel):
    """VIN decode / manual YMME entry — triggers fluid harvest in background."""

    year: int = Field(ge=1980, le=2100)
    make: str = Field(min_length=1, max_length=80)
    model: str = Field(min_length=1, max_length=80)
    engine: str = Field(min_length=1, max_length=120)
    chassis_tier: str = "2"
    vin: str | None = Field(default=None, max_length=32)
    harvest_fluids: bool = True


class FluidDiscrepancyIn(BaseModel):
    vehicle_id: UUID
    fluid_category_key: str | None = None
    observed_capacity: float | None = None
    observed_unit: str = "qt"
    observed_type: str | None = None
    note: str = Field(min_length=1, max_length=4000)
    created_by: str | None = None


class BulkLaborEstimateIn(BaseModel):
    """Selected operation ids for overlap-aware labor total."""

    operation_ids: list[UUID] = Field(min_length=1, max_length=40)


class RepairOrderLineIn(BaseModel):
    operation_id: UUID
    actual_hours: float | None = Field(default=None, ge=0)
    technician_id: str | None = None


class RepairOrderCloseIn(BaseModel):
    """Close an RO (or record lines then close) to feed association learning."""

    vehicle_id: UUID | None = None
    lines: list[RepairOrderLineIn] = Field(default_factory=list)
    run_learner: bool = True


class ProcedureStepIn(BaseModel):
    step_number: int = Field(ge=1)
    instruction: str = Field(min_length=1, max_length=4000)
    torque_spec: str | None = None
    tool: str | None = None
    image_url: str | None = None


class ProcedureSubmitIn(BaseModel):
    """Technician-submitted procedure (UI → procedures table)."""

    operation_id: UUID
    vehicle_id: UUID | None = None
    title: str = Field(min_length=1, max_length=255)
    steps: list[ProcedureStepIn] = Field(min_length=1, max_length=80)
    author: str | None = Field(default=None, max_length=100)
    require_approval: bool = True


class ProcedureVoteIn(BaseModel):
    voter_key: str = Field(min_length=1, max_length=120, description="Tech id / session key")


def _queue_fluid_harvest(vehicle_id: str) -> None:
    """Background task body — runs harvest pipeline for a new/updated vehicle."""
    try:
        result = harvest_fluids_for_vehicle(vehicle_id, force=False)
        log.info("background fluid harvest %s → %s", vehicle_id, result.get("ok"))
    except Exception:  # noqa: BLE001
        log.exception("background fluid harvest failed for %s", vehicle_id)


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
def vehicle_operations(
    vehicle_id: UUID,
    include_addons_for: UUID | None = Query(
        default=None,
        description="When set, embed Frequently Combined Jobs for this operation_id",
    ),
) -> dict[str, Any]:
    """
    Full hierarchical tree of operations for a vehicle with labor status.

    Each leaf includes ``addon_count`` (active associations). Pass
    ``include_addons_for`` to embed the add-on payload used by the UI
    collapsible "Frequently Combined Jobs" section (see /operations/{id}/addons).
    """
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
          ltm.id AS matrix_id,
          COALESCE(ac.addon_count, 0) AS addon_count
        FROM service_operations so
        LEFT JOIN labor_time_matrix ltm
          ON ltm.operation_id = so.id AND ltm.vehicle_id = %s
        LEFT JOIN (
          SELECT primary_operation_id, COUNT(*)::int AS addon_count
          FROM operation_associations
          WHERE is_active = true
          GROUP BY primary_operation_id
        ) ac ON ac.primary_operation_id = so.id
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
                "addon_count": int(op["addon_count"] or 0),
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

    payload: dict[str, Any] = {"vehicle": vehicle, "tree": build(None)}
    if include_addons_for is not None:
        payload["frequently_combined"] = {
            "operation_id": str(include_addons_for),
            "addons": list_addons_for_operation(vehicle_id, include_addons_for),
            "_ui": {
                "section_title": "Frequently Combined Jobs",
                "collapsible": True,
                "checkbox_field": "operation_id",
                "hours_field": "additional_hours",
            },
        }
    return payload


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

    # Optional: detect step-by-step tech contribution for procedures KB
    if settings.openai_api_key:
        procedure_extract = extract_procedure_from_note(body.text)
    else:
        procedure_extract = extract_procedure_from_note_offline(body.text)

    proposed_procedure_id = None
    if procedure_extract.get("is_procedure") and procedure_extract.get("steps"):
        op_hint = procedure_extract.get("operation_hint")
        op_for_proc = None
        if op_hint:
            op_for_proc = fetch_one(
                "SELECT id FROM service_operations WHERE operation_code = %s",
                (op_hint,),
            )
        if not op_for_proc and resolved_ops:
            for ro in resolved_ops:
                if ro.get("operation_id"):
                    op_for_proc = {"id": ro["operation_id"]}
                    break
        if op_for_proc:
            row = execute_returning(
                """
                INSERT INTO procedures (
                  operation_id, vehicle_id, title, steps, author, source, is_approved
                ) VALUES (
                  %s::uuid, %s::uuid, %s, %s::jsonb, %s, 'tech_contribution', false
                )
                RETURNING id
                """,
                (
                    str(op_for_proc["id"]),
                    str(vehicle_row["id"]) if vehicle_row else None,
                    (procedure_extract.get("title") or "Tech contribution")[:255],
                    json.dumps(procedure_extract["steps"]),
                    "technician",
                ),
            )
            if row:
                proposed_procedure_id = int(row["id"])

    return {
        "intent": intent,
        "vehicle": vehicle_row,
        "operations": resolved_ops,
        "procedure_extract": procedure_extract,
        "proposed_procedure_id": proposed_procedure_id,
        "notes": "LLM/offline parser never supplies hours or rates; billing uses DB only.",
        "_ui": {
            "tabs": ["Labor", "Add-ons", "Diagrams", "Procedures"],
            "hint": "Step-by-step notes are proposed for Procedures (admin approval).",
        },
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


@app.get("/vehicles/{vehicle_id}/fluids")
def vehicle_fluids(vehicle_id: UUID) -> dict[str, Any]:
    """Return all resolved fluid specs with confidence and source."""
    vehicle = fetch_one("SELECT * FROM vehicle_taxonomy WHERE id = %s", (str(vehicle_id),))
    if not vehicle:
        raise HTTPException(404, "vehicle not found")

    rows = fetch_all(
        """
        SELECT
          s.id,
          s.vehicle_id,
          c.key AS category_key,
          c.name AS category_name,
          s.capacity,
          s.capacity_unit,
          s.fluid_type,
          s.alternative_types,
          s.notes,
          s.source,
          s.confidence,
          s.last_verified,
          s.created_at,
          s.updated_at
        FROM vehicle_fluid_specs s
        JOIN fluid_categories c ON c.id = s.fluid_category_id
        WHERE s.vehicle_id = %s
        ORDER BY c.id, s.capacity
        """,
        (str(vehicle_id),),
    )
    return {
        "vehicle": vehicle,
        "fluids": rows,
        "count": len(rows),
        "notes": "Lookups are pure SQL ($0). Harvest is one-time OEM PDF + fluidcapacity merge.",
    }


@app.post("/vehicles")
def upsert_vehicle(
    body: VehicleUpsertIn,
    background_tasks: BackgroundTasks,
) -> dict[str, Any]:
    """
    Add / upsert a vehicle into vehicle_taxonomy (VIN decode or manual entry).
    Queues fluid harvest so specs populate within minutes.
    """
    vehicle_id = ensure_vehicle(
        body.year,
        body.make.strip(),
        body.model.strip(),
        body.engine.strip(),
        chassis_tier=body.chassis_tier,
    )
    if body.vin:
        # Optional audit trail — stored on scrape log detail (no VIN column required)
        execute_returning(
            """
            INSERT INTO fluid_scrape_log (vehicle_id, job_type, status, source, detail)
            VALUES (%s, 'vin_upsert', 'done', 'api', %s::jsonb)
            RETURNING id
            """,
            (vehicle_id, json.dumps({"vin": body.vin})),
        )
    queued = False
    if body.harvest_fluids:
        background_tasks.add_task(_queue_fluid_harvest, vehicle_id)
        queued = True
    return {
        "ok": True,
        "vehicle_id": vehicle_id,
        "fluid_harvest_queued": queued,
    }


@app.post("/fluids/discrepancy")
def fluid_discrepancy(body: FluidDiscrepancyIn) -> dict[str, Any]:
    """Technician submits an observed capacity difference → review ticket."""
    vehicle = fetch_one("SELECT id FROM vehicle_taxonomy WHERE id = %s", (str(body.vehicle_id),))
    if not vehicle:
        raise HTTPException(404, "vehicle not found")

    cat_id = None
    if body.fluid_category_key:
        cat = fetch_one(
            "SELECT id FROM fluid_categories WHERE key = %s",
            (body.fluid_category_key.upper(),),
        )
        if not cat:
            raise HTTPException(400, f"unknown fluid_category_key: {body.fluid_category_key}")
        cat_id = int(cat["id"])

    row = execute_returning(
        """
        INSERT INTO fluid_discrepancy_reports
          (vehicle_id, fluid_category_id, observed_capacity, observed_unit,
           observed_type, note, status, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, 'open', %s)
        RETURNING *
        """,
        (
            str(body.vehicle_id),
            cat_id,
            body.observed_capacity,
            body.observed_unit,
            body.observed_type,
            body.note,
            body.created_by,
        ),
    )
    return {"ok": True, "report": row}


@app.post("/fluids/harvest/{vehicle_id}")
def fluids_harvest(
    vehicle_id: UUID,
    background_tasks: BackgroundTasks,
    force: bool = Query(default=False),
    sync: bool = Query(default=False),
) -> dict[str, Any]:
    """Manually (re)run fluid harvest for a vehicle."""
    vehicle = fetch_one("SELECT id FROM vehicle_taxonomy WHERE id = %s", (str(vehicle_id),))
    if not vehicle:
        raise HTTPException(404, "vehicle not found")
    if sync:
        return harvest_fluids_for_vehicle(str(vehicle_id), force=force)

    def _run() -> None:
        harvest_fluids_for_vehicle(str(vehicle_id), force=force)

    background_tasks.add_task(_run)
    return {"ok": True, "queued": True, "vehicle_id": str(vehicle_id)}


@app.get("/vehicles/{vehicle_id}/operations/{operation_id}/addons")
def vehicle_operation_addons(vehicle_id: UUID, operation_id: UUID) -> dict[str, Any]:
    """
    Frequently combined add-on jobs for a selected operation.

    UI contract (Frequently Combined Jobs):
      - Render a collapsible section under the selected operation.
      - Each item is a checkbox: label=description, sublabel=additional_hours.
      - On check, add associated operation to the estimate cart using additional_hours
        (not full standalone) so overlap is respected.
      - frequency_score can drive sort order / “often done together” badge.

    Response shape:
      {
        "primary": { operation_id, operation_code, description, standalone_hours },
        "addons": [
          {
            "operation_id", "operation_code", "description",
            "standalone_hours", "additional_hours", "combined_total_hours",
            "frequency_score"
          }
        ]
      }
    """
    vehicle = fetch_one("SELECT id FROM vehicle_taxonomy WHERE id = %s", (str(vehicle_id),))
    if not vehicle:
        raise HTTPException(404, "vehicle not found")
    primary = fetch_one(
        "SELECT id, operation_code, description, standard_hours FROM service_operations WHERE id = %s",
        (str(operation_id),),
    )
    if not primary:
        raise HTTPException(404, "operation not found")

    from services.association_hours import standalone_hours

    primary_hrs = standalone_hours(vehicle_id, operation_id)
    addons = list_addons_for_operation(vehicle_id, operation_id)
    return {
        "vehicle_id": str(vehicle_id),
        "primary": {
            "operation_id": str(primary["id"]),
            "operation_code": primary["operation_code"],
            "description": primary["description"],
            "standalone_hours": round(primary_hrs, 2),
        },
        "addons": addons,
        "count": len(addons),
        "_ui": {
            "section_title": "Frequently Combined Jobs",
            "collapsible": True,
            "checkbox_field": "operation_id",
            "hours_field": "additional_hours",
            "hint": "Checking an add-on adds additional_hours to the estimate (overlap already applied).",
        },
    }


@app.post("/vehicles/{vehicle_id}/labor/bulk-estimate")
def vehicle_labor_bulk_estimate(
    vehicle_id: UUID,
    body: BulkLaborEstimateIn,
) -> dict[str, Any]:
    """
    Bulk labor estimate for selected operations with association overlap.

    Uses avg_combined_labor when learned; otherwise sum(standalone) − overlap_discount.
    """
    vehicle = fetch_one("SELECT id FROM vehicle_taxonomy WHERE id = %s", (str(vehicle_id),))
    if not vehicle:
        raise HTTPException(404, "vehicle not found")
    return bulk_estimate_hours(vehicle_id, list(body.operation_ids))


@app.get("/vehicles/{vehicle_id}/operations/{operation_id}/diagrams")
def vehicle_operation_diagrams(vehicle_id: UUID, operation_id: UUID) -> dict[str, Any]:
    """
    OEM exploded-view diagrams for the operation (and its category).

    Frontend guidelines:
      - Labor guide UI tabs: Labor | Add-ons | Diagrams | Procedures
      - When a diagram is available, display it inline (prefer local_path, else image_url)
      - Lazy-load images when multiple diagrams are returned
    """
    vehicle = fetch_one("SELECT id FROM vehicle_taxonomy WHERE id = %s", (str(vehicle_id),))
    if not vehicle:
        raise HTTPException(404, "vehicle not found")
    op = fetch_one(
        "SELECT id, category_id, operation_code, description FROM service_operations WHERE id = %s",
        (str(operation_id),),
    )
    if not op:
        raise HTTPException(404, "operation not found")

    rows = fetch_all(
        """
        SELECT id, category_id, operation_id, vehicle_id, image_url, local_path,
               source, caption, captured_at
        FROM diagrams
        WHERE operation_id = %s::uuid
           OR (
                category_id = %s::uuid
                AND (vehicle_id IS NULL OR vehicle_id = %s::uuid)
              )
           OR (
                vehicle_id = %s::uuid
                AND operation_id IS NULL
                AND category_id IS NULL
              )
        ORDER BY
          CASE WHEN operation_id = %s::uuid THEN 0 ELSE 1 END,
          captured_at DESC
        LIMIT 40
        """,
        (
            str(operation_id),
            str(op["category_id"]),
            str(vehicle_id),
            str(vehicle_id),
            str(operation_id),
        ),
    )
    diagrams = [
        {
            "id": int(r["id"]),
            "image_url": r["image_url"],
            "local_path": r["local_path"],
            "source": r["source"],
            "caption": r["caption"],
            "captured_at": r["captured_at"].isoformat() if r.get("captured_at") else None,
            "category_id": str(r["category_id"]) if r.get("category_id") else None,
            "operation_id": str(r["operation_id"]) if r.get("operation_id") else None,
        }
        for r in rows
    ]
    return {
        "vehicle_id": str(vehicle_id),
        "operation_id": str(operation_id),
        "operation_code": op["operation_code"],
        "diagrams": diagrams,
        "count": len(diagrams),
        "_ui": {
            "tabs": ["Labor", "Add-ons", "Diagrams", "Procedures"],
            "active_tab": "Diagrams",
            "display": "inline",
            "lazy_load": True,
            "prefer_field": "local_path",
            "fallback_field": "image_url",
            "empty_hint": "No OEM diagram cached yet — run OEM scrape or scripts/resync_diagrams.py",
        },
    }


@app.get("/vehicles/{vehicle_id}/operations/{operation_id}/procedures")
def vehicle_operation_procedures(
    vehicle_id: UUID,
    operation_id: UUID,
    source: str | None = Query(
        default=None,
        description="Optional filter: scraped | tech_contribution | TSB | seed",
    ),
    limit: int = Query(default=10, ge=1, le=50),
) -> dict[str, Any]:
    """
    Best approved procedures (highest votes, then most recent).

    Frontend guidelines:
      - Procedures tab lists ranked guides; show steps as an ordered checklist
      - Surface source badge (scraped / tech / TSB) and vote control
    """
    vehicle = fetch_one("SELECT id FROM vehicle_taxonomy WHERE id = %s", (str(vehicle_id),))
    if not vehicle:
        raise HTTPException(404, "vehicle not found")
    op = fetch_one(
        "SELECT id, operation_code, description FROM service_operations WHERE id = %s",
        (str(operation_id),),
    )
    if not op:
        raise HTTPException(404, "operation not found")

    params: list[Any] = [str(operation_id), str(vehicle_id)]
    source_sql = ""
    if source:
        source_sql = " AND p.source = %s"
        params.append(source)
    params.append(limit)

    rows = fetch_all(
        f"""
        SELECT p.id, p.operation_id, p.vehicle_id, p.title, p.steps, p.author,
               p.source, p.votes, p.is_approved, p.created_at
        FROM procedures p
        WHERE p.operation_id = %s::uuid
          AND p.is_approved = true
          AND (p.vehicle_id IS NULL OR p.vehicle_id = %s::uuid)
          {source_sql}
        ORDER BY p.votes DESC, p.created_at DESC
        LIMIT %s
        """,
        tuple(params),
    )
    procedures = [
        {
            "id": int(r["id"]),
            "title": r["title"],
            "steps": r["steps"],
            "author": r["author"],
            "source": r["source"],
            "votes": int(r["votes"] or 0),
            "vehicle_id": str(r["vehicle_id"]) if r.get("vehicle_id") else None,
            "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
        }
        for r in rows
    ]
    return {
        "vehicle_id": str(vehicle_id),
        "operation_id": str(operation_id),
        "operation_code": op["operation_code"],
        "procedures": procedures,
        "count": len(procedures),
        "_ui": {
            "tabs": ["Labor", "Add-ons", "Diagrams", "Procedures"],
            "active_tab": "Procedures",
            "sort": "votes_desc_then_recent",
            "vote_endpoint": "POST /procedures/{id}/vote",
            "submit_endpoint": "POST /procedures/submit",
        },
    }


@app.post("/procedures/submit")
def procedures_submit(body: ProcedureSubmitIn) -> dict[str, Any]:
    """Technician UI submit — stored as tech_contribution (approval optional)."""
    op = fetch_one(
        "SELECT id FROM service_operations WHERE id = %s",
        (str(body.operation_id),),
    )
    if not op:
        raise HTTPException(404, "operation not found")
    if body.vehicle_id:
        vehicle = fetch_one(
            "SELECT id FROM vehicle_taxonomy WHERE id = %s",
            (str(body.vehicle_id),),
        )
        if not vehicle:
            raise HTTPException(404, "vehicle not found")

    steps = [s.model_dump(mode="json") for s in body.steps]
    row = execute_returning(
        """
        INSERT INTO procedures (
          operation_id, vehicle_id, title, steps, author, source, is_approved
        ) VALUES (
          %s::uuid, %s::uuid, %s, %s::jsonb, %s, 'tech_contribution', %s
        )
        RETURNING id, is_approved
        """,
        (
            str(body.operation_id),
            str(body.vehicle_id) if body.vehicle_id else None,
            body.title,
            json.dumps(steps),
            body.author or "technician",
            not body.require_approval,
        ),
    )
    assert row
    return {
        "ok": True,
        "id": int(row["id"]),
        "is_approved": bool(row["is_approved"]),
        "source": "tech_contribution",
        "_ui": {
            "tabs": ["Labor", "Add-ons", "Diagrams", "Procedures"],
            "toast": "Procedure submitted"
            + (" — pending approval" if body.require_approval else ""),
        },
    }


@app.post("/procedures/{procedure_id}/vote")
def procedures_vote(procedure_id: int, body: ProcedureVoteIn) -> dict[str, Any]:
    """Upvote a procedure (one vote per voter_key)."""
    proc = fetch_one("SELECT id, votes FROM procedures WHERE id = %s", (procedure_id,))
    if not proc:
        raise HTTPException(404, "procedure not found")

    existing = fetch_one(
        "SELECT id FROM procedure_votes WHERE procedure_id = %s AND voter_key = %s",
        (procedure_id, body.voter_key.strip()),
    )
    if existing:
        return {
            "ok": True,
            "id": procedure_id,
            "votes": int(proc["votes"] or 0),
            "already_voted": True,
        }

    execute(
        """
        INSERT INTO procedure_votes (procedure_id, voter_key)
        VALUES (%s, %s)
        """,
        (procedure_id, body.voter_key.strip()),
    )
    updated = execute_returning(
        """
        UPDATE procedures
        SET votes = votes + 1, updated_at = now()
        WHERE id = %s
        RETURNING votes
        """,
        (procedure_id,),
    )
    return {
        "ok": True,
        "id": procedure_id,
        "votes": int(updated["votes"]) if updated else int(proc["votes"] or 0) + 1,
        "already_voted": False,
    }


@app.post("/associations/learn")
def associations_learn(background_tasks: BackgroundTasks, sync: bool = False) -> dict[str, Any]:
    """Run AssociationLearner over closed repair_order_lines (scheduled or manual)."""
    learner = AssociationLearner()
    if sync:
        return {"ok": True, **learner.update_from_repair_orders()}

    def _run() -> None:
        try:
            learner.update_from_repair_orders()
        except Exception:  # noqa: BLE001
            log.exception("association learn failed")

    background_tasks.add_task(_run)
    return {"ok": True, "queued": True}


@app.post("/repair-orders/{repair_order_id}/close")
def repair_order_close(
    repair_order_id: UUID,
    body: RepairOrderCloseIn,
    background_tasks: BackgroundTasks,
) -> dict[str, Any]:
    """
    Record optional lines, mark the RO closed, and refresh association scores.
    """
    for line in body.lines:
        execute(
            """
            INSERT INTO repair_order_lines
              (repair_order_id, vehicle_id, operation_id, technician_id, actual_hours, is_closed, closed_at)
            VALUES (%s, %s, %s, %s, %s, true, now())
            """,
            (
                str(repair_order_id),
                str(body.vehicle_id) if body.vehicle_id else None,
                str(line.operation_id),
                line.technician_id,
                line.actual_hours,
            ),
        )
    execute(
        """
        UPDATE repair_order_lines
        SET is_closed = true,
            closed_at = COALESCE(closed_at, now())
        WHERE repair_order_id = %s
        """,
        (str(repair_order_id),),
    )

    if body.run_learner:
        background_tasks.add_task(AssociationLearner().update_from_repair_orders)

    return {
        "ok": True,
        "repair_order_id": str(repair_order_id),
        "learner_queued": body.run_learner,
    }


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
