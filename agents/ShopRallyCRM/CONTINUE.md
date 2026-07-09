You are the **ShopRallyCRM** agent building **Dev 3031** in the `shoprally/` folder.

## What Dev 3031 is

Dev 3031 is the canonical ShopRally CRM build (`npm run dev`) that merges:
- **AutopilotShell** — Operations sidebar + top section nav (Customers, Schedule, Catalog, Shop Growth, Admin)
- **:3001 colors & features** — ShopRally official palette (`shoprally-theme.css`), ShopRally branding, and all ShopRally functionality
- **Test 3031 features (merged 2026-07-06)** — jobs layout toggle, Tekmetric IA nav, job board context actions, estimate workspace layout

Do NOT confuse with:

| Codename | What it is | Status |
|----------|------------|--------|
| **:3000 / RepairPilot** | Legacy app (`_archive-repairpilot/`) | Reference only — do not modify |
| **:3001 / ShopRally CRM shell** | Old chrome (`CrmShell`, header tabs) | Deprecated — `npm run dev:3001` for comparison only |
| **Dev 3004** | Legacy dev port with design mode overlay | `npm run dev:3004` — comparison only |
| **Dev 3031 / ShopRallyCRM** | Merged build in `shoprally/` | **Active — build here** |

## Project

- **Folder:** `shoprally/` (workspace root)
- **Dev URL:** http://localhost:3031
- **Start:** `npm run dev` or `npm run dev:3031`
- **Build state:** `agents/ShopRallyCRM/BUILD-STATE.md` — read and update as you work

## Locked layout (Dev 3031 chrome)

Default shop app chrome MUST use:

- `src/app/(app)/layout.tsx` → `loadAppShell()` → `AutopilotShell`
- `src/components/autopilot3030/shell/autopilot-shell.tsx` — persistent sidebar + top bar
- `src/components/autopilot3030/shell/ap-sidebar.tsx` — Operations block + contextual section subnav
- `src/components/autopilot3030/shell/ap-top-bar.tsx` + `ap-top-section-nav.tsx` — top section tabs
- `src/lib/autopilot3030/nav.ts` — `AP_OPERATIONS_NAV_ITEMS`, `AP_TOP_NAV_SECTIONS`, settings groups

Do NOT revert to legacy `AppSidebar`, `CrmShell`, or `CRM_NAV_SECTIONS` as default chrome without explicit user approval.

Platform routes (`/platform/**`) bypass the shop shell.

## Keep from :3001

**Colors / brand:** `src/app/globals.css`, `src/lib/brand.ts`, `ShopRallyLogo`

**Features (preserve and extend):**
- `/home` — Shop Home
- `/quick-labor` — Quick Labor
- `/workflow` — Workflow board
- All CRM server actions, Prisma models, job board, customers, RO workspace, marketing, platform admin
- `/settings/estimates/workspace` — inline vs Tekmetric jobs layout (shop setting)

**Page-level CRM primitives (inside pages, not shell):**
- `CrmPageHeader`, `CrmFormLayout`, `CrmFormSection` in `src/components/crm/`

## Navigation rules

When adding a new shop feature:
1. Create route under `src/app/(app)/`
2. Add to Operations sidebar or the appropriate top section in `src/lib/autopilot3030/nav.ts`
3. Update `apNavItemIsActive()` / section helpers if needed
4. Legacy `NAV_GROUPS` in `src/lib/nav.ts` is reference only — do not wire new routes there

## Competitive gap sprint (Jul 2026)

**Start here:** `agents/ShopRallyCRM/BUILD-STATE.md` sprint queue  
**Strategy:** `docs/COMPETITIVE-GAP-STRATEGY.md`  
**Sprint 1 (active):** `docs/BATCH-07-ESTIMATE-LAB-MERGE.md` — merge Estimate Lab → production RO  
**Sprint 2:** `docs/FORMS-HUB-TASK.md` + `docs/WEBSITE-CREATION-TASK.md` — work request → RO on ShopSite (both agents)  
**Sales copy:** `docs/GROWTH-POSITIONING.md`

Use shadcn + lucide only.

**Trade dress / Tekmetric legal:** STOP — do not audit or change UI here. Owner thread only; see `docs/TRADE-DRESS-AUDIT.md`. Implement HR items only after **`APPROVED HR-XX`**. Preserve current Dev 3031 front.

## Constraints

- Do NOT modify `_archive-repairpilot/`
- Do NOT run production builds or Vercel deploys unless asked
- Do NOT reintroduce `CrmShell` as default chrome
- Minimize scope — match existing `shoprally/` conventions
- Only commit when user asks
- Update `agents/ShopRallyCRM/BUILD-STATE.md` when completing meaningful milestones
- Keep **one browser tab** on :3031 — extra tabs exhaust the Neon DB pool

## Success criteria

- App runs on :3031 with AutopilotShell + Tekmetric IA nav
- ShopRally colors and logo intact
- New features appear in Operations sidebar or top section nav
- `/home`, `/quick-labor`, `/workflow` still work
- Jobs layout toggle works at Settings → Estimates → Estimate workspace

## Current task

[Paste your specific task here]
