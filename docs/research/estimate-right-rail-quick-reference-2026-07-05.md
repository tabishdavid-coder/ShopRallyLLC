# Estimate Right Rail — Quick Reference Research

**Date:** 2026-07-05  
**Context:** Empty whitespace below Profitability accordion (Billable hrs / Labor rate) in `EstimateLabRightRail` (~300px desktop aside). User circled the flex-grow gap in Dev 3004 estimate builder.  
**Goal:** Competitor-informed widgets that add at-a-glance RO context **without duplicating** ShopRally surfaces already visible in the lab layout.

---

## 1. ShopRally audit — what the right rail already shows

**Component:** `src/components/estimate-building/estimate-lab-right-rail.tsx`  
**Live wrapper:** `EstimateLabRightRailLive` (same file)  
**Wired from:** `src/components/estimate-building/estimate-building-lab-panel.tsx`

### Right rail (desktop aside + mobile “Order summary” sheet)

| Zone | Content | Notes |
|---|---|---|
| **Header strip** | Customer display name, RO `#`, payment status badge/menu | `PaymentStatusStrip` + `EstimateLabPaymentStatusMenu` (design-mode preview when editable) |
| **Approval strip** | Pending / Approved / Declined job counts + 1px stacked progress bar | Aggregate only; per-job badges live on job cards |
| **Actions grid** | Send estimate, Print, Deposit (status chip), Pay (link to payment tab) | Deposit dialog shared with sticky bar |
| **Profitability** *(jobs exist)* | GP $, GP %, GP/hr (+ goal footnote), labor margin, parts margin, total revenue, billable hrs, effective labor rate | Replaces Totals section when `profitability` prop set |
| **Totals** *(no jobs)* | Labor, parts, fees, discounts, tax, estimate total, deposit, paid, balance due | Hidden when profitability is shown |

### Related estimate workspace — **not** in right rail (dedup targets)

| Surface | Location | Already shows |
|---|---|---|
| **Sticky totals bar** | Bottom of Services tab (`EstimateLabLiveTotalsBar` → `EstimateTotalsBar`) | Labor, parts, fees, discounts, subtotal, tax, total, compact GP $/%, Get approval, Request deposit |
| **Context header** | Main column top (`EstimateLabContextHeader`) | RO #, phase badge, service advisor select (lab), inline customer/vehicle fields, customer drawer trigger |
| **Odometer hero** | Below context header (`EstimateLabOdometerBar`) | Mileage in/out, N/W checkbox — inline blur-save |
| **RO notes** | `EstimateLabRoHeader` | Shop notes + customer recommendations text areas |
| **Job cards** | Services tab | Per-job auth badge, technician assign, matrix/GP footer, parts/labor lines |
| **Concerns / Inspections / Activity / Parts / Attachments** | Work tabs | Domain-specific panels |
| **Customer context drawer** | Slide-over from header (`EstimateLabContextDrawer`) | Profile, vehicles, deferred jobs, RO history, finances, upcoming appointments, quick actions |
| **Approval send bar** | Production estimate tab when unsent | Send estimate CTA |
| **Smart Jobs / concerns** | Concerns tab | Customer + technician concerns |

### IA doc vs current code gaps

`agents/EstimateBuilding/RIGHT-RAIL-IA.md` (v5) still lists **Advisor & payment** and **Parts ordering** in Actions; current code shows payment badge in header strip but **no dedicated advisor row** and **no Parts action** in the 4-button grid. Service advisor lives in the lab context header instead.

### Why the empty gap exists

The aside is a full-height `flex-col` column; Profitability + Actions do not grow. Remaining viewport height renders as blank white space (often labeled generically in devtools). This research targets that **flex-grow region** below Billable hrs / Labor rate.

---

## 2. Competitor quick-reference patterns

Research sources: Tekmetric support/docs, Shopmonkey help center, AutoLeap API + product pages, SnagIt frame notes in ShopRally agent rules (AutoLeap RO #10246, Tekmetric RO #497).

### Tekmetric (gray RO sidebar + job board signals)

Distinct quick-reference items **not already in ShopRally right rail:**

1. **Workflow status chip** — column-aware statuses (Requires authorization, Pending, Declined, Not started, X of Y hours) with one-click Quick Actions on cards and in-sidebar updates.
2. **Promised / time-in / time-out** — pickup promise and clock fields editable from sidebar (FAQ: adjust time in/out in grey sidebar).
3. **Estimate outreach signals** — job board cards show sent (paper plane) vs customer viewed (eye) icons.
4. **RO requirement warnings** — missing tech on labor, job category, odometer, etc. surfaced as warning icons when Advanced Settings require them.
5. **Key tag / save-parts / marketing source** — operational metadata on RO info panel (sidebar pencil edits).

*Already covered in ShopRally elsewhere:* customer/vehicle/VIN (context header + drawer), odometer (hero bar), service writer (header select), authorization (rail strip + sticky Get approval), GP (rail profitability + sticky bar).

### AutoLeap (Services tab right sidebar — RO #10246 reference)

Distinct items **not in ShopRally right rail:**

1. **Order status toggle** — Estimate vs Invoice phase on sidebar (workflow phase, not payment).
2. **Workflow status dropdown** — shop pipeline state separate from RO status enum.
3. **Authorizations widget detail** — Pending / Approved / Deferred / Declined counts **plus + Authorize** (ShopRally has counts only; Authorize is on sticky bar).
4. **Granular financial rollup** — Parts+Labor+Tire+Other, service-level fees/discounts, RO fees, tax, paid, remaining (ShopRally sticky bar covers revenue; rail profitability covers GP — not this full ledger in sidebar).
5. **Carfax reporting toggle** — per-RO opt-in for history reporting.
6. **+ Appointment / + Payment** shortcuts in sidebar action stack.

*Already covered:* payment status (rail header), service advisor (context header), deposit (actions + sticky), authorization counts (rail strip).

### Shopmonkey (Order tab + Vehicle tab on right panel)

Distinct items **not in ShopRally right rail:**

1. **Order checklist progress** — required/optional completion meter before estimate → RO/invoice conversion (auth, assignments, categories, mileage, etc.).
2. **Assignment summary** — “X assignments still needed” with service writer + per-labor tech rollup in panel header area.
3. **Due date** — prominent on workflow cards and order detail (mobile: Due Date field).
4. **Payment terms** — fleet/customer net-30 (or custom) shown on Order tab; overridable per order.
5. **Vehicle tab quick specs** — fluids/filters/battery/recalls (ALLDATA/CARFAX) without leaving the order.

*Already covered:* authorization status on workflow cards (similar to ShopRally approval strip), vehicle identity (header/drawer not rail).

---

## 3. Prioritized widget recommendations

Scoring: **P0** = high advisor value, data exists or trivial query, clear competitor precedent, no dedup conflict. **P1** = strong but needs small UI/API work. **P2** = valuable but heavier or drawer-adjacent.

| Priority | Widget | Why (competitor) | ShopRally data source | Dedup check |
|---|---|---|---|---|
| **P0** | **Workflow & promise snapshot** — RO age, promised pickup time, estimate sent/viewed/authorized timestamps | Tekmetric promise/time-in-out sidebar; Tekmetric sent/viewed icons; AutoLeap workflowStatus | `RepairOrder.createdAt`, `promiseTime`, `approvalSentAt`, `estimateViewedAt`, `authorizedAt`, `approvedVia` | RO #/status in header; auth counts in strip — this is **timeline/outreach**, not duplicate |
| **P0** | **Parts pipeline rollup** — Needed / Quoted / Ordered counts (+ link to Parts tab) | Shopmonkey Parts & Tires workflow view; Tekmetric parts-order warnings | `PartLine.status` (`NEEDED`, `QUOTED`, `ORDERED`) via `getRepairOrder` → `jobs.partLines`; `PurchaseOrder` for PO count | Parts lines on job cards; Parts tab detail — **aggregate only** |
| **P0** | **Assignment gaps** — RO tech + “N jobs unassigned” | Shopmonkey assignment summary; Tekmetric “tech on labor” warnings | `RepairOrder.technicianId`, `Job.technicianId`, resolved names in `getRepairOrder` | Per-job assign on cards — **summary gap count** is new |
| **P1** | **Next appointment chip** — next scheduled start for customer/vehicle | AutoLeap + Appointment sidebar actions | `Appointment` where `customerId`/`vehicleId` and `startAt >= now` — today via `loadEstimateContextDrawerData` | Drawer lists appointments — **one-line next-up** in rail is acceptable if drawer remains full list |
| **P1** | **Vehicle last visit** — days since last completed RO on this vehicle | Shopmonkey/CARFAX history context; win-back campaigns | `getVehicleHistory()` → most recent `history[].date` | Drawer/history tabs — single **“Last in shop”** line is quick-ref |
| **P1** | **Operational flags row** — key tag, save parts, marketing source, SMS opt-in | Tekmetric sidebar metadata; TCPA for SMS | `RepairOrder.keyTag`, `saveParts`, `marketingSource`; `Customer.marketingOptIn` | Tags/notes in drawer — **compact chips** only |
| **P2** | **Order checklist / readiness meter** — % complete for post settings (odometer, auth, assignments, categories) | Shopmonkey Order Checklist | Derive from shop `RoAdvancedSettings` + RO/job/part fields | Overlaps warnings if we add full checklist modals later |
| **P2** | **Inspection progress mini-bar** — rated/total MPI items | Tekmetric DVI progress | `Inspection` + `inspectionProgress()` already used in inspections tab | Inspections tab owns detail — mini summary OK |
| **P2** | **Payment terms / fleet account** | Shopmonkey Payment Terms | No first-class `PaymentTerm` on Customer yet — would need schema | Finances tab in drawer partial |

### Explicitly **do not** add to this rail gap

- Duplicate revenue lines (sticky bar + Totals accordion rule)
- Customer name, phone, vehicle YMM, VIN, mileage (context header + odometer bar)
- Full GP block again (profitability accordion + sticky GP)
- Get approval / Authorize CTA (sticky bar)
- Service advisor editor (context header — optional read-only echo only if advisor row returns to rail)
- Estimate \| Invoice toggle or Carfax toggle (commercial safety / RIGHT-RAIL-IA backlog)

---

## 4. Recommended fill order (implementation)

1. **P0 bundle** — single “Quick reference” accordion filling `flex-1` below Profitability:
   - Workflow & promise (3–4 rows)
   - Parts pipeline (3 counts)
   - Assignments (1–2 rows)
2. **P1** — append rows or second collapsible: Next appointment, Last visit, Flags
3. **P2** — checklist meter after shop settings API is stable

---

## 5. Stub implementation (2026-07-05)

Added read-only placeholder: `EstimateLabQuickReference` in `estimate-lab-quick-reference.tsx`, rendered at the bottom of the aside with `flex-1` so it occupies the empty gap. Uses live `getRepairOrder` fields passed from `estimate-building-lab-panel.tsx`:

- Workflow & outreach (created, promise, sent, viewed, authorized)
- Parts needed / quoted / ordered
- Technician + unassigned job count

No new server queries in the stub. Appointments and last-visit deferred to P1.

---

## References

- ShopRally: `estimate-lab-right-rail.tsx`, `agents/EstimateBuilding/RIGHT-RAIL-IA.md`
- Tekmetric: [RO Labels and Workflow Statuses](https://support.tekmetric.com/hc/en-us/articles/360039292193), [Digital Authorization](https://support.tekmetric.com/hc/en-us/articles/4421125978391), [Job Board statuses](https://www.tekmetric.com/post/repairs-management-software-job-board)
- Shopmonkey: [Order Checklist](https://support.shopmonkey.io/hc/en-us/articles/38743815862676), [Assign Technicians](https://support.shopmonkey.io/hc/en-us/articles/38743885537172), [Workflow Cards](https://support.shopmonkey.io/hc/en-us/articles/38744238912788)
- AutoLeap: [Repair Orders API](https://developers.myautoleap.com/openapi/repair-orders/paths/~1repairorders~1%7Bronumber%7D/get.md), work order feature pages
