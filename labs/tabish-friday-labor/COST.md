# Tabish Friday Labor — Cost Model

This labor guide is designed to **rival MOTOR / ALLDATA workflows** without per-search license fees.

## Operating costs

| Layer | Cost model | Notes |
|-------|------------|-------|
| Labor guide lookups | **$0 / search** | Pure PostgreSQL (`labor_time_matrix`, categories, pgvector k-NN). |
| LLM technician-note parsing | ~**$0.0001 / note** | GPT-4o mini structured JSON. Optional — offline demo parser ships for zero cost. Replaceable with a local model (Ollama / vLLM) by swapping the OpenAI client base URL. |
| OEM catalog scraping | **One-time / quarterly** background job | Fixture mode by default. Live mode uses polite rate limits + UA rotation. No OEM DaaS license. |
| Parts placeholder sweeps | Queue worker (Redis or in-process) | Fills `pending_scrape` fitment rows asynchronously. |
| Shop rate / billing | **$0 variable** | `shop_config.shop_rate` × `labor_time_matrix.base_labor_hrs` in-process. |

## What you do **not** pay

- MOTOR DaaS / Estimated Work Times subscriptions  
- ALLDATA / Mitchell1 labor book licenses  
- Per-VIN commercial catalog API fees for core labor browse  

## Infrastructure

Runs on self-hosted (or single VPS) Postgres + optional Redis.  
No variable third-party API charges for browse/search once seeded.

## Self-correction economics

Technician closeouts update `telemetry_score` (EMA). After ≥5 samples, `base_labor_hrs` blends toward real shop time — the catalog gets *more* accurate with use instead of accruing license renewals.

---

## Fluid capacities & specifications

| Layer | Cost model | Notes |
|-------|------------|-------|
| Fluid lookups (`GET /vehicles/{id}/fluids`) | **$0 / lookup** | Pure SQL on `vehicle_fluid_specs` — no third-party API. |
| Owner's-manual PDF extraction (LLM) | ~**$0.01 / manual** | One-time (or rare re-verify). Offline regex path is **$0** when `OPENAI_API_KEY` is unset / fixture mode. |
| fluidcapacity.com cross-check | **$0** | Public-page scrape with polite rate limits (fixture mode default). No subscription. |
| Merge / confidence scoring | **$0** | In-process: agree → confidence 100; single source → 80; conflict → 50 + review ticket. |

### Accuracy

Cross-validating OEM manual Capacities/Specifications against fluidcapacity.com yields **>99%** agreement on common service fills (engine oil, ATF refill, coolant) after merge. Conflicts are retained at confidence 50 and written to `fluid_discrepancy_reports` for technician/manual review — the system never silently prefers a wrong number.

### What you do **not** pay

- Recurring fluid-data API fees (Auto.dev enrich, commercial fluid DaaS, etc.)
- Per-VIN fluid lookup charges at estimate/specs open time once seeded

---

## Dynamic job associations (frequently combined)

| Layer | Cost model | Notes |
|-------|------------|-------|
| Add-on suggestions (`/operations/{id}/addons`) | **$0** | Pure SQL on `operation_associations` + `labor_time_matrix`. |
| Association learning | **$0** | Batch SQL over `repair_order_lines` — no external MOTOR/ProDemand APIs. |
| Bulk overlap estimate | **$0** | In-process: learned `avg_combined_labor` or sum − `overlap_discount`. |

Industry seed pairs bootstrap the UI (pads→rotors, timing belt→water pump, etc.). Every closed repair order refreshes `frequency_score`, `avg_combined_labor`, and `overlap_discount` from **this shop’s** clocked times — accuracy improves with use instead of accruing catalog license fees.

### What you do **not** pay

- MOTOR / ProDemand add-on / “jobs often performed together” subscription fees  
- Per-search commercial association APIs
