# Expand / contract migrations (production)

**Companion to:** [`PHASED-ROLLOUT.md`](./PHASED-ROLLOUT.md)  
**Commands:** local `npm run db:migrate` · prod `npm run db:deploy` (`prisma migrate deploy`)  
**Never in prod:** `prisma db push`

---

## Why

Live founding shops share one Neon database and one Vercel deployment. A destructive migration (drop/rename column) that ships with new app code can break every tenant at once. Expand/contract keeps **old and new code paths valid** against the same schema so release flags can roll back without reversing DDL.

---

## Checklist (required for every prod migration)

Copy into the PR description:

```markdown
### Migration hygiene
- [ ] Additive only (new table / nullable column / new index)? If no → split into expand then later contract.
- [ ] Existing rows remain valid without backfill? If no → backfill job or default documented.
- [ ] App code that *reads* the new shape is behind `isReleased` / dual-path with legacy default?
- [ ] No DROP / RENAME / NOT NULL without default in this same PR as behavior flip?
- [ ] `prisma migrate deploy` tested on Preview Neon branch?
- [ ] Rollback plan = flip release flag OFF (not `migrate down`)?
```

---

## Pattern

| Step | DB | App |
|------|----|-----|
| 1. Expand | Add nullable column / new table | Deploy; nothing reads it yet |
| 2. Dual-write | Unchanged | Writes old + new when flag ON; reads old |
| 3. Backfill | Populate new from old | Offline or Inngest job |
| 4. Ramp reads | Unchanged | Flag ON for pilots → all; read new |
| 5. Contract | Drop old column (later PR) | After soak; flag at 100% and old path deleted |

---

## Forbidden on `main` → production without a follow-up contract PR

- `DROP TABLE` / `DROP COLUMN` of live Core CRM fields
- Renaming columns used by estimate, RO, payment, customer, vehicle
- Adding `NOT NULL` without a server default and backfill
- Changing enum values that break existing Prisma clients mid-deploy

---

## Indexes

Prefer `CREATE INDEX` that does not lock writes longer than necessary on Neon. For large tables, document expected lock time in the PR.

---

## Related

- [`docs/cloud-architecture.md`](./cloud-architecture.md) — deploy topology  
- [`docs/platform-operations.md`](./platform-operations.md) — tenancy & plans  
