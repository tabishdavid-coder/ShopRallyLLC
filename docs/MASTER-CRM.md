# Master CRM vs Shop CRM

ShopRally is one app with **two shells** — not two codebases. You (the platform operator) manage the product; shop owners and staff run day-to-day operations inside their tenant.

## Mental model

| Shell | URL prefix | Who | Purpose |
|-------|------------|-----|---------|
| **Master CRM** | `/platform/**` | Platform admin (`isPlatformAdmin()`) | Shops, onboarding, billing, leads, legal, system |
| **Shop CRM** | Everything else (`/dashboard`, `/customers`, ROs, etc.) | Shop staff + you when “entered” | Customers, job board, estimates, payments |

Platform admins start at **Master CRM** (`/home` → `/platform` for operators; shop staff → `/dashboard`). Use **Enter shop** (sidebar footer or top bar) to open **Shop CRM** for the active tenant. After merge, the navy **Shop CRM** banner and header **Master CRM** link make context obvious.

## Navigation

- **Master CRM sidebar** — `PLATFORM_NAV_GROUPS` in `src/lib/nav.ts`, rendered by `PlatformSidebar`.
- **Shop CRM header** — section tabs from `CRM_HEADER_SECTIONS` in `src/lib/crm-nav.ts`, secondary nav in `CrmSecondaryNav`.

Do not mix platform nav into the shop shell or shop nav into the platform shell.

## Key files

| Piece | Path |
|-------|------|
| Master CRM layout | `src/app/(app)/platform/layout.tsx` |
| Master CRM shell | `src/components/platform/platform-shell.tsx` |
| Platform sidebar | `src/components/platform/platform-sidebar.tsx` |
| Shop CRM layout | `src/app/(app)/layout.tsx` |
| Shop CRM shell | `src/components/crm/crm-shell.tsx` |
| Operator shop context banner | `src/components/shop-context-banner.tsx` → `PlatformShopContextBar` |
| Enter / switch shop | `switchShop()` in `src/server/actions/platform.ts`, cookie `rp_active_shop` |
| Admin gate | `isPlatformAdmin()` in `src/lib/platform.ts` |
| **Customer websites** | `/platform/websites` — ShopSite build pipeline; `src/server/platform/websites.ts`, `src/lib/website-build-pipeline.ts` |

## Customer websites (ShopSite ops)

Master CRM module for **managed websites you build for shops** — separate from SEO Autopilot (`/platform/seo-automation`).

| Stage | Status |
|-------|--------|
| Intake | `NOT_STARTED`, `QUOTE_REQUESTED` (auto-set when shop submits build request) |
| Production | `IN_BUILD`, `CLIENT_REVIEW` |
| Live | `LAUNCHED`, `UPKEEP` (next review due + operator notes) |
| Hold | `PAUSED` |

- **List:** `/platform/websites` — filters, KPIs, open `WEBSITE_BUILD` tickets, **Start build** / **Shop CRM** / **Manage**
- **Detail:** `/platform/websites/[shopId]` — status, operator notes, launch, mark upkeep review
- **Public site:** `/sites/[slug]` when `published: true`
- **Shop-side editor:** Marketing → Website & SEO (after enter Shop CRM)


- **Stub:** `PLATFORM_ADMIN_EMAIL` env matches session user → platform admin.
- **Clerk (planned):** same flag on `User.isPlatformAdmin`; shop tenancy via Clerk Organizations.
- **Post-auth landing:** Clerk → `/home` → role-based redirect (`docs/CLERK-LANDING.md`).

Non–platform-admins hitting `/platform/**` are redirected to `/dashboard`.

## Operator workflow

1. Open **Master CRM** → `/platform` — growth KPIs, shop health, onboarding queue.
2. **Shops** → create shop, assign plan, open shop detail → **Open shop CRM** (sets active shop cookie).
3. Work in **Shop CRM** as that tenant (same UI a shop owner sees).
4. **Master CRM** in header or banner → back to operator view without losing the active shop cookie.

## What shop owners never see

- `/platform/**` routes and Master CRM sidebar
- Cross-shop lists (platform shops table, billing across tenants, platform leads inbox)
- “Master CRM” header link

## Solo operator note

You manage ShopRally yourself: one platform admin account, many shops. The split above is for **context switching**, not separate teams. Extend Master CRM first when adding deploy, billing, or compliance tooling.

## Isolated build (merge later)

Master CRM is developed **without modifying** ShopRallyCRM Dev `:3004` shop shell where possible. Operator Shop CRM compliance (banner, audit, header link) is now wired in the shared app layout — see **`docs/PLATFORM-ACCESS-COMPLIANCE.md`**.

- `agents/MasterCRM/MERGE.md`
- `agents/MasterCRM/patches/shop-crm-integration.md` (partially superseded by layout wiring)
