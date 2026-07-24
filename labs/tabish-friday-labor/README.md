# Tabish Friday Labor

**Standalone** proprietary, self-correcting automotive labor guide — independent of MOTOR / ALLDATA / paid catalog APIs.

**CRM pilot (gated):** exact EWT UI is served at `/lab/tabish-friday-labor.html` and embedded in shop Labor Book (`/quick-labor` + estimate Labor Book dialog) when the shop is **Pro/Elite** and platform release flag `tabishFridayLabor` is ON. Backend Python/Postgres remains standalone (no estimate write-path changes).

## Folder hierarchy

```
labs/tabish-friday-labor/
├── COST.md
├── README.md
├── requirements.txt
├── .env.example
├── docker-compose.yml
├── api/main.py                    # FastAPI entry (labor + fluids + diagrams/procedures)
├── db/
│   ├── schema.sql                 # Fluid + diagrams/procedures DDL (also in sql/)
│   ├── schema_diagrams_procedures.sql
│   └── seed_fluids.py             # Seed Accord / Camry / F-150 fluids
├── oem_scraper/
│   ├── diagram_crawler.py         # Partsouq / 7zap / RevolutionParts illustrations
│   └── pipeline.py                # Persist diagrams on category/operation insert
├── services/
│   ├── fluid_harvest/             # OEM PDF + fluidcapacity merge pipeline
│   ├── procedure_seeder.py        # DIY scrape → procedures KB
│   └── llm_parser.py              # Facade (+ procedure-from-note)
├── sql/
│   └── schema.sql                 # Labor + fluid + associations + diagrams DDL
├── config/
│   └── settings.py
├── src/
│   ├── llm_parser.py              # Intent + procedure extract middleware
│   ├── fallback_engine.py
│   ├── billing_calculator.py
│   ├── oem_scraper.py
│   ├── normalize_taxonomy.py
│   ├── labor_guide_api.py         # FastAPI (canonical)
│   ├── seed_taxonomy.py
│   └── db.py
├── data/fixtures/                 # OEM + fluid + diagram + DIY fixtures
├── media/diagrams/                # Local SVG/PNG cache (fixtures)
├── staging/                       # Scraped JSON / PDF / diagram landing zone
├── static/index.html
└── scripts/
    ├── smoke_offline.py
    └── resync_diagrams.py
```

## Quick start

```bash
cd labs/tabish-friday-labor
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Postgres + schema
docker compose up -d
# (schema auto-loads from sql/schema.sql on first boot)

python -m src.seed_taxonomy
python -m db.seed_fluids            # OEM + fluidcapacity merge for seed vehicles
python -m api.main                  # or: python -m src.labor_guide_api
# → http://127.0.0.1:8791/          (UI)
# → http://127.0.0.1:8791/docs      (OpenAPI)
# → GET /vehicles/{id}/fluids
```

### Fluid capacities

- Harvest: owner's-manual PDF extract × fluidcapacity.com → `vehicle_fluid_specs`
- New vehicles (`POST /vehicles`) queue a background harvest
- Technician conflicts: `POST /fluids/discrepancy`
- Lookups are pure SQL ($0); see [COST.md](./COST.md)

### Dynamic job associations (frequently combined)

- Seed: `python -m services.job_association_seeder` (or via `seed_taxonomy`)
- Learn: `POST /associations/learn` or `POST /repair-orders/{id}/close`
- UI API: `GET /vehicles/{id}/operations/{op}/addons` + `POST .../labor/bulk-estimate`
- Collapsible **Frequently Combined Jobs** uses the addons payload (checkboxes + `additional_hours`)

### Exploded diagrams + repair procedures

- Capture: OEM scrape sidecar (`oem_scraper/diagram_crawler.py`) + `normalize_taxonomy` persist
- Re-sync: `python scripts/resync_diagrams.py`
- Seed DIY procedures: `python -m services.procedure_seeder`
- API:
  - `GET /vehicles/{id}/operations/{op}/diagrams`
  - `GET /vehicles/{id}/operations/{op}/procedures`
  - `POST /procedures/submit` · `POST /procedures/{id}/vote`
- UI tabs (guideline in `_ui` payloads): **Labor | Add-ons | Diagrams | Procedures**
- Lazy-load diagrams when multiple; prefer `local_path` over remote `image_url`

### Offline smoke (no Postgres / no OpenAI)

```bash
python scripts/smoke_offline.py
```

### Preview without Docker (static only)

If ShopRally `npm run dev` is up:

**http://localhost:3031/lab/tabish-friday-labor.html**

(static copy mirrored under `public/lab/` — fixture UI, no API required)

## Architecture invariants

1. **LLM never prices** — parser returns vehicle / operation keys / parts flags only.  
2. **Billing = DB hours × `shop_config.shop_rate`** (default Albany/Capital Region **$145.00**).  
3. **Fallback:** L0 exact → L1 pgvector weighted median → L2 chassis multiplier → estimated row.  
4. **Self-correction:** invoice closeout → EMA `telemetry_score` → promote `base_labor_hrs` after 5 samples.  
5. **Scraping:** `TFL_SCRAPER_MODE=fixture` by default (no live hits).

See [COST.md](./COST.md).
