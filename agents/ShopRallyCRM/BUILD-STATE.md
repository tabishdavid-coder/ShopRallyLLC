# Dev 3031 — build state (ShopRallyCRM)

Last updated: 2026-07-18 (vehicle-spec AI memory)

> **Canonical dev:** **`ShopRally/`** folder only — `npm run dev` → :3031. See `docs/SHOPRALLY-DEV.md`.
> Do **not** develop shop CRM in the sibling `karvio/` folder (legacy platform fork).

## Active session — Macuto Core QA

**Tracking branch:** `cursor/core-plan-fidelity-5e7c` (docs + changelog; product gates land via focused PRs)  
**QA shop:** **Macuto Auto Repair** (`shop_macuto`, code **MAC**) — platform admin default tenant  
**Plan:** Core (`STARTER`) @ $49.99/mo · optional AI Plus add-on  
**On `main`:** phase-one rebrand, settings prune, estimate-toolbar / growth / Labor Book / payments / Auto.dev plate gates  
**Open Core gate PRs:** [#26](https://github.com/tabishdavid-coder/ShopRallyLLC/pull/26) PartsTech · [#27](https://github.com/tabishdavid-coder/ShopRallyLLC/pull/27) free-type YMM · [#29](https://github.com/tabishdavid-coder/ShopRallyLLC/pull/29) Finances tab  
**Track:** `docs/CORE-PLAN-FIDELITY.md` · `agents/ShopRallyCRM/CORE-PLAN-FIDELITY-CHANGELOG.md` · `src/lib/settings-plan-gates.ts`

### Quick open

```bash
git checkout main && git pull
npm run dev
# → http://localhost:3031 (Macuto Auto Repair)
```



## Done

- [x] **Vehicle spec UX + AI audit (2026-07-18)** — SnagIt frame analysis (Tekmetric C2451C6F ~13.6s fluids sidebar; AutoLeap E329F843 ~16.7s spec modal) + ShopRally capability matrix. Memory: `agents/ShopRallyCRM/VEHICLE-SPEC-AI-MEMORY.md`. No implementation yet; next = YMM→EPA catalog enrichment without VIN gate.
- [x] **Job Board redesign (2026-07-18)** — `/job-board` kanban cards/columns restyled for Tekmetric-inspired scan hierarchy (status pill, RO#, created-ago, customer+phone, vehicle, total) with ShopRally navy/light-blue/red chrome (left rail accent, no teal WIP). DnD, menus, search/filters, RO links preserved. Verify: http://localhost:3031/job-board
- [x] **Shop-owned email go-live path (2026-07-18)** — Product decision: **the shop owns their email** (From name / From address / Reply-to in Settings → Communications → Email). Platform Resend is transport only; Share + other CRM outbound use `sendShopEmail` with that identity. Doc: `docs/SHOP-EMAIL.md` (operator go-live checklist). Ready/Not-ready UX + Enable/test CTAs + Resend helper banner; `getShopEmailSendStatus` for share roles; provision + seed defaults (`emailEnabled` false until enable/test). **Local audit:** `RESEND_API_KEY` absent → mock/mailto; live DB demo shops have From fields null until Settings filled (seed defaults only apply on fresh seed). Deferred: DNS wizard, per-shop Resend keys, HTML templates, EmailSendLog.
- [x] **Maintenance Schedule hidden (2026-07-09)** — removed product UI entries from the estimate launcher and Labor Book job-card toolbar; no customer/shop-facing Maintenance Schedule stub remains.
- [x] **MOTOR-first labor pivot — AI parked (2026-07-09)** — reversed the no-license direction: **MOTOR sandbox/licensed catalog is now the primary Labor Book experience; AI first-principles generation is parked (default OFF)**. Changes:
  - **Env flags:** `MOTOR_SANDBOX_CACHE=true` serves locally-loaded MOTOR test data without live keys; `LABOR_AI_ENABLED` (new, default **false**) gates the AI-DRAFT generation path + "Estimate with AI" CTAs. New `isLaborAiEnabled()` / `motorCatalogDataAvailable()` in `labor-catalog-mode.ts`.
  - **Offline data loader:** `scripts/load-motor-sandbox.ts` (`npm run db:load-motor-sandbox`) ingests `prisma/data/motor-taxonomy-22124.json` → `MotorCatalogNode` and `motor-applications-22124-*.json` (`applications` array) → `MotorCatalogApplication`. Restores Civic BaseVehicleID 22124 (144 subgroups + brake-pad EWT rows) with no MOTOR contract.
  - **Sandbox vehicle resolve:** `motor-vehicle.ts` now maps YMM **2010 Honda Civic** → 22124 (plus the existing sandbox VIN) so demo vehicles resolve offline.
  - **Labor Book prefers MOTOR:** `getLaborBookMotorInit` builds the MOTOR tree + `catalogMode:"licensed"` display whenever MOTOR data is available (license OR sandbox), not just when licensed. `getLaborBookMotorApplications` serves MOTOR (BOOK) rows **before** shop cache; live-API auto-sync only fires when keys exist (`isMotorLaborEnabled()`).
  - **BOOK badges:** MOTOR grid rows carry `dataSource:"motor_ewt"` + `sourceLabel:"BOOK"` (adapter) so rows + cart lines show the BOOK tier.
  - **AI parked in resolver + UI:** `lookupLaborSuggestion` throws a friendly "AI drafts off" error before the AI fallback when `LABOR_AI_ENABLED` is off (MOTOR + shop-history still return first). `smart-labor-guide.tsx` hides the Generate button, Enter-to-generate, and empty-state "Estimate with AI" CTA when AI is off, and switches the search placeholder/empty copy to MOTOR-first guidance.
  - **Plan seam (lightweight):** added `motorLabor` PlanFeature (Core=false, Pro/Elite=true) + `subscription.ts` `FEATURE_MAP`; new `src/server/labor-entitlement.ts` (`motorEnabledForShop` / `laborCatalogModeForShop`) as the future per-shop gate. **Not yet wired into the resolver** — during the pivot MOTOR serves any shop when the platform env is on, so the demo shop is testable without Stripe billing.
  - **Remaining gaps:** live MOTOR keys (only sandbox 22124 has offline EWT rows — non-brake subgroups show empty until synced/loaded); per-shop `motorLabor` gate not enforced in resolver yet; quick-labor panel still surfaces the AI-off error rather than hiding its generate CTA; MOTOR-as-VIN-decode provider still unbuilt.
- [x] **Vendor flexibility audit (2026-07-09)** — read-only architecture review → `agents/ShopRallyCRM/VENDOR-FLEXIBILITY-AUDIT.md`. Verdict: dropping Auto.dev for MOTOR decode is safe (canonical Vehicle fields + `VinProvider`/`PlateLookupProvider` interfaces + optional `decodedData` cache). No code changed.
- [x] **PLAN: Tier-gated MOTOR labor data (2026-07-09)** — planning doc `agents/ShopRallyCRM/PLAN-TIER-LABOR-MOTOR.md`. MOTOR (BOOK) is upper-tier only (Pro/Elite); Core keeps shipped SHOP-history + AI-DRAFT lane. Core change: labor catalog mode is process-wide env today → add per-shop entitlement layer `motorEnabledForShop(shop) = isLicensedMotorCatalog() && shopHasFeature(shop,'motorLabor')`. Covers plan×feature matrix, UI/settings/onboarding branching, one platform MOTOR license (multi-tenant, shared cache, serve-time gate — no per-shop migration on up/downgrade), 7 engineering phases w/ acceptance criteria, billing invariants, MOTOR contract open questions. Not implemented; no deploy.
- [x] **Labor honesty + shop-history authority — no-MOTOR path (2026-07-09)** — implementing the no-license path from `LABOR-ESTIMATE-ALGORITHM.md` (T0 + T1-lite). **T0 honesty labels:** provenance tiers (`laborTierFromDataSource` in `labor-guide-helpers.ts`) → **BOOK** (motor_ewt) / **SHOP** (history + canned) / **AI-DRAFT · verify** (all `ai_*`); `smart-labor-guide.tsx` ResultRow + detail + cart badges use the tier, AI rows always say "verify", browse header shows "AI drafts — verify before quoting" (unlicensed) / MOTOR note (licensed), confidence no longer flattened to 0.5 on cache reads (`cachedRowToHit`), cart/companion lines carry `dataSource` so job badges keep provenance. **T1-lite shop history:** new `src/server/services/shop-history-labor.ts` mines `LaborLine.hours` for same shop + vehicle family (YMM→make/model) + same subcategory (+ axle), returns median when n≥3, labeled `shop_history`/SHOP with sample-scaled confidence; wired into `lookupLaborSuggestion` **above** `ai_first_principles` (below licensed MOTOR), preferred over cached AI drafts. **No floors** on the shop-history path (`labor-hours-calibration.ts` untouched/not expanded; still a transitional net behind AI-DRAFT only). MOTOR stays disabled; no deploy. Deferred: gold set, concurrent/additional-labor tables, clock-time (TimeLog), T2 calibration.
- [x] **Customer acknowledgment disclaimer (2026-07-09)** — shop-configurable estimate/invoice terms (`Shop.estimateTermsHtml` / `invoiceTermsHtml`) with platform defaults; shown on `/approve/[token]`, `/invoice/[token]`, print estimate/invoice/RO, Settings → Estimate Terms; share SMS/email copy mentions acknowledgment
- [x] **Customer-facing Karvio purge (2026-07-09)** — public approval, invoice, onboarding, inspection, deposit, booking, member portal, legal, shop-site, and plan surfaces now use ShopRally branding/powered-by copy instead of legacy Karvio/RP headers
- [x] **Industry-standard terms defaults (2026-07-09)** — estimate = authorize listed work / approx not final bill / re-approve extras / parts delays / payment on pickup / lien / road-test; invoice = final charges / due on pickup / lien+storage / warranty as stated; shops with saved custom HTML keep it until Settings reset
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
- [x] PartsTech shop username/API key stored in local `.env.local` only (do not document secrets)
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

## Labor taxonomy (active)

- [x] **Phase 0 audit** — `scripts/audit-labor-taxonomy-phase0.ts` (2026-07-09); findings in plan §6
- [x] **Companion coverage audit** — `scripts/audit-labor-companion-coverage.ts`; plan §7 T0/T1 map
- [x] **Additional Labor T0+T1 (2026-07-09)** — static graph `labor-companion-graph.ts` (pads→rotors, tie-rod/control-arm→alignment, pads→flush/caliper, strut→mount, bearing→hub, timing→water pump, serpentine→tensioner); resolve via `LaborOperation` + COMBO_RULES splits; Labor Book detail **Primary Labor** + **Additional Labor** (+ to staging). No MOTOR. Plan §9.
- [x] **AI labor hour floors bridge (2026-07-09)** — `labor-hours-calibration.ts` enforces conservative AI-only minimums on suggest/write and cache-read paths; wheel bearing/hub floor = 2.2 hr per corner so Labor Book variants show Front ≈2.2+ and Both ≈4.4+. Backfilled DB via `npm run db:apply-labor-floors -- --pattern=bearing`; use `npm run db:refresh-labor` when regenerating stale AI rows.
- [x] **AI book-time generation calibration (2026-07-09)** — prompt version `shoprally-v6-book-time-anchors` now asks for industry book time (not best-case elapsed time), includes vehicle/access factors and representative anchors for hubs, brakes, struts, timing/rack/HVAC. `suggestLaborJob` now retries once when an AI answer falls below internal floors so generated/cache rows trend toward real book-time hours before the safety floor is applied.
- [x] **Labor cache refresh CLI restored (2026-07-09)** — `scripts/refresh-labor-cache.ts` backs `npm run db:refresh-labor` again. Default mode refreshes stale prompt-version AI rows through the live `lookupLaborSuggestion()` path, so regenerated rows pick up v6 book-time prompt behavior, retry calibration, AI floors, VIN/YMM write-through, and companion-compatible cache shape. Useful flags: `--pattern=bearing`, `--limit=10`, `--all-ai`, `--older-than-days=180`, `--id=<laborOperationId>`, plus `DRY_RUN=1`.
- [ ] **Deferred labor accuracy depth** — true licensed concurrent/additional-labor tables and skill/condition-tiered book rows (standard vs difficult bearing, rust/AWD/access variants) are still future work. Current bridge is conservative prompt+floor calibration plus static companion ratios/splits, not a full MOTOR/ProDemand replacement.
- Living plan: `agents/ShopRallyCRM/LABOR-TAXONOMY-PLAN.md` (our-model SoT; MOTOR stays off)

## Strategy docs (Jul 2026 audit)

| Doc | Purpose |
|-----|---------|
| `agents/ShopRallyCRM/LABOR-TAXONOMY-PLAN.md` | Labor taxonomy + Additional Labor phased plan |
| `docs/COMPETITIVE-GAP-STRATEGY.md` | Master gap map + priorities |
| `docs/GROWTH-POSITIONING.md` | Sales/pricing copy pillars |
| `docs/SPRINT-ROADMAP-Q3-2026.md` | Sprint checklists |
| `docs/FORMS-HUB-TASK.md` | Forms Hub implementation spec |
| `docs/WEBSITE-CREATION-TASK.md` | ShopSite + work request → RO (conversion hub) |
| `docs/BATCH-07-ESTIMATE-LAB-MERGE.md` | Estimate lab → production merge |
