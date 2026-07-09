# Estimate Building — BUILD STATE

**Agent:** Estimate Building (isolated lab)  
**Last updated:** 2026-07-05 (Job card blend v11)
**Preview URL:** http://localhost:3004/design-review/estimate-building?ro={id}

---

## Done (v1 lab)

- [x] Agent folder: `agents/EstimateBuilding/CONTINUE.md` + this file
- [x] Isolated route `/design-review/estimate-building` with RO picker (`?ro=`)
- [x] Link from Design Review hub
- [x] `EstimateBuildingLabPanel` — real RO data + `EstimateSelectionProvider` live totals
- [x] **Tekmetric launcher** (`EstimateJobLauncher`): Labor Guide, Canned Job, New Job, RO Fee, RO Discount (+ stubs: Maintenance Schedule, Sublet) — **icon+label tile grid** modal (ShopRally navy/light-blue)
- [x] **AutoLeap toolbar** (`EstimateLabToolbar`): search jobs & templates, Browse, + Add job
- [x] **SmartLaborGuide** + **RoAdjustmentToolbarButton** controlled `open` for launcher wiring
- [x] **Job card lab variant** (`variant="lab"`): auth badge (Pending approval / Authorized / Approved), Recommended toggle, Job total label, **view-mode line actions** (+ Add labor/part/fee/discount — navy outline; fee/discount wired via `RoAdjustmentToolbarButton` + `jobId`)
- [x] **Sticky totals bar** (`EstimateLiveTotalsBar`) with GP + **Review totals** + **Request deposit** (lab) + **Get approval**
- [x] **Jobs toolbar (lab)** (`EstimateJobsHeader variant="lab"`): Add category (stub), Reorder jobs (stub), Assign work (stub), Collapse all
- [x] **RO-level fees** via existing `EstimateRoAdjustments`
- [x] **Schema:** `Job.recommended Boolean @default(false)` + `setJobRecommended` action
- [x] Shared `revalidateEstimatePaths()` — lab refreshes after mutations
- [x] Main `/repair-orders/[id]/estimate` — **merged to lab UX** (2026-07-05, Batch 7) via `EstimateBuildingLabPanel variant="production"`

- [x] **Payment status menu** — design-mode preview only (Unpaid / Partial paid / Paid); no invoice writes

## Done (v9 — ShopRally estimate blend, 2026-07-05)

From SnagIt `7B6B4614-73E3-41B4-8567-EDD06481F234.MP4` — see [`SHOPRALLY-ESTIMATE-BLEND.md`](./SHOPRALLY-ESTIMATE-BLEND.md):

- [x] **`EstimateLabRoHeader`** — Shop notes (internal) + Recommendations for customer; Print / Send / Save
- [x] **`RepairOrder.customerRecommendations`** + `updateRepairOrderSidebar` field
- [x] **`EstimateLabWorkTabs`** — Concerns · Services · Inspections · Activity · Parts · Attachments
- [x] Concerns moved off Services banner into **Concerns** tab (`ServiceConcernsPanel` stacked)
- [x] **Services** tab — toolbar, jobs, RO adjustments, sticky totals bar
- [x] **Inspections / Activity / Parts** tabs — summary panels wired to existing flows
- [x] **Attachments** stub

## Done (v12 — aligned service grid + drag reorder, 2026-07-05)

- [x] **`EstimateLabServiceItemsGrid`** — unified Type | Description | Qty/Hrs | Cost | Retail | Total column grid; labor + parts share vertical alignment
- [x] **Line drag-and-drop** — reorder labor lines and part lines within a job via grip handles (@dnd-kit); order persists through debounced `saveJob`
- [x] **Job drag-and-drop** — `EstimateLabJobsDndList` + header grip on job cards; `reorderJobs` server action
- [x] **Schema** — `LaborLine.sortOrder` + `PartLine.sortOrder`; `saveJob` / add-line actions set order index

## Done (v11 — job card Tekmetric density + AutoLeap inline, 2026-07-05)

- [x] **`EstimateLabJobCardShell`** — lighter card chrome (no border-2)
- [x] **Debounced auto-save** — no Save button; Unsaved / Saving / Saved status
- [x] **Compact header** — grip, collapse, auth checkbox, inline name, ⋮ menu
- [x] **Tighter service items** — slim table headers, hidden duplicate Add Labor/Part rows (use ⋮ + footer segmented add)
- [x] **Compact internal notes** — single-line textarea

## Done (v10 — job estimate bridge, 2026-07-05)

From SnagIt `A52B9681-F826-43ED-8814-6FE999059BEA.MP4` — see [`JOB-ESTIMATE-BRIDGE.md`](./JOB-ESTIMATE-BRIDGE.md):

- [x] **Lab auto builder mode** — job cards open editable (no pencil-first) when `canEdit`
- [x] **`EstimateLabJobNotes`** — internal service notes under header; blur-save
- [x] **`EstimateLabJobMenu`** — ⋮ add labor/part, order parts, fee, discount, template, delete
- [x] **Service items** section label + GP/totals visible while editing in lab
- [x] **Save stays in builder** — lab does not exit edit mode after `saveJob`

## Done (v8 — service concerns inline edit, 2026-07-04)

- [x] **`ServiceConcernsPanel` `variant="lab"`** — removed + Customer / + Tech header buttons in estimate lab
- [x] **Clickable concern boxes** — empty state prompts ("Click to add customer concern" / "Click to add technician finding"); existing rows click to edit via existing dialogs
- [x] **Main estimate tab unchanged** — default variant keeps header add buttons + read-only list display

## Done (v7 — parts slide-over panel, 2026-07-04)

- [x] **`EstimateLabPartsMenu` v2** — centered dialog replaced with animated **Sheet** (right desktop / bottom mobile), dimmed backdrop, estimate visible behind
- [x] **Vendor rail (desktop)** — Source rail: PartsTech, Manual, Wholesale stub, Tire stub; mobile keeps card grid home step
- [x] **Job card header trigger** — lab **Parts** button beside Assign technician (same flow as **+ Add part**, job pre-selected)
- [x] **Docs:** [`PARTS-UX.md`](./PARTS-UX.md) — Tekmetric context + AutoLeap vendor rail rationale

## Done (v8 — parts pipeline + job assignment, 2026-07-05)

- [x] **Tekmetric + AutoLeap video analysis** — [`PARTS-JOB-ASSIGNMENT.md`](./PARTS-JOB-ASSIGNMENT.md)
- [x] **`buildHubParts`** + **`EstimateLabPartsPipeline`** — Needed / Quoted / Ordered tabs grouped by job
- [x] **Quoted tab** — per-line job reassignment (`reassignPartLineJob`) + submit order (`markPartsOrdered`)
- [x] **Phone order** in slide-over → `addPhoneOrderPart` (QUOTED, not NEEDED)
- [x] **Parts ordering tab** — compact pipeline + vendor buttons; slide-over home = full pipeline
- [x] **`hubParts`** wired through `EstimateLabPartsProvider` + lab panel

## Done (v6 — parts ordering menu, 2026-07-04)

- [x] **`EstimateLabPartsMenu`** — navy dialog with supplier cards (PartsTech, Manual ordering, Wholesale catalog stub, Tire wholesale stub)
- [x] **PartsTech path** — job picker, catalog search (`searchPartsTech`), punchout launch, multi-select import (`importMappedParts`)
- [x] **Manual ordering** — description / part # / qty / cost → `addPartLine` with matrix retail
- [x] **Triggers:** Order summary **Actions → Parts ordering**; job card **+ Add part** (lab) opens menu with job pre-selected
- [x] **`EstimateLabPartsProvider`** + `useEstimateLabParts()` — lab-isolated context
- [x] Integration badges from `getIntegrationStatus("partstech" | "weldon")`

## Done (v5 — order summary right rail, 2026-07-04)

- [x] **Blended right rail IA** — Tekmetric-first RO context + selective AutoLeap approval/totals; see [`RIGHT-RAIL-IA.md`](./RIGHT-RAIL-IA.md)
- [x] **4 accordion sections:** Repair order · Approval · Totals · Actions (collapsible, `ro-sidebar-accordion-*`)
- [x] **Removed AutoLeap clones:** Estimate|Invoice toggle, Workflow dropdown, Carfax/history toggle, Appointment quick action, 15-row financial ledger
- [x] **ShopRally labels:** Order summary panel, Pending approval / Approved / Declined, Balance due, Estimate phase chip
- [x] **Tekmetric estimate actions:** Send estimate + Print + Share estimate (ShareEstimateDialog wired)
- [x] **Actions:** Request deposit + Payment tab link (deposit dialog unchanged)
- [x] **Mobile sheet** — Order summary trigger preserved

## Done (v4 — Tekmetric button patterns, 2026-07-04)

- [x] **Launcher tile grid** — 7 icon+label tiles (2×3 / 3-col sm) with ShopRally navy borders; descriptions in `title` tooltip
- [x] **Job card lab footer** — view-mode + Add labor / + Add part / + Add fee / + Add discount (navy outline, not competitor green)
- [x] **`RoAdjustmentToolbarButton`** — optional `jobId` for job-level fee/discount; `outline-action` variant
- [x] **Sticky bar** — "Review totals" label (was "Review"); deposit button before Get approval
- [x] **Jobs header lab** — Add category, Reorder jobs, Assign work, Collapse all (stubs titled)
- [x] **Commercial safety** — no competitor names in UI; generic industry labels per `COMMERCIAL-SAFETY.md`

## Done (v3 — search + browse discovery)

- [x] **Toolbar typeahead** (`EstimateLabCannedSearch`) — filters/preview only; per-row **Add**; Enter adds highlighted row; double-click Add; no DB write on keystroke
- [x] **Browse breadcrumbs** (`EstimateLabCannedBrowseSheet`) — Category → Subcategory → Position → Operation drill-down (reuses `LABOR_CATEGORY_TREE` + `labor-nav-facets`); clickable path + back; per-row Add
- [x] **Shared picker fix** — `CannedJobPickerSheet` ignores Enter for 400ms after open (fixes toolbar Enter → instant add via bubbling); INPUT focus no longer triggers global Enter add
- [x] **`canned-job-browse-filter.ts`** — maps shop templates to labor browse path via `classifyOperation` + `applyBrowseFacets`

## Done (v2 — deposit request)

- [x] **Schema:** `DepositRequest` model + `DepositRequestStatus` enum
- [x] **Lab UI:** `EstimateLabLiveTotalsBar` — **Request deposit** on sticky bar (before Get approval)
- [x] **Modal:** `EstimateDepositRequestDialog` — amount, note, copy/email/text link, record in-shop payment
- [x] **Public page:** `/deposit/[token]` with Stripe Checkout (mock-friendly when keys unset)
- [x] **Server:** `createDepositRequest`, `sendDepositRequestLink`, `recordManualDepositPayment`, `startDepositCheckout`
- [x] **Stripe webhook:** `checkoutKind=estimate_deposit` → marks deposit PAID
- [x] **Audit:** `DEPOSIT_REQUEST_CREATED`, `DEPOSIT_REQUEST_SENT`, `DEPOSIT_PAID`

## Functional test flow

1. Open http://localhost:3004/design-review/estimate-building
2. Pick an estimate RO from dropdown (or add `?ro={cuid}`)
3. **+ Add job** or launcher tile → Add New Job / Labor Guide / Canned Job
4. Job card **+ Add labor/part** (view mode) or pencil edit → Save → persists to DB
5. Job card **+ Add fee/discount** → job-scoped adjustment dialog
5. Sticky bar updates labor/parts/fees/tax/total + GP%
6. RO Fee via launcher → Card Fee % appears in adjustments table
7. Toggle **Recommended** on job footer (lab variant)
8. **Get approval** opens authorize dialog
9. **Request deposit** on sticky bar → amount + optional note → copy / email / text link
10. **Record in-shop** deposit (cash/check) or open `/deposit/{token}` for customer pay page
11. Sticky bar shows **Deposit pending** or **Deposit received** badge
12. **Order summary** right rail — Repair order / Approval / Totals / Actions accordions; Send estimate + Print from Actions
13. **Parts ordering** — Needed/Quoted/Ordered pipeline on Parts tab + slide-over home; phone/PartsTech → Quoted; reassign job on Quoted; submit → Ordered

## Sample RO ids

Run against seeded shop "In & Out AutoHaus Garage" — pick any **Estimate** column RO from job board, or use RO numbers ~1001+ from seed. The picker lists the 40 most recent estimate/WIP ROs.

To resolve an id quickly:

```bash
npx prisma studio
# RepairOrder table → copy id where status = ESTIMATE
```

Or from job board: click RO → URL `/repair-orders/{id}` → use that id in `?ro=`.

## Gaps / stubs remaining

| Item | Status |
|------|--------|
| Maintenance Schedule picker | Stub in launcher |
| Add Sublet | Stub in launcher |
| Labor guide button inside job card edit row | Still "coming soon" on main card |
| Job card view-mode line actions | Lab variant only (`variant="lab"`) |
| Canned service source tabs (MOTOR/Internal/Deferred) | Single shop library picker only |
| Labor guide breadcrumb browse in lab Browse modal | Done (v3) |
| Toolbar inline search auto-add on type | Fixed (v3) — explicit Add only |
| Parts ordering vendor cards tab | **Done v7** — slide-over panel + vendor rail (`PARTS-UX.md`) |
| Drag-reorder jobs on lab | **Done v12** — grip on job header + `reorderJobs` |
| Drag-reorder labor/part lines in lab | **Done v12** — grip per line; order via `saveJob` sortOrder |
| Merge lab toolbar into main estimate tab | Pending approval |
| `Job.recommended` on main estimate (non-lab variant) | Hidden unless `variant="lab"` |
| Prisma migration file | `db:push` or `migrate dev` required after pull |
| Apply paid deposits to invoice balance at RO completion | Future merge item |

## Deposit request — merge notes

When merging to main estimate tab:

1. Swap `EstimateLiveTotalsBar` for `EstimateLabLiveTotalsBar` (or pass deposit `beforeApproveAction`).
2. Fetch `getDepositRequestForRo` on estimate page server component.
3. Show deposit status on Payment tab sidebar (paid-to-date / remaining balance).
4. At invoice creation, credit `DepositRequest` amounts paid against `balanceCents`.

## Feature ideas (AutoLeap video FA2ED0E7, Jul 2026)

From SnagIt `FA2ED0E7-7F18-4096-825E-F808F7B67E57.MP4` — backlog items **not** in v5 right rail (see [`RIGHT-RAIL-IA.md`](./RIGHT-RAIL-IA.md)):

- ~~**RO header notes:** Shop notes (internal) + Recommendations for customer text areas above job list~~ → **Done v9** (`EstimateLabRoHeader`)
- ~~**Authorization sidebar:** Pending/Approved/Deferred/Declined counts + Authorize CTA~~ → **Done v5** (3 ShopRally labels, accordion)
- ~~**Estimate ↔ Invoice toggle** + Workflow Status dropdown on RO sidebar~~ → **Removed v5** (future RO settings)
- ~~**Carfax Reporting** toggle per RO~~ → **Removed v5**
- ~~**Granular financial rollup** (15 lines)~~ → **Totals v5** (6–8 lines max)
- ~~**Payment status** + Appointment / Payment quick actions in sidebar~~ → **Partial v5** (payment badge + Payment link; no Appointment)
- **In-RO vehicle create:** plate/LP lookup → VIN decode → full vehicle form (engine/trans/drive, customer-facing vehicle name, tags)
- **Vehicle swap on RO:** confirm dialog warning pricing mismatch when changing vehicle mid-estimate; GP recalculates on swap
- **Unsaved-changes guard:** modal when leaving edited panel without save
- **Customer vehicle sidebar:** Vehicles tab w/ Decode, Carfax History, Deferred tab, + Estimate / + Appointment shortcuts
- **Browse tooltip copy:** MOTOR + Mitchell source hint on Browse button

## Merge to main estimate tab

When user approves:

1. **Toolbar:** Replace or augment `RoEstimateHeroToolbar` on `/repair-orders/[id]/estimate` with `EstimateLabToolbar` + `EstimateJobLauncher` (or merge into one component).
2. **Job cards:** Pass `variant="lab"` to `EstimateJobsList` on main estimate page (or make lab UX the default).
3. **Totals:** Ensure `EstimateLiveTotalsBar` stays sticky on main estimate (already on estimate page).
4. **Revalidate:** Keep `revalidateEstimatePaths` — remove lab-only path if lab route retired.
5. **Route:** Retire `/design-review/estimate-building` or keep as archive link.
6. **Schema:** Deploy `Job.recommended` + `DepositRequest` migration to prod Neon.
7. **QA:** Full E2E on main tab — launcher, matrix pills, fees, authorize, deposit, customer link.

## Files touched (v1 + v2)

- `prisma/schema.prisma` — `Job.recommended`, `DepositRequest`
- `src/lib/estimate-revalidate.ts`
- `src/server/estimate-building-lab.ts`
- `src/server/actions/estimate.ts` — `setJobRecommended`, revalidate helper
- `src/server/actions/adjustments.ts`, `labor-guide.ts`, `canned-jobs.ts` — revalidate helper
- `src/components/estimate-building/*` (incl. deposit dialog, lab totals bar, canned search + browse sheet, **estimate-lab-right-rail**, **estimate-lab-parts-menu** + provider + jobs bridge)
- `src/lib/canned-job-browse-filter.ts`
- `src/components/deposit/pay-deposit-button.tsx`
- `src/app/deposit/[token]/page.tsx`
- `src/server/deposit-request.ts`, `src/server/services/stripe-deposit.ts`
- `src/server/actions/deposit-request.ts`
- `src/components/repair-order/estimate-job-card.tsx` — lab variant + line action footer
- `src/components/repair-order/estimate-jobs-header.tsx` — lab toolbar buttons
- `src/components/repair-order/estimate-jobs-list.tsx` — passes variant to header
- `src/components/repair-order/estimate-totals-bar.tsx` — Review totals label
- `src/components/repair-order/ro-adjustment-toolbar-button.tsx` — jobId + outline-action
- `src/components/repair-order/estimate-jobs-list.tsx` — variant prop
- `src/components/repair-order/smart-labor-guide.tsx` — controlled open
- `src/components/repair-order/ro-adjustment-toolbar-button.tsx` — controlled open
- `src/app/(app)/design-review/estimate-building/page.tsx`
- `src/app/(app)/design-review/page.tsx` — hub link
- `agents/EstimateBuilding/CONTINUE.md`, `BUILD-STATE.md`
