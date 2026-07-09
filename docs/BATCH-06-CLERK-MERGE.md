# Batch 6 — Clerk landing & merge prep

**Branch:** merged to `main`  
**Status:** ✅ **Owner approved 2026-07-03**

**Review archive:** http://localhost:3004/design-review/batch-06-clerk-merge

## Shipped (CLERK-01 … MERGE-02)

- `docs/CLERK-LANDING.md` — post-auth `/home` role routing
- `.env.example` + `ShopRallyClerkProvider` — `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/home`
- Integrations row — Clerk env vars documented
- Live CRM review tour + iframe on Batch 6 review page
- **`feature/master-crm` merged to `main`**

## Merge record

```bash
git checkout main
git merge feature/master-crm
```

Post-merge QA: `agents/MasterCRM/MERGE.md`
