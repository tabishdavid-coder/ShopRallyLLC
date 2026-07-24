"""Runtime configuration for Tabish Friday Labor (standalone)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Settings:
    database_url: str
    openai_api_key: str | None
    openai_model: str
    redis_url: str | None
    scraper_mode: str  # "fixture" | "live"
    scraper_delay_seconds: float
    host: str
    port: int
    default_region: str
    staging_dir: Path
    fixtures_dir: Path

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            database_url=os.getenv(
                "TFL_DATABASE_URL",
                os.getenv("DATABASE_URL", "postgresql://localhost:5432/tabish_friday_labor"),
            ),
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            openai_model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            redis_url=os.getenv("REDIS_URL"),
            scraper_mode=os.getenv("TFL_SCRAPER_MODE", "fixture").lower(),
            scraper_delay_seconds=float(os.getenv("TFL_SCRAPER_DELAY", "1.25")),
            host=os.getenv("TFL_HOST", "127.0.0.1"),
            port=int(os.getenv("TFL_PORT", "8791")),
            default_region=os.getenv("TFL_DEFAULT_REGION", "Albany/Capital Region"),
            staging_dir=ROOT / "staging",
            fixtures_dir=ROOT / "data" / "fixtures",
        )


settings = Settings.from_env()
