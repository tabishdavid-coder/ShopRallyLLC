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
