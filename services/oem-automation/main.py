"""FastAPI entrypoint — health checks + Cursor-assisted repair endpoint."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from config import load_settings
from services.health_monitor import build_repair_prompt, run_health_checks
from services.redundancy import get_system_health
from services.scheduler import list_scheduled_jobs, start_scheduler, shutdown_scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def verify_admin(authorization: str | None = Header(default=None)) -> None:
    settings = load_settings()
    token = settings.admin_token
    if not token:
        return
    if authorization != f"Bearer {token}":
        raise HTTPException(status_code=401, detail="Unauthorized")


class RepairSourceBody(BaseModel):
    source_name: str = Field(..., alias="source_name")
    sample_response: str | None = Field(default=None, alias="sample_response")

    model_config = {"populate_by_name": True}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    start_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(title="ShopRally OEM Automation", lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/system/health")
def system_health() -> dict[str, Any]:
    """Redundancy layer health — all sources + recent fallback events."""
    return get_system_health()


@app.post("/admin/run-health-check")
def admin_run_health_check(_: None = Depends(verify_admin)) -> dict[str, Any]:
    return run_health_checks()


@app.post("/admin/repair-source")
def admin_repair_source(body: RepairSourceBody, _: None = Depends(verify_admin)) -> dict[str, Any]:
    result = build_repair_prompt(body.source_name, body.sample_response)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@app.get("/admin/scheduler")
def admin_scheduler(_: None = Depends(verify_admin)) -> dict[str, Any]:
    return {"jobs": list_scheduled_jobs()}
