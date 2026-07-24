"""Environment-driven configuration for OEM automation service."""

from __future__ import annotations

import os
from dataclasses import dataclass


def _bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    database_url: str
    admin_token: str
    log_dir: str
    scheduler_enabled: bool
    job_quarterly_scrape_enabled: bool
    job_daily_telemetry_enabled: bool
    job_daily_health_enabled: bool
    quarterly_scrape_cron: str
    daily_telemetry_cron: str
    daily_health_cron: str
    health_probe_vehicle: dict
    stale_days: int


def load_settings() -> Settings:
    return Settings(
        database_url=os.getenv("DATABASE_URL", ""),
        admin_token=os.getenv("OEM_AUTOMATION_ADMIN_TOKEN", os.getenv("CRON_SECRET", "")),
        log_dir=os.getenv("OEM_AUTOMATION_LOG_DIR", "services/oem-automation/logs"),
        scheduler_enabled=_bool("OEM_SCHEDULER_ENABLED", True),
        job_quarterly_scrape_enabled=_bool("OEM_JOB_QUARTERLY_SCRAPE", True),
        job_daily_telemetry_enabled=_bool("OEM_JOB_DAILY_TELEMETRY", True),
        job_daily_health_enabled=_bool("OEM_JOB_DAILY_HEALTH", True),
        quarterly_scrape_cron=os.getenv("OEM_QUARTERLY_SCRAPE_CRON", "0 1 1 */3 *"),
        daily_telemetry_cron=os.getenv("OEM_DAILY_TELEMETRY_CRON", "0 2 * * *"),
        daily_health_cron=os.getenv("OEM_DAILY_HEALTH_CRON", "0 3 * * *"),
        health_probe_vehicle={
            "year": int(os.getenv("OEM_HEALTH_PROBE_YEAR", "2014")),
            "make": os.getenv("OEM_HEALTH_PROBE_MAKE", "Honda"),
            "model": os.getenv("OEM_HEALTH_PROBE_MODEL", "Accord"),
            "vin": os.getenv("OEM_HEALTH_PROBE_VIN", "1HGCM82633A004352"),
        },
        stale_days=int(os.getenv("OEM_STALE_DAYS", "180")),
    )
