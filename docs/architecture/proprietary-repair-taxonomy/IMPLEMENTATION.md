# Implementation status — proprietary taxonomy

**Branch work:** application-layer engine (no live Prisma migration yet)  
**DDL source of truth:** [`sql/001_vehicle_taxonomy_fitment_schema.sql`](./sql/001_vehicle_taxonomy_fitment_schema.sql)

## Shipped in code

| Piece | Path |
|-------|------|
| Domain types / chassis multipliers / vector bands | `src/lib/proprietary-taxonomy/` |
| Unalterable billing (cents) | `src/lib/proprietary-taxonomy/billing.ts` |
| Intent zod normalize + allow-list gate | `src/lib/proprietary-taxonomy/intent-schema.ts` |
| Parts generic-category placeholder | `src/lib/proprietary-taxonomy/parts-placeholder.ts` |
| Labor resolve L0→L1→L2→L4 | `src/server/services/proprietary-taxonomy/labor-resolver.ts` |
| Quote pipeline (intent → labor + parts + bill) | `src/server/services/proprietary-taxonomy/quote-pipeline.ts` |
| Smoke test | `npm run test:proprietary-taxonomy` |
| Standalone lab mockup (no login) | `/lab/proprietary-taxonomy.html` |
| Design-review iframe shell | `/design-review/proprietary-taxonomy` |

## Not yet (next expand-only slice)

1. Prisma models + migration wrapping the SQL DDL (pgvector on Neon).
2. Postgres-backed `LaborResolverStore` / `PartsFitmentStore` adapters.
3. Release module + `canUseReleasedFeature` gate before any RO estimate write path.
4. Inngest worker for supplier scrape / account catalog sweep → `vehicle_part_fitment` cache.
5. Wire Python middleware as an optional sidecar or port structured-output call into existing AI labor path **without** letting it set hours/rates.

## Invariants (do not regress)

- LLM output → structure only (vehicle, operation keys, variant flags).
- Hours ← `labor_time_matrix` via resolver.
- Money ← shop regional rate × hours in integer cents.
- No change to Core estimate pricing write paths until release-flagged dual-path.
