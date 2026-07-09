# Master CRM agent

Operator-facing **Master CRM** (`/platform/**`) — built **without modifying** ShopRallyCRM Dev `:3004` shop shell (`CrmShell`, `crm-header`, `(app)/layout.tsx` shop branch).

Merge guide: **`MERGE.md`**

## Quick start

1. Workspace: `shoprally/`
2. Branch: `feature/master-crm` (or work on this agent folder + platform files only)
3. Dev: `npm run dev` → http://localhost:3004/platform
4. New Cursor chat → paste `CONTINUE.md` + your task

## Scope (safe to edit)

| Area | Paths |
|------|--------|
| Master CRM routes | `src/app/(app)/platform/**` |
| Platform UI | `src/components/platform/**` |
| Routing helpers | `src/lib/platform-routing.ts` |
| Platform nav | `PLATFORM_NAV_GROUPS` in `src/lib/nav.ts` |
| Docs | `docs/MASTER-CRM.md`, `agents/MasterCRM/**` |

## Do NOT edit until merge (ShopRallyCRM DEV)

- `src/app/(app)/layout.tsx` (shop branch)
- `src/components/crm/**`
- `src/components/shop-context-banner.tsx` (wire `PlatformShopContextBar` at merge)
- `package.json` dev port / scripts
- `src/middleware.ts` (platform-admin default landing)
