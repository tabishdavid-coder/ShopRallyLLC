---
name: shoprally-crm
description: >-
  ShopRallyCRM Dev 3031 agent context — AutopilotShell, Tekmetric IA nav, jobs layout
  toggle. Use when working in shoprally/ on CRM pages, layout, nav, forms, or when the
  user mentions Dev 3031, ShopRallyCRM, or npm run dev.
---
# ShopRallyCRM (Dev 3031)

Read `agents/ShopRallyCRM/BUILD-STATE.md` and `docs/SHOPRALLY-DEV.md` for workspace + MOTOR setup.

## Active build

- **Folder:** `ShopRally/` (canonical — not sibling `karvio/`)
- **Port:** 3031 (`npm run dev`)
- **Shell:** `AutopilotShell` — Operations sidebar + top section nav (Customers, Schedule, Catalog, Shop Growth, Admin)
- **Nav:** `src/lib/autopilot3030/nav.ts` (`AP_OPERATIONS_NAV_ITEMS`, `AP_TOP_NAV_SECTIONS`)
- **Layout:** `src/app/(app)/layout.tsx` → `loadAppShell()` → `AutopilotShell`

## Key routes

- `/home`, `/dashboard/snapshot`, `/job-board`, `/workflow`, `/quick-labor`
- `/customers`, `/repair-orders/*`, `/settings`
- `/settings/estimates/workspace` — inline vs Tekmetric jobs layout toggle

## When adding features

1. Route in `src/app/(app)/`
2. Nav item in `src/lib/autopilot3030/nav.ts` (Operations block or top section)
3. Use `CrmPageHeader` / `CrmFormLayout` for forms
4. Keep ShopRally tokens from `shoprally-theme.css` / `globals.css`
5. Follow **Tekmetric legal rule**: `.cursor/rules/tekmetric-legal-differentiation.mdc` + `docs/CRM-AUDIT-TEKMETRIC-SAFE.md`

## Avoid

- Editing `_archive-repairpilot/`
- Developing shop CRM in sibling **`karvio/`** folder (legacy fork)
- Default chrome via legacy `CrmShell`
- Port 3001 unless user explicitly compares old shell
- Port 3004 unless user explicitly wants legacy design-mode dev
