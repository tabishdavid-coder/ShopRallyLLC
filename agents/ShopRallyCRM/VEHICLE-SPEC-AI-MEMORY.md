# Vehicle Spec UX + AI Enrichment — Durable Memory

> **Created:** 2026-07-18 from SnagIt frame analysis + ShopRally codebase audit.  
> **Purpose:** Reference for recreating AutoLeap + Tekmetric vehicle-spec UX using ShopRally AI + catalog data — **without requiring VIN as a gate**.

---

## Source videos (frame-verified)

| ID | File | Product | Duration | Resolution | What it shows |
|----|------|---------|----------|------------|---------------|
| **C2451C6F** | `C2451C6F-A649-4645-9E95-A9063167EDBF.MP4` | **Tekmetric** | ~13.6s | 1916×952 | RO **#593** — **2017 Volkswagen Tiguan Wolfsburg Edition** (customer Patricia Gaudette). Estimate tab. User expands **right sidebar** accordion panels: **Vehicle** (green), **Fluids** (blue), **Filters & Blades**, **Tires**, **Batteries**, **Specs**, **Service Bulletin**. Fluids panel lists catalog-grade specs: engine oil weights + VW standards + capacity, coolant type + capacity, trans fluid spec + OEM P/N + capacity, brake fluid, diff fluid, A/C refrigerant/oil by compressor type. |
| **E329F843** | `E329F843-B1A0-4D76-8F4A-9CBFEC8A7102.MP4` | **AutoLeap** | ~16.7s | 1916×952 | RO **#10274** (Invoice #1096) — **2011 Toyota Corolla LE** (customer Rohullah Corolla). Services tab. User opens **Vehicle Specifications** via info icon near vehicle header. Modal lists: A/C refrigerant (R-134a + oz), brake fluid (DOT 3), engine coolant (HOAT + qt), engine oil (0W-20 API + qt w/ filter), trans fluid (WS + qt), battery (550 CCA). Header also shows mileage field + link/sync icons; MOTOR + PartsTech badges on service lines. |

**Attribution rule:** C2451 = Tekmetric (logo + sidebar IA). E329F = AutoLeap (green top nav + Services tab + spec popover title).

---

## Field checklist — competitors vs ShopRally today

| Field / capability | Tekmetric (C2451) | AutoLeap (E329F) | ShopRally today |
|--------------------|-------------------|------------------|-----------------|
| **YMM + trim (header)** | ✅ Title line in sidebar + RO header | ✅ Single line "2011 TOYOTA COROLLA LE" | ✅ Stored on `Vehicle`; shown in RO header + right rail |
| **Engine (summary)** | ✅ "2.0L 4-Cyl GAS CCTA Turbocharged" under title | ❌ Not in spec modal (YMM only in header) | ✅ `Vehicle.engine` + structured `engineDetails` from decode |
| **VIN** | ✅ Masked + copy icon | ❌ Not shown in this clip | ✅ `VinDisplay`, decode on entry |
| **License plate + state** | ✅ "LMF5496 - NY" + flag | ❌ Not in clip | ✅ `plate`, `plateState`; Auto.dev plate→VIN (Pro+) |
| **Body type** | ✅ Sport Utility | ❌ | ✅ `bodyClass` from decode |
| **Transmission** | ✅ Automatic - 09M (code) | ❌ in modal | ✅ `transmission` from decode |
| **Drivetrain** | ✅ 4WD / AWD | ❌ in modal | ✅ `drivetrain` from decode |
| **Unit #** | ✅ Add link | ❌ | ✅ `unitNumber` in EditVehicleDialog |
| **Vehicle notes** | ✅ Add link | ❌ | ✅ `notes` |
| **Vehicle history report** | ✅ View link | ❌ (Carfax toggle in sidebar) | ❌ No Carfax/history link yet |
| **Odometer in/out** | ✅ "In: Add odometer" / Out | ✅ Mileage field in header strip | ✅ `EstimateLabOdometerBar` inline save |
| **Fluids (catalog)** | ✅ Full accordion w/ capacities + OEM refs | ✅ Modal: oil/coolant/trans/brake/A/C | ⚠️ **Partial** — advisor `maintenanceSpecs` + shop RO history memory; **no catalog fluid lookup** |
| **Filters & blades** | ✅ Sidebar section | ❌ | ⚠️ Maintenance memory only (shop history) |
| **Tires** | ✅ Sidebar section | ❌ | ✅ `tireSizeFront/Rear` + last tire order |
| **Battery** | ✅ Sidebar section | ✅ 550 CCA in modal | ⚠️ Maintenance memory only |
| **Specs (general)** | ✅ Sidebar section | ❌ | ✅ `RoVehicleSpecsPanel` (decode fields) |
| **Service bulletins** | ✅ Sidebar stub | ❌ | ❌ |
| **Color** | ❌ in clip | ❌ | ✅ `color` on Vehicle |
| **Vehicle display name** | ❌ | ❌ | ✅ `vehicleDisplayName` in create form |

---

## Interaction patterns (frame-verified)

### Tekmetric (C2451)
- **Where:** Persistent **right sidebar** on Estimate tab — always visible while building jobs.
- **Structure:** Colored accordion sections (Vehicle → Customer → Fluids → Filters → Tires → Batteries → Specs → Service Bulletin).
- **Vehicle section:** Read-only label/value rows; **Edit pencil** on section header; **Add** links for empty Unit # / Notes; VIN copy; plate with state flag; Vehicle History Report link.
- **Fluids section:** Auto-populated from catalog once vehicle identity known — shows engine code in header line, then per-fluid cards with spec strings + metric/imperial capacity.
- **Odometer:** Top of sidebar — separate In / Out prompts.
- **Not inline:** Primary edit is section-header pencil → dialog (Tekmetric pattern).

### AutoLeap (E329F)
- **Where:** **RO header strip** (vehicle line + mileage) + **info-icon popover/modal** for deep specs.
- **Structure:** Compact YMM+trim in header; **Vehicle Specifications** dialog for maintenance reference data (fluids + battery).
- **Trigger:** Small icon near vehicle/mileage — does not block estimate work; overlay dismisses with X.
- **Services tab:** MOTOR + PartsTech integration badges on lines (catalog identity flows to labor/parts).
- **Notes:** Shop notes + customer recommendations text areas adjacent to vehicle header.

### ShopRally patterns already built
- **Inline odometer:** `estimate-lab-odometer-bar.tsx` (AutoLeap-style hero strip).
- **Inline customer/vehicle fields:** `estimate-lab-context-inline-fields.tsx` (AutoLeap-style blur-save).
- **Edit dialog for complex fields:** `edit-vehicle-dialog.tsx` (VIN decode, plate lookup, full YMM/engine/trans/drive).
- **Tekmetric-style specs rail:** `RoVehicleSpecsPanel` → `EstimateLabVehicleSpecsSection` (estimate right rail).
- **AutoLeap-style spec dialog:** `EstimateLabVehicleSpecsDialog` (info icon → modal).
- **Context drawer:** `estimate-lab-context-drawer-panels.tsx` — vehicle accordion + specs fetch + plate/VIN lookup.

---

## ShopRally capability matrix

| Source | Trigger | Fields returned | Accuracy | Code |
|--------|---------|-----------------|----------|------|
| **NHTSA vPIC** | 17-char VIN decode | year, make, model, trim, engine (displacement/cyl/fuel), transmission, drivetrain, bodyClass | **High** for US-market VINs; occasional trim/engine ambiguity on builds | `src/server/services/vin.ts` (`NhtsaVinProvider`) |
| **Auto.dev** | VIN or plate (Pro+ / `autodevDecoding`) | Same + richer engine string | **High** when keyed; plate→VIN then decode | `vin.ts` (`AutoDevVinProvider`), `use-plate-vin-lookup.ts` |
| **Gemini Smart RO Intake** | Freeform intake text | year, make, model, trim, engine + `confidence_score`; transmission/drive/body **only after VIN decode merge** | **YMM ~85–95%** when stated; **trim ~60–80%**; **engine ~40–70%** without VIN; auto NHTSA when VIN in text | `smart-ro-intake.ts` |
| **Claude Freeform RO Intake** | Natural-language RO create | year, make, model, trim, vin, plate, mileage — **no engine** | **YMM good**; no decode call | `freeform-ro-intake.ts` |
| **Shop Notes AI** | Paste notes on existing RO | Proposes fill/update for year, make, model, trim (+ jobs/concerns) | Same LLM limits; **no engine field** today | `shop-notes-ai.ts` |
| **parseYmmSearch** | "2014 Honda Accord" string | year, make, model only | **High** for well-formed phrases | `parse-ymm-search.ts` |
| **NHTSA + EPA catalog** | year + make → model → trim → engine drill-down | models (NHTSA), trims + engines + trans/drive/body (EPA) | **High for trim/engine options** when YMM correct; requires user/engine pick when multiple | `vehicle-catalog.ts` |
| **MOTOR** | VIN or scored YMM+trim+engine | BaseVehicleID → labor applications | **High** when licensed + match; sandbox: Civic 22124 only | `motor-vehicle.ts` |
| **NHTSA Recalls** | year + make + model (no VIN) | recall campaigns | **High** for YMM lookup | `vehicle-specs.ts` → `loadVehicleRecalls` |
| **Shop maintenance memory** | Existing vehicle RO history | advisor overrides + inferred fluids/filters from past jobs | **Shop-specific**, not catalog | `vehicle-maintenance-memory.ts` |
| **Stored decode cache** | Prior decode on Vehicle | All decoded columns + `decodedData` JSON | As good as original decode | `Vehicle.decodedData` |

---

## AI accuracy assessment (honest)

### What LLM alone can do **without VIN**
| Input | Reliable? | Notes |
|-------|-----------|-------|
| Year, make, model from clear text ("2011 Toyota Corolla") | ✅ Yes | Normalized via `parseYmmSearch` + prompt rules |
| Trim when explicitly stated ("Corolla LE", "Wolfsburg Edition") | ⚠️ Usually | Fails on informal trim names, missing trim, wrong spelling |
| Engine from speech/text ("2.0 turbo", "V6") | ⚠️ Weak | Often guesses wrong variant for same YMM |
| Transmission / drivetrain | ❌ Poor | Rarely stated; LLM hallucinates |
| Fluid specs, capacities, battery CCA | ❌ No | Needs catalog — competitors use MOTOR/AllData-class data, not LLM |
| VIN extraction from pasted text | ✅ Yes | Regex + checksum in `extractVinFromIntakeText` |

### What needs catalog or decode
- Exact engine code (e.g. VW **CCTA**), trans code (**09M**), fluid OEM P/Ns, capacities → **VIN decode and/or YMM→trim→engine catalog** (EPA/MOTOR/PartsTech).
- Disambiguation when one YMM has multiple engines/trims → **present options UI**, not silent AI pick.

### Recommended hybrid pipeline (no VIN gate)

```
Free text / shop notes / intake
        │
        ▼
┌───────────────────┐
│ AI parse (Gemini) │ → year, make, model, trim, engine? + confidence
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    │ VIN present? │──yes──► NHTSA / Auto.dev decode (ground truth)
    └─────┬─────┘
          │ no
          ▼
┌─────────────────────────┐
│ YMM valid (conf ≥ 70)?  │──yes──► EPA catalog: fetchTrims → fetchEngines
└─────────┬───────────────┘           → user confirm if multiple engines
          │
          ▼
┌─────────────────────────┐
│ MOTOR licensed?         │──yes──► resolve BaseVehicleID (YMM+trim+engine score)
└─────────┬───────────────┘
          │
          ▼
   Persist to Vehicle + show specs UI
   (never hide panel because VIN missing)
```

**Explicit product rule:** Showing and enriching vehicle specs must **not** require VIN. VIN improves accuracy but is optional. Minimum viable identity: **year + make + model**; enrich with trim + engine when available.

---

## Failure modes to design for

1. **Ambiguous trim** — "Accord" could be LX, Sport, Hybrid, etc. → show trim picker from EPA catalog.
2. **Multiple engines same YMM** — Corolla LE may have 1.8L variants → engine disambiguation required before fluid specs.
3. **AI overconfidence** — Smart intake marks ≥70 only when clear; surface yellow warn below threshold (already in `CONFIDENCE_WARN_THRESHOLD`).
4. **Wrong model year range** — LLM may infer wrong year from "older Camry" → keep human confirm step.
5. **Non-US / gray market** — NHTSA/EPA weak → fall back to stored manual entry + shop history.
6. **Core plan without Auto.dev** — plate lookup blocked; YMM + VIN decode (NHTSA) still work.

---

## UI placement — LOCKED 2026-07-18 (building today)

**ShopRally blend: AutoLeap access + Tekmetric depth, horizontal on desktop.**

| Surface | Pattern | Status |
|---------|---------|--------|
| **Always visible** | Identity strip (YMM, engine, VIN/plate, source chip) on right rail | ✅ `VehicleSpecsReferenceBody` rail layout |
| **One click** | Info icon → **wide** `max-w-5xl` dialog: left identity (~34%) \| right Fluids grid | ✅ `EstimateLabVehicleSpecsDialog` |
| **Drawer** | Same stacked body under Vehicle specs toggle | ✅ context drawer panels |
| **VIN gate** | **No** — YMM is enough to show Specs UI; empty Fluids say “Enrich from YMM” | ✅ `vehicleCanShowSpecsUi` |

Shared body: `src/components/estimate-building/vehicle-specs-reference.tsx`  
Fluids slots today: maintenance memory + empty catalog placeholders (EPA fill = next build).

### Cost rule (LOCKED) — on-demand Specs only

**Never** call paid / metered APIs (EPA catalog, Gemini/LLM, NHTSA recalls for this panel, Auto.dev) on estimate page load or idle rail render.

| When | Allowed |
|------|---------|
| Estimate SSR / open RO | Identity already on `Vehicle` row only — **no** specs bundle, **no** catalog |
| User clicks **Specs** | `fetchVehicleSpecsBundle` (DB) then optional catalog enrich |
| User never opens Specs | **Zero** catalog / AI charges for this feature |

Implementation: `EstimateLabVehicleSpecsLazy` — compact rail CTA; fetch on open.  
Future enrichment actions must be invoked **only** from that open path.

### Specs open session (2026-07-19)

`openVehicleSpecsSession(vehicleId)` on every Specs open:
1. **Always** reloads vehicle from DB (VIN edits on the RO show immediately).
2. If VIN present and engine/trans/drive thin → **NHTSA decode + persist** (on Specs open only).
3. If engine still empty → return **EPA engine option list**; user picks via Select (no silent guess).
4. `applySpecsEngineChoice` saves engine + transmission/drive/body from EPA details.

---

## Key code paths (audit 2026-07-18)

| Area | Path |
|------|------|
| Prisma Vehicle fields | `prisma/schema.prisma` → `model Vehicle` |
| VIN decode service | `src/server/services/vin.ts` |
| Smart AI intake + VIN merge | `src/server/services/smart-ro-intake.ts` |
| Freeform intake (no decode) | `src/server/services/freeform-ro-intake.ts` |
| Shop notes AI vehicle proposals | `src/server/services/shop-notes-ai.ts` |
| YMM catalog (NHTSA+EPA) | `src/server/services/vehicle-catalog.ts` |
| MOTOR vehicle ID | `src/server/services/motor/motor-vehicle.ts` |
| Specs UI (rail) | `src/components/repair-order/ro-vehicle-specs-panel.tsx` |
| Specs UI (dialog) | `src/components/estimate-building/estimate-lab-vehicle-specs-dialog.tsx` |
| Specs bundle loader | `src/server/vehicle-specs-bundle.ts` |
| Add/edit vehicle + decode | `add-vehicle-dialog.tsx`, `edit-vehicle-dialog.tsx`, `create-vehicle-form.tsx` |
| Plate/VIN lookup hook | `src/components/vehicles/use-plate-vin-lookup.ts` |

### Gaps vs competitor videos
1. **No catalog fluid specs** (oil/coolant/trans capacities + OEM strings) — biggest Tekmetric/AutoLeap parity gap.
2. **`vehicleHasSpecsData`** hides panel unless engine/trans/drive/body/vin present — should show YMM-only + "Enrich" CTA.
3. **Freeform + shop-notes AI** do not extract engine or call catalog enrichment.
4. **Service bulletins, Carfax/history links** not built.
5. **Tekmetric Filters/Tires/Batteries accordion sections** — only partial (tires + maintenance memory).

---

## Recommended next build steps

1. **YMM→catalog enrichment action** — Given year/make/model (+ optional trim/engine), call existing `fetchTrims` / `fetchEngines` / `fetchVehicleDetails`; persist to Vehicle; no VIN required. Show disambiguation when `fetchEngines` returns >1.
2. **Wire AI intake → enrichment** — After Smart RO / shop-notes parse, if `vehicle.confidence_score ≥ 70` and YMM present, auto-suggest catalog match; merge engine/trans/drive from EPA when single match.
3. **Fluids reference panel** — New catalog-backed section (or extend maintenance specs) matching AutoLeap modal + Tekmetric Fluids accordion; fed by EPA/MOTOR when available.
4. **Remove VIN gate in UI copy** — Update `RoVehicleSpecsPanel` empty state to offer "Enrich from YMM" not only "Add a VIN".

---

## SnagIt cross-refs (related memories)

- AutoLeap RO header + spec popover aligns with user rules on RO #10246 (Services tab, shop notes, authorizations).
- Tekmetric estimate + sidebar aligns with RO #497 / #593 patterns (colored sections, fluids accordion).
- Karvio target: AutoLeap inline edit + Tekmetric spec depth, ShopRally navy/light-blue/red branding.

---

*Update this file when vehicle-spec UI or enrichment pipeline ships.*
