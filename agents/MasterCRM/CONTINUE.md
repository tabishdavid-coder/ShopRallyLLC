# Master CRM agent — CONTINUE

You are building **ShopRally Master CRM** — the operator console at `/platform/**`.

## Branch

**`feature/master-crm`** — continue here. **`main`** has the merged baseline; do not edit DEV shell on this branch unless the user asks to merge again.

## Rules

1. **Do not edit ShopRallyCRM DEV shell:**
   - `src/app/(app)/layout.tsx`
   - `src/components/crm/**`
   - `src/components/shop-context-banner.tsx`
   - `src/app/(app)/dashboard/**` (except platform enter flow testing)
   - `package.json` dev port
2. **Safe scope:** `src/app/(app)/platform/**`, `src/components/platform/**`, `src/lib/platform-routing.ts`, platform sections of `src/lib/nav.ts`, `docs/MASTER-CRM.md`, `agents/MasterCRM/**`
3. Preview: http://localhost:3004/platform (`npm run dev` on main — no shell edits needed)
4. **Master CRM** = operator; **Shop CRM** = tenant
5. Enter shop: `EnterShopCrmButton` or `/platform/enter?shop=` → `switchShop()`

## Build state

Read `agents/MasterCRM/BUILD-STATE.md` before starting.

## Current task

**Batch 4 approved & merged.** Active review: **Batch 5 Create RO intake** → `/design-review/batch-05-ro-intake`.
