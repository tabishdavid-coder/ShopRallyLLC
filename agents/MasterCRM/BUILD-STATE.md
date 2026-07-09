# Master CRM — build state

Last updated: 2026-07-03

**Branch:** `feature/master-crm` **merged to `main`** — Batches 1–6 approved 2026-07-03.

## Done (platform + shop CRM release)

- [x] **PlatformShell** — sidebar + top bar + content (`platform-shell.tsx`)
- [x] **TooltipProvider** fix — sidebar tooltips no longer 500 `/platform`
- [x] **PlatformSidebar** — `PLATFORM_NAV_GROUPS`, “Master CRM” branding
- [x] **PlatformTopBar** — title, breadcrumbs, enter-shop CTA
- [x] **Platform layout** — `platform/layout.tsx` wraps all `/platform/**`
- [x] **EnterShopCrmButton** — unified enter-shop across shops table, onboarding, shop detail, shell
- [x] **Deep link** — `/platform/enter?shop={id}` (server-side cookie + redirect)
- [x] **platform-routing.ts** — `MASTER_CRM_HOME`, `SHOP_CRM_HOME`, `defaultAppHome()`
- [x] **PlatformContextCard** — Master vs Shop explainer on overview
- [x] **PlatformOperatorShortcuts** — 8-tile hub on overview
- [x] **PlatformPageIntro** — shared page headers across modules
- [x] **Billing** — plan mix, ARR, canceled filter, Shop CRM actions per row
- [x] **Support** — Enter Shop CRM from ticket detail when shop linked
- [x] **Legal / Leads / Onboarding / Shops** — consistent Master CRM page intros
- [x] **Customer websites module** — `/platform/websites` build pipeline + upkeep
- [x] **Shop detail** — uses shared enter button; operator access log; customer website link
- [x] **Legal** — platform-wide operator Shop CRM access feed (`SHOP_CRM_ENTERED`)
- [x] **Overview** — customer websites KPI strip + pipeline alerts
- [x] **Default landing** — `/home` redirects platform admins to `/platform` via `appHomePath()`
- [x] **Clerk landing** — `docs/CLERK-LANDING.md`, env vars, `ShopRallyClerkProvider` → `/home`
- [x] **Release review** — Batch 4 platform tour, Batch 5 intake tour, Batch 6 merge prep
- [x] **Shop CRM batches 1–5** — trade dress, RBAC, RO workspace, intake (merged on branch)
- [x] **Merged to `main`** — 2026-07-03

## Merge queue

**Complete.** All Batches 1–6 on `feature/master-crm` merged to `main` (2026-07-03).

## Next

- Deploy from `main`
- Enable Clerk keys in production (`docs/CLERK-LANDING.md`)
- Tag release when ready

| Check | Expected |
|-------|----------|
| `/platform` | Master CRM sidebar, enter shop, release review archive |
| `/dashboard` (admin) | Operator banner + Master CRM link + create RO FAB |
| `/dashboard` (staff) | No platform chrome; RBAC tab gates |
| `/home` | Platform admin → `/platform`; shop staff → `/dashboard` |
| Non-admin `/platform` | Redirect to `/dashboard` |
