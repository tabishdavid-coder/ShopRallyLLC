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
├── sql/
│   └── schema.sql                 # §1 PostgreSQL DDL + pgvector
├── config/
│   └── settings.py
├── src/
│   ├── llm_parser.py              # §2 Intent middleware
│   ├── fallback_engine.py         # §3 Dynamic resolution + telemetry
│   ├── billing_calculator.py      # §4 Strict billing SoC
│   ├── oem_scraper.py             # §5 OEM scraper (fixture/live)
│   ├── normalize_taxonomy.py      # §5 Normalization
│   ├── labor_guide_api.py         # §6 FastAPI
│   ├── seed_taxonomy.py           # §7 Seeding
│   └── db.py
├── data/fixtures/                 # Offline OEM scrape fixtures
├── staging/                       # Scraped JSON landing zone
├── static/index.html              # Labor Guide UI (standalone)
└── scripts/smoke_offline.py
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
python -m src.labor_guide_api
# → http://127.0.0.1:8791/          (UI)
# → http://127.0.0.1:8791/docs      (OpenAPI)
```

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
