# Data Compliance & Audit — build state

**Branch:** merged to `main` (2026-07-03)  
**Remote:** push `origin/main` from your machine (GitHub auth required)

## Status: complete (local + Neon)

| Phase | Status |
|-------|--------|
| 0–10 | done — see git history on `main` |

## Deployed (2026-07-03)

- All **56** Prisma migrations applied on Neon
- Orphan empty migration dirs removed (fixed `prisma migrate status` P3015)
- `npx tsx scripts/smoke-compliance.ts` — **PASS**
- `npx tsx scripts/smoke-seo-autopilot.ts` — **PASS**
- Dev server: http://localhost:3004

## Push to GitHub

```powershell
cd ShopRally
git push origin main
```

If you see `Repository not found`, sign in to GitHub (HTTPS credential manager or SSH remote).

## Optional follow-ups

- `SETTINGS_CHANGED` audit for shop profile / RO settings saves (low priority)
