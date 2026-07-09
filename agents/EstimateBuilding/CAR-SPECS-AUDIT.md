# Car specs — AutoLeap video + Tekmetric right rail audit

**Video:** `584A0A5D-1A15-410C-9C4F-F8A840A21B36.MP4` (~12s)  
**Screenshots:** `docs/audits/screenshots/car-specs-video-2026-07-05/`  
**Date:** 2026-07-05

---

## What the video shows (AutoLeap)

Advisor on RO #10249 (2014 Honda Accord EX-L) clicks the **info icon** next to the vehicle in the RO header. A **Vehicle Specifications** popover opens with OEM-style fluid and torque lines:

| Section | Example content (from video) |
|---------|------------------------------|
| **A/C refrigerant** | R-134 (R-134a) · 475 gm / 16.8 oz |
| **Brake fluid** | HB (Hydraulic Brake Fluid, DOT 3) |
| **Engine coolant** | OAT · 6.5 L / 6.9 qt |
| **Engine oil** | API · **0W-20** · Without filter: 4.0 L / 4.2 qt · With filter: 4.3 L / 4.5 qt |
| **Transmission fluid** | Auto · SL001 / P/N 08200-9008 (ATF DW-1) · 7.2 L / 7.6 qt |
| **Lug nut torque** | 80 lb/ft |

Each block is a **bold category title** + multi-line detail (grade, unit, capacity, part number where applicable). Data is **vehicle-specific OEM reference** (likely MOTOR / shop integration), not shop-entered free text.

AutoLeap’s **right sidebar** in the same frames is **order workflow + money** (authorize, estimate/invoice, advisor, payment, fee breakdown) — **not** where fluid specs live. Specs are a **header-triggered reference panel**.

---

## Tekmetric right rail (target behavior)

On estimate, Tekmetric’s supplementary column is also **order-focused** (authorization, totals, actions). Vehicle identity stays in the **main header / context strip**; deeper vehicle data is **expandable list rows** (VIN, engine, tire size, notes) reachable without leaving the estimate.

ShopRally already documents this split in `agents/EstimateBuilding/RIGHT-RAIL-IA.md`:

- **Right rail:** advisor, approval, profitability, actions — no duplicate of header vehicle line  
- **Vehicle depth:** belongs in context deck / specs panel, not a second copy of RO # + customer

---

## What ShopRally has today

### Production RO (`/repair-orders/[id]` — non-estimate workspace)

| Surface | Content |
|---------|---------|
| `RoContextDeck` → **Details** sheet | Vehicle collapsible (VIN, plate, body, trans, drivetrain, unit #, notes) |
| `RoVehicleSpecsPanel` | Accordions: **Fluids**, **Filters & blades**, **Tires**, **Batteries**, **Specs** (VIN decode), **Recalls** |

**Files:** `ro-context-deck.tsx`, `ro-vehicle-specs-panel.tsx`, `vehicle-specs-view.ts`, `vehicle-maintenance-specs.ts`

**Data:**

- **Specs accordion:** NHTSA vPIC decode (`engine`, displacement, cylinders, fuel, aspiration, HP, transmission, drivetrain, body)
- **Fluids / filters / battery:** Shop overrides on `Vehicle.maintenanceSpecs` JSON + **RO history** backfill from part lines
- **Tires:** `tireSizeFront` / `tireSizeRear` + last tire order hint

### Estimate workspace / Estimate lab (`/design-review/estimate-building`, merged estimate)

| Surface | Content |
|---------|---------|
| Context strip | Year/make/model, VIN, mileage — opens customer drawer |
| **Right rail — Quick reference** | VIN, plate, state only (**Preview** stub) |
| Context drawer → Vehicles tab | Edit YMM/VIN/plate; **“Vehicle specs” button disabled** (coming soon) |
| `RoContextDeck` / `RoVehicleSpecsPanel` | **Not mounted** — `layout.tsx` sets `contextDeck={undefined}` when `isEstimateWorkspace` |

**Root gap:** The full specs UI is built for the legacy context deck but **excluded from the estimate workspace** where advisors spend most of their time.

---

## Gap matrix

| AutoLeap / Tekmetric expectation | ShopRally today | Gap |
|----------------------------------|--------------|-----|
| Header **info / specs** trigger | Vehicle card → customer drawer only | No quick specs popover |
| OEM fluid list (6+ categories) | 3 free-text fluid fields (oil, capacity, coolant) | Missing A/C, brake, trans, lug torque; no structured capacities |
| Engine oil **with/without filter** | Single “oil capacity” string | Need split rows or rich text |
| Part numbers on fluids (ATF DW-1) | Not modeled | Add optional PN field per spec row |
| VIN decode engine summary | ✅ Specs accordion | Already on production deck |
| Shop memory from past ROs | ✅ Filters, battery, partial fluids | Good — keep |
| Tires on file + last order | ✅ Tires accordion | Good — keep |
| NHTSA recalls | ✅ Lazy-load accordion | Good — keep |
| Right rail vehicle list rows | Quick reference: 3 fields | Need full accordion or link to specs |
| Estimate workspace access | Panel absent | **Wire `RoVehicleSpecsPanel`** |

---

## Recommended build (phased)

### Phase 1 — Surface existing panel on estimate ✅ (2026-07-05)

**Goal:** Advisors see the same spec accordions as production RO, in estimate lab + merged estimate.

1. In `estimate-building-lab-panel.tsx`, load the same server data as `repair-orders/[id]/layout.tsx`:
   - `vehicleSpecsView(ro.vehicle)`
   - `getLastTireOrderSize`
   - `getVehicleMaintenanceMemory`
2. Pass into right rail as new props on `EstimateLabRightRail`.
3. Render **`RoVehicleSpecsPanel`** (`lightTheme`) as a new accordion **“Vehicle specs”** below Profitability (or expand Quick reference → merge Vehicle section into panel).
4. Dedupe: remove VIN/plate rows from Quick reference when Vehicle specs accordion is present (per RIGHT-RAIL-IA dedup rules).

**Optional AutoLeap parity:** Add **info icon** on `EstimateLabContextStack` vehicle card → `Popover` with `RoVehicleSpecsPanel` compact / read-only fluid+spec list.

### Phase 2 — Structured OEM spec rows (AutoLeap list items)

**Goal:** Match video list shape even before MOTOR API.

1. Extend `VehicleMaintenanceOverridesSchema` (or new `VehicleOemSpecs` JSON on `Vehicle`):

```ts
// Proposed keys (labels match AutoLeap categories)
acRefrigerant: string | null;      // "R-134a · 475 gm / 16.8 oz"
brakeFluid: string | null;         // "DOT 3"
coolant: string | null;            // existing — enrich display
engineOilGrade: string | null;     // "0W-20"
engineOilCapacityNoFilter: string | null;
engineOilCapacityWithFilter: string | null;
transmissionFluid: string | null;  // "ATF DW-1 · 7.2 L / 7.6 qt"
lugNutTorque: string | null;       // "80 lb/ft"
```

2. New accordion section **“OEM fluids & torque”** above shop **Fluids** (shop memory), or merge into Fluids with sub-headers.
3. Display component: **`VehicleSpecListItem`** — title (semibold) + body lines (muted), matching video typography.
4. Manual edit dialog (same pattern as `MaintenanceEditDialog`) until provider exists.

### Phase 3 — Provider (MOTOR / Mitchell / AllData)

**Goal:** Auto-fill Phase 2 fields from licensed catalog by YMM + engine code.

- Interface: `VehicleSpecProvider.getFluidsAndTorque({ year, make, model, trim, engine, vin })`
- Cache on `Vehicle.decodedData` or `maintenanceSpecs` with `source: "motor"` + `fetchedAt`
- Fallback: Phase 2 manual + VIN decode only

Until partnership: seed nothing; show empty state *“Connect labor/spec data provider in Settings”* (no competitor names in shop UI per COMMERCIAL-SAFETY.md).

### Phase 4 — Context drawer ✅ (2026-07-05)

- **Vehicle specs** button enabled in `estimate-lab-context-drawer-panels.tsx` — toggles inline `RoVehicleSpecsPanel` accordions.
- Preloads bundle for the RO vehicle; other customer vehicles fetch via `fetchVehicleSpecsBundle`.
- **History** / **Tire storage** remain disabled stubs (backlog).

### Phase 2 & 3 — Parked

OEM structured fluid rows + MOTOR provider deferred until licensed spec data is available.

---

## Target IA (estimate right rail v6)

```
Order summary
├── Advisor & payment
├── Approval (+ progress bar)
├── Profitability (when jobs exist)
├── Vehicle specs          ← NEW (RoVehicleSpecsPanel + OEM list when Phase 2)
│   ├── OEM fluids & torque
│   ├── Fluids (shop memory)
│   ├── Filters & blades
│   ├── Tires
│   ├── Batteries
│   ├── Decoded specs (engine/VIN)
│   └── Recalls
├── Quick reference        ← trim duplicate VIN; keep workflow + parts pipeline
└── Actions
```

Header (parallel):

```
[Customer card] [Vehicle card + ⓘ specs popover]  ← AutoLeap info trigger
```

---

## Reuse map (minimal new code)

| New UI | Reuse |
|--------|--------|
| Right rail accordion | `RoVehicleSpecsPanel`, `SidebarAccordion`, `SidebarSpecRow` |
| Spec list items | Extend `MaintenanceRows` or new `OemSpecList` |
| Server load | Copy parallel from `repair-orders/[id]/layout.tsx` |
| Edit dialogs | `MaintenanceEditDialog` pattern + `updateVehicleMaintenanceSpecs` |
| VIN decode rows | `vehicleSpecsView` + `engineDetailRows` (existing) |

---

## Test checklist

1. Open estimate lab RO with decoded VIN → **Vehicle specs** accordion shows engine/trans/drivetrain.
2. Set tire sizes on vehicle → Tires accordion shows sizes; last tire order hint if seeded.
3. Complete oil change RO on same vehicle → Filters/fluids backfill from history on next RO.
4. Info icon on vehicle card → popover lists all spec sections (Phase 1 optional).
5. Expand Recalls → NHTSA load works on light theme links.
6. Quick reference no longer duplicates VIN when specs accordion visible.

---

## Conclusion

You **already built** ~80% of Tekmetric-style vehicle specs in `RoVehicleSpecsPanel`; estimate workspace simply **does not mount it**. The AutoLeap video adds **OEM fluid/torque list items** that need structured fields + eventually a spec provider — not just three free-text fluid lines.

**Highest leverage next step:** Phase 1 — wire `RoVehicleSpecsPanel` into `EstimateLabRightRail` and add vehicle **ⓘ popover** on the context strip.
