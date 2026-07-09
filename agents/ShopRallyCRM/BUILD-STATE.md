# Dev 3031 — build state (ShopRallyCRM)

Last updated: 2026-07-07 (canonical workspace + MOTOR sync from karvio)

> **Canonical dev:** **`ShopRally/`** folder only — `npm run dev` → :3031. See `docs/SHOPRALLY-DEV.md`.
> Do **not** develop shop CRM in the sibling `karvio/` folder (legacy platform fork).

## Done

- [x] **Canonical workspace declared (2026-07-07)** — ShopRally/ is the single source for Dev 3031 CRM; karvio/ marked legacy in AGENTS.md + SHOPRALLY-DEV.md
- [x] **MOTOR DaaS synced from karvio (2026-07-07)** — `src/server/services/motor/*`, labor-guide-catalog facade, labor-guide-resolver/audit, cache `motor_ewt` dataSource, `npm run test:motor`, `.env.example` MOTOR vars
- [x] **ro-intake-config DB fallback** — dev-safe fallback when Neon pool errors
- [x] **ShopRally rebrand — full pass (2026-07-06)** — brand-kit SVGs, `shoprally-theme.css`, Stripe Checkout colors, OG image, docs/agents, legacy asset cleanup; typecheck clean; login `/brand` `/dashboard` 200 on :3031
- [x] Kept ShopRally official palette (`shoprally-theme.css` + `globals.css`) and ShopRally branding
- [x] Wired new nav items: Shop Home (`/home`), Workflow (`/workflow`), Quick Labor (`/quick-labor`)
- [x] Dev 3031 port configured (`npm run dev` → :3031)
- [x] ShopRallyCRM agent docs in `agents/ShopRallyCRM/`
- [x] **RO intake form** — shared `ro-intake-form.tsx` with `CrmFormLayout`, intake checklist, slide-over (`RoIntakeProvider` + `CreateRoFab`), full-page `/repair-orders/new`
- [x] **RO phase stepper (3030 → 3004 port)** — 4-step phase nav: Overview → Estimate → Work in Progress → Payment; shared via `ro-phase-stepper.tsx` / `ro-phases.ts`
- [x] **Create vehicle (AutoLeap parity)** — comprehensive form after plate/VIN decode or Y/M/M pick
- [x] **Add Vehicle free-type YMM (2026-07-08)** — Make/Model/Trim are free text + datalist suggestions; trim chips after catalog match; no-match banner steers labor to VIN-first then normalized YMM; labor keys canonicalize model (`Accord Sedan` → `Accord`) with dual-read for legacy cache
- [x] **MOTOR sandbox disconnected (2026-07-08)** — `allowSandboxMotorDbCache()` now opt-in via `MOTOR_SANDBOX_CACHE=true` (default off). Reference Labor Book uses shop taxonomy + cache/AI only; skips BaseVehicleID resolution, MotorCatalogApplication overlay, and motor_ewt cache hits. Reconnect later with env flag or `LABOR_CATALOG_MODE=licensed`.
- [x] **3030 shell is default on 3004** — `AutopilotShell` (command rail + context panel + top bar); ShopRally logo in rail + mobile top bar; design mode stays on (`NEXT_PUBLIC_SHOPRALLY_DESIGN_MODE=1`)
- [x] **Estimate Building Lab right rail** — `/design-review/estimate-building`: fixed ~300px order summary panel (authorization counts, order status toggle, workflow placeholder, advisor/payment, quick actions, financial rollup) on live RO data; mobile sheet drawer; isolated from main estimate tab
- [x] **Competitive gap audit (Jul 2026)** — strategy docs in `docs/COMPETITIVE-GAP-STRATEGY.md`, sprint roadmap, Forms Hub spec, growth positioning

## Active shell files

- `src/app/(app)/layout.tsx` — `loadAppShell()` → `AutopilotShell` when `NEXT_PUBLIC_AP_SHELL=3030`
- `scripts/dev-3031.mjs` — canonical dev (`NEXT_PUBLIC_AP_SHELL=3030`, design mode off)
- `scripts/dev-3004.mjs` — legacy dev with design mode overlay
- `src/components/autopilot3030/shell/autopilot-shell.tsx` — command rail + context panel + module subnav
- `src/lib/autopilot3030/load-shell.ts` — shell switch by env flag
- `src/lib/autopilot3030/shell-variant.ts` — `isAutopilot3030Shell()`, `isIsolated3030Preview()`

## Shell selection

| Command | Port | Shell | Design mode | Preview banner |
|---------|------|-------|-------------|----------------|
| `npm run dev` | 3031 | AutopilotShell | Off | Off |
| `npm run dev:3004` | 3004 | AutopilotShell | On | Off |
| `npm run dev:3030` | 3030 | AutopilotShell | Off | On |
| Other dev (no AP flag) | — | CrmShell (legacy) | On | — |

## RO process (3004)

| Surface | Component | Notes |
|---------|-----------|-------|
| New RO (page) | `ro-intake-form.tsx` | `/repair-orders/new` |
| New RO (sheet) | `ro-intake-sheet.tsx` | FAB / job board / customer detail |
| RO workspace nav | `ro-phase-stepper.tsx` via `ro-tabs.tsx` | AP terminology (Service Ticket phases) |
| RO hero status | `ro-lifecycle-strip.tsx` | Intake → Quoted → In bay → Complete → Invoiced |
| Add vehicle | `add-vehicle-dialog.tsx` + `create-vehicle-form.tsx` | Two-phase: identify → comprehensive details |

## Sprint queue (competitive gap execution)

**Roadmap:** `docs/SPRINT-ROADMAP-Q3-2026.md`

### Sprint 1 — Estimate UX + consent (START HERE)

- [ ] **BATCH-07** Extract `EstimateWorkspace` shared shell — `docs/BATCH-07-ESTIMATE-LAB-MERGE.md`
- [ ] Merge right rail (auth counts, financial rollup) → `/repair-orders/[id]/estimate`
- [ ] Inline customer/RO fields + odometer hero bar on production estimate
- [ ] Audit consent on all public intake surfaces — `docs/FORMS-HUB-TASK.md` Phase 0
- [ ] Smoke-test dashboard + job board on :3031

### Sprint 2 — Forms Hub + ShopSite conversion

- [ ] **FORMS-HUB** Prisma `ShopForm` + work request submit → RO — `docs/FORMS-HUB-TASK.md`
- [ ] **WEBSITE-CREATION** `conversionSettings` + contact embed + Conversion tab — `docs/WEBSITE-CREATION-TASK.md`
- [ ] `PublicWorkRequestForm` + `ensureDefaultWorkRequestForm(shopId)`
- [ ] Staff UI `/marketing/forms`
- [ ] Platform launch checklist (booking OR work request required)

**Coordination:** Website Code agent owns ShopSite UI; ShopRallyCRM owns form backend. Do not split across sprints.

### Sprint 3 — Shop floor parity

- [x] PartsTech shop-aware provider (`getPartsTechForShop`) + live OAuth test on vendor page
- [x] Dev 3031 punchout return URL defaults (`APP_URL` / `getAppUrl` → :3031)
- [ ] PartsTech Partner ID from PartsTech onboarding (blocks live catalog)
- [ ] PO receive → inventory
- [ ] Inspection photo upload (Vercel Blob)
- [ ] Time clock MVP (replace placeholder)
- [ ] Clerk + RBAC — `docs/BATCH-06-CLERK-MERGE.md`

### Sprint 4 — GTM

- [ ] `/pricing` from `docs/GROWTH-POSITIONING.md`
- [ ] Declined inspection → automation UI polish

### Parked

- [ ] **API & developer platform** — `docs/API-PLATFORM-TASK.md`

## Form & UI queue (legacy)

1. ~~New Repair Order — `create-ro-form.tsx`~~ ✓
2. Add Customer / Add Vehicle dialogs — **vehicle comprehensive form ✓**; customer polish ongoing
3. Customer profile & edit
4. ~~Estimate / RO workspace tabs~~ → phase stepper ✓
5. Appointment booking
6. Shop settings sub-forms

## Preview URLs

- **Dev 3031 (canonical):** http://localhost:3031/dashboard/snapshot · http://localhost:3031/quick-labor · http://localhost:3031/job-board
- **Estimate Building Lab:** http://localhost:3031/design-review/estimate-building
- **Legacy Dev 3004 (design mode):** http://localhost:3004/dashboard (`npm run dev:3004`)
- **Isolated 3030 preview:** http://localhost:3030/dashboard (`npm run dev:3030`)

## Strategy docs (Jul 2026 audit)

| Doc | Purpose |
|-----|---------|
| `docs/COMPETITIVE-GAP-STRATEGY.md` | Master gap map + priorities |
| `docs/GROWTH-POSITIONING.md` | Sales/pricing copy pillars |
| `docs/SPRINT-ROADMAP-Q3-2026.md` | Sprint checklists |
| `docs/FORMS-HUB-TASK.md` | Forms Hub implementation spec |
| `docs/WEBSITE-CREATION-TASK.md` | ShopSite + work request → RO (conversion hub) |
| `docs/BATCH-07-ESTIMATE-LAB-MERGE.md` | Estimate lab → production merge |
