"""APScheduler job runner for OEM automation."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Callable

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from association_learner import AssociationLearner
from config import load_settings
from db.connection import finish_job_run, start_job_run
from fallback_engine import FallbackEngine
from oem_scraper.pipeline import run_quarterly_scrape
from services.health_monitor import run_health_checks

logger = logging.getLogger(__name__)
_scheduler: BackgroundScheduler | None = None


def _wrap_job(job_name: str, fn: Callable[[], dict]) -> Callable[[], None]:
    def runner() -> None:
        run_id = start_job_run(job_name)
        try:
            detail = fn()
            finish_job_run(run_id, status="success", detail=detail)
            logger.info("Job %s completed", job_name)
        except Exception as exc:  # noqa: BLE001
            finish_job_run(run_id, status="failed", error_message=str(exc))
            logger.exception("Job %s failed: %s", job_name, exc)

    return runner


def job_quarterly_scrape() -> dict:
    return run_quarterly_scrape()


def job_daily_telemetry_update() -> dict:
    learner = AssociationLearner()
    fallback = FallbackEngine()
    assoc = learner.update_from_repair_orders()
    telemetry = fallback.update_telemetry_batch()
    return {"association": assoc, "telemetry": telemetry}


def job_daily_health_check() -> dict:
    return run_health_checks()


def start_scheduler() -> BackgroundScheduler | None:
    global _scheduler
    settings = load_settings()
    if not settings.scheduler_enabled:
        logger.info("OEM scheduler disabled via OEM_SCHEDULER_ENABLED")
        return None
    if _scheduler and _scheduler.running:
        return _scheduler

    sched = BackgroundScheduler(timezone="UTC")
    if settings.job_quarterly_scrape_enabled:
        sched.add_job(
            _wrap_job("quarterly_scrape", job_quarterly_scrape),
            CronTrigger.from_crontab(settings.quarterly_scrape_cron),
            id="quarterly_scrape",
            replace_existing=True,
        )
    if settings.job_daily_telemetry_enabled:
        sched.add_job(
            _wrap_job("daily_telemetry_update", job_daily_telemetry_update),
            CronTrigger.from_crontab(settings.daily_telemetry_cron),
            id="daily_telemetry_update",
            replace_existing=True,
        )
    if settings.job_daily_health_enabled:
        sched.add_job(
            _wrap_job("daily_health_check", job_daily_health_check),
            CronTrigger.from_crontab(settings.daily_health_cron),
            id="daily_health_check",
            replace_existing=True,
        )

    sched.start()
    _scheduler = sched
    logger.info("OEM scheduler started with %d jobs", len(sched.get_jobs()))
    return sched


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None


def list_scheduled_jobs() -> list[dict]:
    if not _scheduler:
        return []
    out = []
    for job in _scheduler.get_jobs():
        next_run = job.next_run_time
        out.append(
            {
                "id": job.id,
                "name": job.name or job.id,
                "next_run": next_run.isoformat() if next_run else None,
            }
        )
    return out
