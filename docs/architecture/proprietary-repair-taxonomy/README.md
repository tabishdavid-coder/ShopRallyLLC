# Proprietary Repair Taxonomy & Dynamic Parts Fitment

Production blueprint for a **self-generating**, commercial-API-independent automotive repair taxonomy and parts fitment architecture.

Start here: **[ARCHITECTURE.md](./ARCHITECTURE.md)**

| Deliverable | Location |
|-------------|----------|
| 1. PostgreSQL DDL | [`sql/001_vehicle_taxonomy_fitment_schema.sql`](./sql/001_vehicle_taxonomy_fitment_schema.sql) |
| 2. LLM intent & fitment middleware | [`middleware/intent_fitment_parser.py`](./middleware/intent_fitment_parser.py) |
| 3–4. Resolution chain + pricing SoC | [`ARCHITECTURE.md`](./ARCHITECTURE.md) §§2–3 |
| Billing snippet (cents-safe) | [`snippets/secure_invoice_labor_total.ts`](./snippets/secure_invoice_labor_total.ts) |

**Not applied to live Prisma / prod migrations in this change** — design artifact only. Wire behind expand-only migration + release flag when implementing.
