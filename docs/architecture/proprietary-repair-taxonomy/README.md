# Proprietary Repair Taxonomy & Dynamic Parts Fitment

Production blueprint for a **self-generating**, commercial-API-independent automotive repair taxonomy and parts fitment architecture.

Start here: **[ARCHITECTURE.md](./ARCHITECTURE.md)** · implementation status: **[IMPLEMENTATION.md](./IMPLEMENTATION.md)**

**UI mockup (review — no login):** `/lab/proprietary-taxonomy.html`  
CRM shell iframe (optional): `/design-review/proprietary-taxonomy`

| Deliverable | Location |
|-------------|----------|
| 1. PostgreSQL DDL | [`sql/001_vehicle_taxonomy_fitment_schema.sql`](./sql/001_vehicle_taxonomy_fitment_schema.sql) |
| 2. LLM intent & fitment middleware | [`middleware/intent_fitment_parser.py`](./middleware/intent_fitment_parser.py) |
| 3–4. Resolution chain + pricing SoC | [`ARCHITECTURE.md`](./ARCHITECTURE.md) §§2–3 |
| App engine (TS) | `src/lib/proprietary-taxonomy/` + `src/server/services/proprietary-taxonomy/` |
| Smoke test | `npm run test:proprietary-taxonomy` |

**Prisma / prod migrations not applied yet** — DDL + TS engine only. See IMPLEMENTATION.md for the expand-only next slice.
