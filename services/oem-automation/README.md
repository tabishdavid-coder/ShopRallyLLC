# ShopRally OEM Automation

Platform-level automation, resilience, and self-maintenance for automotive OEM data harvest (parts catalogs, fluids, VIN decode probes).

## What exists vs scaffolded

| Component | Status |
|-----------|--------|
| Prisma tables (`ScraperSource`, `HealthAlert`, `AutomationJobRun`) | Migration `20260724020000_oem_automation_platform` |
| Redundancy layer (`SourceHealthLog`, `FallbackEvent`, metrics) | Migration `20260724030000_oem_redundancy_layer` |
| `DataResolver` (`services/redundancy.py`) | **New** — ordered fallback, TTL cache, health telemetry |
| Python APScheduler + FastAPI service | `services/oem-automation/` |
| Multi-source fallback pipeline | Wired via `fetch_with_fallback` in pipeline + fluid normalizer |
| Platform UI (`/platform/system`) | Redundancy health, fallback audit, health log |
| Labor guide `meta.redundancy` | **New** — `{ source, fallback_used, cache_age_seconds, health_status }` |
| **CRM TypeScript resolver** | `src/server/services/oem-labor-resolver.ts` — Pro/Elite primary via `lookupLaborSuggestion()` (no Python required) |
| AssociationLearner / FallbackEngine | Scaffold + SQL labor average lookup |

Prior ShopRally automotive data used TypeScript (Gemini fluids enrich, MOTOR catalog, NHTSA vPIC). The Python stack adds platform-level redundancy and audit.

## Redundancy layer

`DataResolver` (`services/oem-automation/services/redundancy.py`) provides:

| Method | Fallback chain |
|--------|----------------|
| `fetch_with_fallback` | Ordered sources → TTL cache → `AllSourcesFailedException` |
| `get_vehicle_parts` | Scraper sources → cache → stub (offline demo) |
| `get_fluid_specs` | fluidcapacity → prior model year (confidence 40) |
| `get_labor_estimate` | FallbackEngine → SQL `LaborOperation` avg → 1.0 hr default |
| `get_vin_decode` | NHTSA vPIC → commercial (if `VIN_PROVIDER_API_KEY`) → manual entry prompt |
| `parse_technician_note` | Primary LLM → secondary LLM → `rule_based_parse` |

**Cache:** in-memory TTL by default; set `REDIS_URL` for shared Redis backend.

**TTL defaults (seconds):** parts 86400, fluids 43200, labor 3600, vin 604800.

**Health degradation:** 2 consecutive probe failures → `status=degraded`, `priority=999` (stores `originalPriority`); 2 consecutive passes restores priority.

## Prerequisites

- Postgres `DATABASE_URL` (same Neon DB as ShopRally)
- Python 3.11+
- Apply Prisma migrations: `npm run db:migrate`
- Seed sources: `python services/oem-automation/scripts/init_sources.py` or `npm run oem:init-sources`

## Environment

```env
DATABASE_URL=postgresql://...
OEM_AUTOMATION_ADMIN_TOKEN=...   # or reuse CRON_SECRET
REDIS_URL=redis://...            # optional — shared TTL cache
VIN_PROVIDER_API_KEY=...         # optional commercial VIN fallback
GEMINI_API_KEY=...               # optional LLM parse (primary)
GEMINI_API_KEY_SECONDARY=...     # optional LLM parse (secondary)
OEM_SCHEDULER_ENABLED=true
OEM_JOB_QUARTERLY_SCRAPE=true
OEM_JOB_DAILY_TELEMETRY=true
OEM_JOB_DAILY_HEALTH=true
PLATFORM_OEM_AUTOMATION_UI=true   # platform health UI (default on in dev)
OEM_AUTOMATION_SERVICE_URL=http://127.0.0.1:8090
# Alias accepted by CRM resolver:
OEM_AUTOMATION_URL=http://127.0.0.1:8090
```

## Start the scheduler (Python)

```bash
cd services/oem-automation
pip install -r requirements.txt
export DATABASE_URL=...
uvicorn main:app --host 127.0.0.1 --port 8090
```

APScheduler starts with the FastAPI app and runs:

- `quarterly_scrape` — full OEM scrape pass (every 90 days by default cron)
- `daily_telemetry_update` — 2 AM — closed ROs → AssociationLearner + FallbackEngine
- `daily_health_check` — 3 AM — ping each active source via DataResolver smoke tests

## GET /system/health

**FastAPI (standalone):**

```bash
curl http://127.0.0.1:8090/system/health
```

Returns:

- `sources` — all scraper rows with priority, success/failure counts, health status
- `fallback_events` — recent `FallbackEvent` audit rows
- `health_log_summary` — recent `SourceHealthLog` probe attempts
- `redundancy` — cache backend + TTL map

No auth required on `/system/health` (read-only aggregate). Admin mutations remain on `/admin/*`.

## Platform UI

**URL:** http://localhost:3031/platform/system → **OEM data health & automation**

Shows:

- Per-source **status**, **healthStatus**, priority (with restored original), success/failure counts, last attempted
- **Recent fallback events** audit table
- **Source health log** probe summary
- Health alerts + automation job run history
- **Run health check now** (platform admin)

Requires `PLATFORM_OEM_AUTOMATION_UI=true` (default in dev) and platform admin session.

## Manual health check (Next.js)

```bash
curl -X POST http://localhost:3031/api/platform/oem-automation/health-check \
  -H "Cookie: ..." # platform admin session
```

Or use cron route (requires `CRON_SECRET`):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3031/api/cron/oem-automation?job=health_check
```

## Stub vs live behavior

| Mode | Behavior |
|------|----------|
| **Offline / no DB** | Python service fails connect; Next.js UI still renders if tables exist |
| **DB + stub sources** | HTTP probes may fail → fallback events + cache/stub parts; fluids → prior year; labor → 1.0 hr |
| **Live sources** | Successful probes increment `successCount`; data served with `meta.health_status: live` |
| **Degraded source** | After 2 failures: priority 999, alerts; resolver tries next source in chain |
| **LLM parse** | Without `GEMINI_API_KEY`, `parse_technician_note` uses `rule_based_parse` only |

## Repair-source endpoint

**FastAPI (standalone):**

```bash
curl -X POST http://127.0.0.1:8090/admin/repair-source \
  -H "Authorization: Bearer $OEM_AUTOMATION_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source_name":"partsouq","sample_response":"<html>...</html>"}'
```

**Next.js proxy:**

```bash
curl -X POST http://localhost:3031/api/platform/oem-automation/repair-source \
  -H "Content-Type: application/json" \
  -d '{"sourceName":"partsouq","sampleResponse":"..."}'
```

## Logs

- `services/oem-automation/logs/scraper_errors.log` — JSON lines with response snippets + old config

## Init sources

```bash
python services/oem-automation/scripts/init_sources.py
# or
npm run oem:init-sources
```

Seeds: partsouq, 7zap, fordparts, fluidcapacity, nhtsa_vpic.
