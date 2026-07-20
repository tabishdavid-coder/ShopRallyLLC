# CLAUDE.md — ShopRally

Guidance for AI assistants (Claude Code / Cursor) working in this repo.
Read this and `PROJECT_SPEC.md` at the start of every session.

**Folder:** `ShopRally/` (this repo). Legacy `repairpilot/` is archived as `_archive-repairpilot/`.

---

## What this is
ShopRally — a cloud, multi-tenant shop-management CRM for auto repair shops
(Tekmetric-class). See `PROJECT_SPEC.md` for the full domain model and features.

## Stack
- **Framework:** Next.js 16 (App Router, Turbopack) + TypeScript (strict)
- **DB:** Postgres (Neon in prod, local Postgres in dev) via **Prisma**
- **API:** tRPC (type-safe, colocated routers)
- **UI:** Tailwind CSS v4 + shadcn/ui (**Radix** base — not Base UI); lucide icons
- **Package manager:** npm (Node v24.18.0 at `C:\Program Files\nodejs`)
- **Auth/Tenancy:** Clerk with **Organizations** (each Shop = one Org)
- **Payments:** Stripe
- **SMS:** Twilio
- **Background jobs:** Inngest
- **Hosting:** Vercel

## Cloud deployment

ShopRally is designed for **cloud-only production** (Vercel + Neon + Clerk + Inngest).
See **`docs/cloud-architecture.md`** for topology, env checklist, CI/CD migrations,
multi-tenant rules, file storage, and background-job plan.

- **App URL:** use `getAppUrl()` / `publicUrl()` from `src/lib/app-url.ts` — never
  hardcode `localhost:3000` in server code.
- **Uploads:** `src/server/services/cloud-storage.ts` (Vercel Blob stub).
- **Prod migrations:** `prisma migrate deploy`, not `db:push`.

## Conventions
- **Tenancy:** every model has `shopId`. Every query/mutation resolves the
  current shop from auth context and filters by it. Never trust a `shopId`
  passed from the client.
- **Money:** store as integer **cents**; never floats.
- **Money math & VIN/PartsTech:** wrap all external calls in a service class
  behind an interface (`VinService`, `PartsTechService`) so providers are
  swappable and the rest of the app only sees our own models.
- **Validation:** zod schemas shared between client and server.
- **Folder structure:**
  ```
  src/
    app/                 # Next.js routes (App Router)
    server/
      trpc/              # routers
      services/          # VinService, PartsTechService, etc.
    db/                  # prisma client, schema
    components/          # shared UI (shadcn-based)
    lib/                 # utils, auth helpers (useShop / getShopId)
  prisma/
    schema.prisma
    seed.ts
  ```
- **Secrets:** all in `.env` (never commit). Document required keys in
  `.env.example`.

## Environment / tooling status
- ✅ Node v24.18.0 + npm 11.16.0 installed (`C:\Program Files\nodejs`).
- ✅ Database: **Neon Postgres** connected (`DATABASE_URL` in `.env`). Migration
  `init` applied; seed loaded (352 customers + demo data).
- Run dev with `npm run dev` from `shoprally/` (http://localhost:3001).
- DB scripts: `npm run db:migrate | db:seed | db:studio | db:push`.
- Git is available. Repo not yet initialized.
- ⚠️ Project lives under OneDrive — if `node_modules` ops get slow/locked,
  relocate to e.g. `C:\dev\shoprally`.
- ⚠️ **CSS-cache gotcha (OneDrive):** turbopack's CSS cache in
  `node_modules/.cache` does NOT invalidate on `globals.css` edits here (stale
  theme tokens served even after restart). Fix: `rm -rf .next node_modules/.cache`
  then restart the dev server. `.tsx` HMR works fine; only CSS-token changes hit this.

## Visual design
- **Brand palette (updated 2026-06-28): dark blue + light blue + red** in `globals.css`.
  Tokens `--brand-navy: oklch(0.449 0.109 249)` (**#16588E dark blue**, the primary —
  token name kept as "brand-navy" so existing `bg-brand-navy` usages stay valid),
  `--brand-light: oklch(0.798 0.108 247)` (**#81C4FF light blue** accent), and
  `--brand-red: oklch(0.596 0.226 25.5)` (**#E7222E red**). Exposed as Tailwind
  utilities `bg-brand-navy` / `text-brand-light` / `border-brand-red` / `bg-brand-red/10`
  etc. via `@theme inline`. `--primary` = dark blue (all primary CTAs, active tabs/links),
  `--destructive` = red, `--ring` = dark blue, `--accent` = gentle light-blue hover wash,
  `--chart-3`/`--sidebar-ring` = light blue. **Sidebar = dark blue with a RED active state**
  (`--sidebar-primary` = brand red). `--radius: 0.4rem` (tight/enterprise).
  Sidebar header: ShopRally mark + wordmark (see `BRAND` / brand kit). Dashboard hero =
  navy→red gradient; KPI chips navy/red/green/amber.
  **Semantic colors kept** (NOT rebranded): inspection R/Y/G, status pills
  (In-Progress blue / Completed green), error red, money/payment green, the
  green "Add labor" + button in the labor guide. Charts: chart-1 navy, chart-2 red.
- ⚠️ If you change `globals.css` tokens, clear `.next` + `node_modules/.cache` and
  restart dev (OneDrive turbopack CSS-cache gotcha) or the old theme persists.
- NOTE: the preview-tool screenshot reliably hangs on the /customers route
  (Radix Select/Checkbox portals); the dashboard captures fine. App is verified
  via eval + curl, not screenshot. Open http://localhost:3000 in a real browser.

## Required env vars (fill as we build)
```
DATABASE_URL=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
PLATFORM_ADMIN_EMAIL=        # stub platform admin until Clerk (default platform@getshoprally.com)
VIN_PROVIDER_API_KEY=        # DataOne / VinAudit
PARTSTECH_API_KEY=           # partner credentials (apply early)
PARTSTECH_PARTNER_ID=
STRIPE_SECRET_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
# Inbound webhook: Twilio Console → Phone Number → Messaging →
#   https://YOUR_DOMAIN/api/webhooks/twilio/sms (HTTP POST)
INNGEST_EVENT_KEY=
```

---

## Current status
- ✅ Milestone 0 — Spec + CLAUDE.md + build plan written.
- ✅ Milestone 1 — Scaffold + app shell. Next.js + Tailwind + shadcn(Radix),
  sidebar nav, shop switcher, search bar, dashboard with KPI cards, and
  placeholder pages for every module. All routes return 200; typecheck clean.
  Tenant context is a **stub** (`src/lib/shop.ts`) — Clerk not yet wired.
- 🟡 Milestone 2 — Data model. Prisma 6 schema (all domains), client singleton
  (`src/db/client.ts`), and seed (`prisma/seed.ts`: 2 shops, 3 users, 3
  customers, 5 vehicles, 2 ROs, 1 invoice/inspection) all written & typecheck
  clean. **Pending:** a Neon `DATABASE_URL` to run `migrate dev` + `db:seed`.
  NOTE: Prisma pinned to **v6** (v7 dropped `url` in schema for a config+adapter
  setup that's thinly documented). Generated client → `src/generated/prisma`
  (gitignored); import via `@/generated/prisma`.
- ✅ Milestone 2 — Data model live on Neon (migration + seed applied).
- ✅ Milestone 3 — Customers list UI matching Tekmetric (toolbar: search /
  Tag / Bulk Edit / blue Add Customer; columns: checkbox / Customer (Last First,
  sorted) / Primary Phone / Email / Tag / Type; rows-per-page + pagination).
  Server query in `src/server/customers.ts`; client table in
  `src/components/customers/`. Seed imports the real 352-customer CSV
  (`prisma/data/customers.csv`) into shop "In & Out AutoHaus Garage" and attaches
  demo vehicles/ROs to two real customers (Tabish David, Mark Johnson).
  **Verified live:** /customers shows "1–10 of 352", sorted, search works.
- ✅ Sidebar expanded to full Tekmetric menu (grouped: top / Main / Manage /
  Admin) in `src/lib/nav.ts`; placeholder pages for stub routes.
- ✅ Job Board (`/job-board`) — 3-column kanban (Estimates / Work-In-Progress /
  Completed) of repair orders, search toolbar, RO cards (status pill, RO#,
  created-ago, customer+phone, vehicle, total, balance-due). Query in
  `src/server/job-board.ts`; components in `src/components/job-board/`. Seed now
  creates 20 ROs across statuses. **Verified live:** columns 8/5/7, search filters
  by customer/vehicle/RO#.
- ✅ Repair Order detail (`/repair-orders/[id]`) — read-only. Layout has header
  (RO# + "Cust's Year Make Model" + status), 5 tabs (Summary / Inspections /
  Estimate / Work-In-Progress / Payment), and right info sidebar (RO / Vehicle /
  Customer). Estimate tab renders jobs → labor + part lines with GP% / GP$ / GP/Hr
  and job/RO totals. Summary = activity feed; Inspections = red/yellow/green items;
  WIP = jobs+hours; Payment = invoice + payments. Query in
  `src/server/repair-order.ts`; components in `src/components/repair-order/`.
  Job Board cards now link to the RO. Seed gives every RO a job w/ labor+parts.
  **Verified live:** all 5 tabs 200; 7 completed ROs show invoices.
- ✅ FIRST WRITE PATH — Server Actions. `src/server/actions/customers.ts`
  (`createCustomer`: zod validate → prisma → `revalidatePath`). **Add Customer
  is functional**: dialog (`src/components/customers/add-customer-dialog.tsx`,
  Person/Business, name, phone+type, email, address, additional info) → persists
  to DB. Verified live (created + confirmed in DB + cleaned up). This is the
  pattern for all future writes (zod schema + action + dialog + router.refresh).
  zod installed; shadcn dialog + collapsible added.
- ✅ **RO Payment tab (Tekmetric parity v2, 2026-06-30)** — Payment tab restyled to match Tekmetric:
  2-col method cards (Cash/Credit/Check/Other/Store Credit w/ paid-in-full disable + helper),
  TRANSACTIONS | FAILED TRANSACTIONS table (Date/Name/Method/Info/Amount/Status/⋮) from live
  `Payment` records, green View & Share Invoice, red payment-received lines, balance due, Apply
  Discount, disabled Post Repair Order stub. Manual capture wired via `recordManualPayment`;
  Stripe checkout + refund guidance unchanged.
- `customerDisplayName` now prefers `company` for businesses.
- ✅ VIN decoder (Milestone 4) — `src/server/services/vin.ts`: `VinProvider`
  interface + NHTSA vPIC provider (swap for paid later). `decodeVin` action.
  Verified: `1HGCM82633A004352` → 2003 Honda Accord EX-V6, 3.0L 6-cyl, etc.
- ✅ Create-RO chain (FUNCTIONAL) — `/repair-orders/new`
  (`src/components/repair-order/create-ro-form.tsx`): customer search/add (reuses
  AddCustomerDialog w/ onCreated), vehicle select + **Add Vehicle modal w/ VIN
  decode** (`src/components/vehicles/add-vehicle-dialog.tsx` → createVehicle),
  odometer, appointment option, labor rate, concerns, marketing source →
  `createRepairOrder` (next RO#, ESTIMATE) → redirects to estimate. +Repair Order
  button wired. Verified end-to-end live (created RO #1021, all fields persisted).
  New actions: `actions/vehicles.ts`, `actions/repair-orders.ts`, `actions/pickers.ts`.
  Option lists in `src/lib/options.ts` (lead sources, appt options).
- Schema added to RepairOrder: laborRateCents, appointmentOption, marketingSource,
  concerns[]. Shop labor rate now $150 (15000) to match Tekmetric sample.
- ✅ Job Board **drag-and-drop** (@dnd-kit) — move ROs between Estimates/WIP/Completed
  and reorder within a column; each card has a ⋮ menu (Move / Approve / Send link).
  Board is now a client component (`components/job-board/job-board-dnd.tsx`); client-safe
  types/consts in `lib/job-board.ts` (never import prisma ROStatus value client-side).
- ✅ **Approval flow** (Tekmetric-style): shop "Approve & start work" OR customer
  approval via public token link (`/approve/[token]`, no auth, brand-themed) — on
  approval the RO auto-moves to WIP (`server/approval.ts` approveAndStartWork). Actions
  in `server/actions/job-board.ts` + `actions/approval.ts`. RepairOrder gained
  boardOrder, approvalToken(unique), approvalSentAt, approvedVia. Verified live end-to-end.
- ✅ **Estimate/invoice sharing** — email send (Resend live or mailto fallback),
  copy-link dialogs, public `/approve/[token]` + `/invoice/[token]` pages.
- ✅ **Two-way SMS (v1)** — Twilio outbound via `server/services/sms.ts` +
  `server/services/messaging.ts`; inbound webhook at
  `/api/webhooks/twilio/sms`; RO Messages dialog (`ro-messages.tsx`) with
  customer thread; estimate/invoice Text buttons enabled (`SMS_ENABLED` on by
  default, mock mode when Twilio env unset). Customer `marketingOptIn` surfaced
  as TCPA notice. Set `SMS_ENABLED=false` to disable.
- ⬜ Milestone 1b — Wire Clerk Organizations (needs Clerk keys).
- ✅ **Platform owner console (v2)** — Grouped sidebar IA (`PLATFORM_NAV_GROUPS`:
  Operations / Revenue / Compliance / System) shown only on `/platform/**` for platform
  admins. Shop users never see owner menus. Layout gate + `requirePlatformAdmin()`.
  Platform nav is growth/ops focused — no cross-shop end-customer views; owners remote
  into a shop CRM via Shops → Open shop CRM. New **Onboarding** pipeline (`/platform/onboarding`) with per-shop checklist; **System**
  stub (`/platform/system`). Breadcrumbs + platform context in shop switcher. **Shop onboarding compliance:** intake link
  (`/onboard/shop/[token]`), `PlatformAuditEvent` trail, MSA checkbox at intake/add-shop — see `docs/SHOP_ONBOARDING.md`.
- ✅ **Platform / master admin (v1)** — `Platform` model + `Shop.platformId` / `ShopStatus` /
  `User.isPlatformAdmin`. Stub auth via `PLATFORM_ADMIN_EMAIL` (`src/lib/platform.ts`).
  Master UI at `/platform` (shop list, KPIs, create/edit, enter shop). Shop switcher uses
  cookie `sr_active_shop` (legacy `rp_active_shop` still read) + lists all shops for platform admins. Seed: `platform_rp`,
  `platform@getshoprally.com` admin, 2 demo shops.
- ✅ **Platform subscription tiers (v1)** — `ShopPlan` (STARTER / PROFESSIONAL / ENTERPRISE),
  `BillingStatus`, `trialEndsAt`, optional `planFeatures` JSON. Plan catalog + `shopHasFeature()`
  in `src/lib/plans.ts`. Public `/pricing` page; platform admin assigns plan per shop;
  read-only Settings → Subscription. Stripe + usage enforcement deferred.
- ✅ **Service advisor on estimates/invoices** — `serviceAdvisor` on RO detail; shown on
  estimate tab, payment tab, public `/approve/[token]` + `/invoice/[token]`, and print views.
  New ROs auto-assign `serviceWriterId` (current user or shop's first service writer).
- ⬜ Next — make the Estimate EDITABLE (add/edit jobs, labor, parts; recompute
  totals via the markup matrices). Build Shop Settings (Markups: Parts/Labor
  matrices that drive pricing; Estimate/Invoice transparency; Appointments hours;
  Marketing lead sources — screenshots captured). Still UI-only: Sublet,
  payment-method capture, plate lookup (needs paid provider).
- ✅ **Platform owner scope (v3)** — Removed end-customer nav (`/platform/customers` →
  `/platform/shops`); overview is growth KPIs only; shop detail is tenant summary +
  “Open shop CRM”; shops table has Health column + prominent CRM button; onboarding
  checklist links (legal, billing, enter shop).
- ✅ **Estimate toolbar RO adjustments** — Discount and Fee buttons wired to
  `addDiscount` / `addFee` with dialogs + estimate action toasts.
- ✅ **Marketing Outreach + Automations (Tekmetric parity v1)** — Campaign sends via
  Inngest batched jobs (50/batch, 2000 cap); scheduled dispatch cron (15 min);
  `sendShopSms` + opt-out footer + email preference hint; `{review_link}` from Google
  Reviews; automation engine (RO completed, appointment book/update, declined
  inspection) with hourly runner; campaign open-rate MVP on detail page; automations
  Active/Paused + send history tab.
- ✅ **Win-back campaign page** — `/marketing/campaigns/winback`: dedicated Tekmetric/AutoLeap-style
 lapsed-customer flow (6/12/18+ mo presets, custom days, channel picker, offer field in
 audience JSON, `{last_service}` + `{offer}` merge fields, live preview + segment counts).
 Reuses `WIN_BACK` campaign type + `launchCampaign` / Inngest send pipeline.
- ✅ **RO detail Tekmetric/AutoLeap parity (v1)** — Summary: Create Appointment dialog
 (prefilled customer/vehicle/RO), + ADD ACTIVITY dialog (`RoActivity` model + migration).
 Inspections: template picker (no duplicate MPI tabs), progress bar, category sections.
 Estimate: Smart Jobs panel (concerns, approval banner, On estimate status), matrix
 pricing default ON with Matrix/Manual toggle, RO Fees gated by Settings → Shop Fees
 (`autoApply` sync removes inactive fees on load). **Tekmetric job card matrix UI (2026-06-30 v2):**
 green "Labor/Part matrix applied" pill **in Rate/Retail column** with embedded
 toggle-left (→ manual) + info tooltip (tier applied); manual mode shows rate/retail
 input + wand re-apply; parts Type column + 2×2 grid (OE+/PN/desc/details); edit header
 + ADD CANNED JOB | Cancel | Save; job-level Fees/Discounts tables + note textarea +
 footer Cancel/Save; ADD LABOR footer w/ Labor Guide + Maintenance Schedule stubs.
- ✅ **Estimate tab Tekmetric parity (v3, 2026-06-30)** — Jobs toolbar (Reorder/Reassign stubs,
 Collapse All wired); white job cards on slate panel; view-mode labor/parts tables always
 visible w/ green outline ADD LABOR/PART; matrix pills under Rate/Retail w/ toggle-left
 quick-save (view + edit); header job-total preview + Add Category stub; GP footer w/
 lock on Subtotal; RO Fees table (Name/Method/Calculate on/Amount); BUILD ESTIMATE scrolls
 to sticky totals bar (`estimate-build-button.tsx`).
- ✅ **Concern modals (Tekmetric parity, 2026-06-30)** — Customer Concern + Technician
 Concern dialogs on Smart Jobs panel (`customer-concern-dialog.tsx`,
 `technician-concern-dialog.tsx`): required fields, 2000-char counters, media drop zone
 (UI mock; blob upload deferred), tech `inspectionRating` (G/Y/R) on `Concern` model.
- ✅ **Dead-button audit (shop CRM)** — WIP edit/delete wired; customers Tag + Bulk Edit
 dialogs; job board Employee/Appt Type filters; share/print Transparency + Auth History
 links; delete estimate RO; sidebar collapse; global search → customers; coming-soon stubs
 disabled with titles (timeclock, RO labels, store credit, reorder jobs, etc.).
- ✅ **Link readability pass (2026-06-30)** — WCAG 4.5:1 link utilities in `globals.css`
 (`.link-subtle`, `.link-muted`, `.link-on-dark`); RO sidebar/estimate/payment/Smart Jobs
 hotspots bumped from `text-muted-foreground` / `text-brand-light` / `text-foreground/55`.

## Settings screenshots captured (not yet built)
- **Appointments:** day start/end time, default appt duration (mins).
- **Markups → Parts Matrix:** cost ranges → multiplier/markup (e.g. $0–4.99 = 4.00x/300%),
  auto-applied by part type; **Labor Matrix:** hours ranges → multiplier. THESE DRIVE
  ESTIMATE PRICING (part retail = cost × matrix multiplier).
- **Estimates/Invoices → Transparency:** per-field show/hide on estimate vs invoice.
- **Marketing → Lead Sources:** the marketing-source list (now hardcoded in options.ts).

## Next steps
1. Wire Clerk (M1b) once keys exist; replace stub in `src/lib/shop.ts`.
2. Run `prisma migrate deploy` for `RoActivity` + `AiUsageLog` + `Concern.inspectionRating`
3. Build customer detail page (M3b) once user sends the detail screenshot.
4. PartsTech: user has username/password; confirm API access at M7.

> Keep "Current status" and "Next steps" updated at the end of each work session.
