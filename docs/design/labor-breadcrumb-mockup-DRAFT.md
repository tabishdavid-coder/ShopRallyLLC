# Labor Guide Breadcrumb Mockup — DRAFT

**Date:** 2026-07-07  
**Status:** Design-only — no production code changes  
**Scope:** ShopRally Smart Labor Book / Shop Library browse hierarchy  
**Sources:** 3 SnagIt screen recordings (frame-verified via ffmpeg), existing `shop-library-miller-flow-2026-07-05.md`, `labor-browse-hierarchy.ts`, `labor-vehicle-key.ts`

---

## Executive summary

Competitor recordings show **two dominant patterns**:

| Product | Layout | Hierarchy depth | Position handling |
|---------|--------|-----------------|-------------------|
| **Tekmetric** | Breadcrumb + single drill-down list + right “New Job” cart | 3–5 levels | Often a **breadcrumb step** (`Brake Pads Rear`) *or* **inline qualifier links** under the operation row (`Front` / `Rear` / `Both Sides`) |
| **AutoLeap + MOTOR** | Left category nav + flat results table (expand row for detail) | 2–3 levels before operations | **Embedded in operation name** (`Front`, `Rear`, `Each`) + **qualifier band** above results (`Brake: Disc/DISC/4-Wheel ABS`) |

ShopRally today uses a **5-column Miller** (System → Component → Position → Operation → Jobs). Competitors use **breadcrumb trail + one active list + detail/cart**. This mock proposes collapsing to **≤5 logical levels** with a **3-pane layout** (left trail, middle results, right detail) while keeping YMM-level cache reuse and VIN/trim-only qualifier narrowing.

**Licensed MOTOR taxonomy mapping:** pending other agents — this doc uses ShopRally’s generic tree + observed competitor shapes.

---

## Video findings

Frames extracted to `docs/design/labor-video-frames/` (~every 9s for long clips, ~4s for short). 13 frames per Tekmetric video, 14 for AutoLeap.

### Video 1 — `39484576-C64E-4B83-9EA2-72741CC521AD.MP4`

| Meta | Value |
|------|-------|
| **Duration** | ~115s |
| **Resolution** | 1916×952 (H.264) |
| **Product** | **Tekmetric** Labor Guide modal |
| **Vehicle** | Ricardo Nabholz — **2017 Audi Q5 Premium Plus 2.0L 4Cyl FLEX CPMB Turbocharged** |
| **Header specs** | Body: Sport Utility · Transmission: Automatic · Drivetrain: AWD |
| **Data tabs** | TEKMETRIC (active) · PRODEMAND |

**UX shell**

- Full-screen modal over shop CRM.
- Top: vehicle title bar + odometer/body/trans/drivetrain strip.
- Below tabs: **Search Labor Guide** (full width).
- **Horizontal breadcrumb** (`2017 Audi Q5 > …`) with **← Back** under it.
- **Center:** one vertical list per level (chevron rows); at leaf, **Labor / Parts** sections with Skill + Hours columns and green **+** add buttons.
- **Right:** **New Job** cart (Labor table, Parts table, **CREATE JOB**).

**Paths observed (chronological by frame timestamps)**

| ~Time | Breadcrumb path | Center content | Notes |
|-------|-----------------|----------------|-------|
| 0s | `2017 Audi Q5` | 18 **System** rows (Accessories, Body & Frame, Brakes, Engine/Cooling/Exhaust, HVAC, …) | Root = vehicle YMM, not a separate picker inside modal |
| 27s | `… > Brakes > Master Cylinder` | 3 operations: Master Cylinder R&R, Overhaul, Reservoir R&R | Component → flat ops |
| 36s | `… > HVAC` | 14 **Component** rows: A/C System, Blower Motor, Compressor, Condenser, … | HVAC component fan-out |
| 54s | `… > HVAC > Blower Motor > HVAC Blower Motor Control…` | Labor: Control Module R&R — **1.30 hrs**, Skill **B**; Parts: none | 4-level breadcrumb before hours |
| 63s | `… > Steering > Steering > Steering Wheel` | Single op: Steering Wheel R&R | Duplicate “Steering” segment (provider taxonomy quirk) |
| 81s | `… > Suspension > Stabilizer Bar > Stabilizer Bar Link` | Multiple R&R rows with **blue qualifier links**: `w/o Hybrid Front One Side`, `Rear One Side`, `Rear Both Sides` | Position/variant as **sub-links**, not breadcrumb |
| 90s | `… > Suspension > Wheel Hub > Suspension Knuckle` | R&R with `Rear One Side` / `Front One Side` qualifiers | Same pattern |

**Takeaways**

- Tekmetric **does not** use simultaneous Miller columns; it **replaces** the list at each drill step.
- **Position is inconsistent:** sometimes a breadcrumb segment (`Brake Pads Rear` — see Video 2), sometimes inline qualifiers under one operation name.
- Hours appear only at **operation leaf**; parts may be empty.
- Vehicle trim/engine in header implies VIN-level context even when breadcrumb root is YMM.

---

### Video 2 — `62F7BBC4-B69C-43DE-AE5A-DDE93D2F602D.MP4`

| Meta | Value |
|------|-------|
| **Duration** | ~152s |
| **Product** | **Tekmetric** (same vehicle/customer as Video 1) |
| **Purpose** | Longer brakes + cooling walkthrough; cart accumulates multiple labor lines |

**Additional paths**

| ~Time | Breadcrumb path | Center content | Notes |
|-------|-----------------|----------------|-------|
| 0s | `2017 Audi Q5` | System list | Same root as Video 1 |
| 18s | `… > Body & Frame > Door Systems` | Sub-component list (rows w/ chevrons) | Body drill-down |
| 45s | `… > Brakes > Brake Pads` | **Brake Pads Remove & Replace Front** / **Rear** | Position as **operation row split**, not axle breadcrumb |
| 72s | `… > Brakes > Brake Line` | Brake Line R&R (hover) | User exploring hydraulic tree |
| 81s | `… > Brakes > Brake Booster > Brake Power Booster Unit` | R&R — **3.10 hrs**, Skill B | 4-level; right cart shows same line |
| 117s | `… > Brakes > Brake Pads > Brake Pads Rear` | **Labor** + **Additional Labor** + **Parts** sections | Deepest brake path: primary R&R + related ops (rotor, caliper, bleed) with hours |
| 132s | `… > Engine, Cooling and Exhau… > Cooling System` | 10+ cooling ops (thermostat, radiator, water pump, …) | Flat op list at component level |

**Cart behavior (right panel)**

- Retains selections across navigation (e.g. Power Booster **2.70h** still visible while browsing rear pads).
- **CREATE JOB** enabled when cart has labor.

**Takeaways**

- Brakes expose **two valid patterns** in one product: `Front/Rear` as **sibling rows** *or* `Brake Pads Rear` as **breadcrumb level**.
- **Related labor** (“Additional Labor”) appears at leaf — useful for ShopRally “variants / related hits” in middle pane.
- Cooling shows **assembly-only** components (water pump) as direct operations — aligns with ShopRally `ASSEMBLY_ONLY_SUBCATEGORIES`.

---

### Video 3 — `40A71B5C-113B-4ABD-932F-559532300AD1.MP4`

| Meta | Value |
|------|-------|
| **Duration** | ~56s |
| **Product** | **AutoLeap** estimate RO **#10253** — **2009 Hyundai Sonata GLS** |
| **Modal** | **Search all services** |
| **Sources** | AutoLeap · **MOTOR Primary** · MOTOR Secondary · Magic Services · Open Mitchell1 |
| **MOTOR sub-tabs** | Services · Maintenance · Code |

**UX shell**

- Modal over RO Services tab (Catalytic Converter job visible behind).
- **Left column:** category header with ← back (e.g. **Brakes**, **HVAC**) + subcategory list.
- **Right area:** results table — Operational · Guide · Labor · Parts · Fluids · Subtotal · **+**.
- **Expand row** → MOTOR hrs, editable hours, **Included operations** footnote.
- **Done** closes modal (adds to estimate).

**Paths observed**

| ~Time | Left nav | Results | Notes |
|-------|----------|---------|-------|
| 0s | Categories: All, Body & Frame, **Brakes**, Electrical, HVAC, … | Empty state: “Select category or search” | Top-level **System** list |
| 12s | **Brakes** → All, @ALL, Control Module, Disc Brakes, Hydraulic, Parking Brake, Power Assist | — | MOTOR **Component group** under system |
| 20s | Brakes → (Disc Brakes implied) | Qualifier band: **Brake: Disc/DISC/4-Wheel ABS**; ops: Master Cylinder R&R, **Brake Pads R&R (Front)** expanded | Trim/VIN-derived qualifier strip |
| 36s | Brakes → **Parking Brake** | Rear ops: Caliper R&R, Line R&R, Rotor R&R, Cable R&R, … | Position in **operation label** |
| 44s | **HVAC** → **Heating** | Heater Core R&R **With AC** / **Without AC**; Heater Hose R&R; included ops | AC presence = **operation qualifier**, not nav level |
| 52s | HVAC → **Control Module** | Loading spinner | Async fetch per component |

**Takeaways**

- MOTOR integration favors **System → Component group → flat operation table**.
- **Vehicle configuration** surfaces as a **qualifier band**, not a breadcrumb step — matches “VIN adds trim; trim narrows qualifiers.”
- Expand-row detail ≈ ShopRally’s right **detail panel** (hours, includes, add).

---

## Cross-reference: ShopRally today

| Layer | Current implementation | Competitor gap |
|-------|------------------------|----------------|
| Layout | 5 Miller columns (`smart-labor-guide.tsx`) | Breadcrumb + 1 list + detail/cart |
| System / Component | `LABOR_CATEGORY_TREE` | Tekmetric uses longer system names; MOTOR uses finer component groups under system |
| Position / Operation | `SUBCATEGORY_NAV` facets (`labor-nav-facets.ts`) + `browseStepOrder()` | Competitors merge position into op name or qualifier links |
| Cache key | `primaryVehicleKey` → `vin10:{prefix}` when VIN ≥ 10 chars; `ymm:` fallback (`labor-vehicle-key.ts`) | Full 17-char VIN stored in UI/DB; vin10 is cache-only |
| Jobs column | Separate 5th column | Becomes **middle pane** at path complete |

See also: `docs/design/shop-library-miller-flow-2026-07-05.md`.

---

## Proposed hierarchy (max 5 levels)

Normalize competitor chaos into **one ruleset**:

```
L0  Vehicle context     (header — not a breadcrumb click target inside RO)
L1  System              Brakes | HVAC | Suspension | …
L2  Component           Brake Pads | Compressor | CV Axle | …
L3  Position (optional) Front | Rear | Left | Right | Both | N/A
L4  Operation           Replace pads | R&R | Bleed | …
L5  Variant / Job       MOTOR qualifier rows → labor hours (+ parts)
```

### Gating rules (when to show L3)

| Pattern | L3 Position? | L4 Operation order | Example |
|---------|--------------|-------------------|---------|
| **Axle-first** (pads, rotors, some calipers) | Yes — required | After position | Brakes → Pads → **Front** → Replace |
| **Operation-first** (struts, some rotors) | Yes — after operation pick | Operation before position | Suspension → Struts → **Replace strut** → **Front** |
| **Assembly-only** (water pump, rack, compressor assy) | Skip (implicit `all`) | Direct to ops | HVAC → Compressor → **Replace compressor** |
| **Corner ops** (wheel bearing, CV axle) | Yes — front/rear and/or L/R | Position-first | Drivetrain → CV Axle → **Front Left** → Replace axle |
| **MOTOR qualifier-only** | Skip L3; show band in middle pane | Flat ops under component | HVAC → Heating → ops with “With AC” / “Without AC” |

Reuse existing logic: `browseStepOrder()`, `subcategoryIsAssemblyOnly()`, `subcategoryUsesOperationFirst()` in `labor-browse-hierarchy.ts`.

### Breadcrumb display vs Miller columns

| Today (Miller) | Proposed |
|----------------|----------|
| 5 visible columns | **Left pane:** clickable trail `Brakes › Brake Pads › Front › Replace pads` |
| Position column | Trail segment **or** “Front · Rear” chips in middle pane when L3 skipped |
| Operation column | Trail segment when gated; else grouped under component |
| Jobs column | **Middle pane:** operation/variant list with hours |
| Detail | **Right pane:** selected variant — hours, skill, includes, parts, Add |

---

## YMM / VIN / trim / cache strategy

### User-facing vehicle entry

| Mode | When | UI | Data loaded |
|------|------|-----|-------------|
| **YMM search** | Quick Labor, no RO vehicle | Year → Make → Model → **Engine** (required if multi-engine) | Cache key `ymm:{year\|make\|model\|engine}` |
| **VIN search** | RO with VIN or manual decode | Decode → show YMM + **trim** + engine in header | Lookup keys: VIN + all YMM variants |
| **RO context** | Estimate / Smart Labor Book from RO | Pre-filled from `Vehicle` record | Same as VIN if VIN present |

**Rule:** Labor **reference tree** (L1–L4) is identical for all VINs sharing the same **YMM + engine**. Trim/VIN only affects **L5 variants** (qualifier filtering).

### Cache layers

```
┌─────────────────────────────────────────────────────────────┐
│ L0 — Vehicle config (from VIN decode, not cached per job) │
│     trim, body, trans code, ABS, AC, drive — qualifier set│
└──────────────────────────┬──────────────────────────────────┘
                           │ narrows
┌──────────────────────────▼──────────────────────────────────┐
│ L1 — Labor catalog cache (LaborOperation table)             │
│     PRIMARY WRITE KEY: ymm:{year|make|model|engine}       │
│     SECONDARY: vin:{vin} for exact-match promotion          │
│     TTL: 180d (existing)                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ browse path + qualifiers
┌──────────────────────────▼──────────────────────────────────┐
│ L2 — Browse session (client)                                │
│     systemId, componentId, positionId?, operationId?        │
│     → synthetic query → cache lookup / MOTOR fetch          │
└─────────────────────────────────────────────────────────────┘
```

### Read path (aligned with `labor-vehicle-key.ts`)

1. Build `vehicleKeysForLookup(vehicle)` — VIN key + YMM + YMM-base + legacy.
2. Fetch cached ops for `(vehicleKey, queryKey)`.
3. **Filter variants** client-side or server-side using decoded config:
   - `4-Wheel ABS` → show ABS-related ops
   - `With Air Conditioning` → prefer AC variant of heater core
4. On MOTOR/AI miss: **write-through** to `ymmVehicleKey` (+ promote to sibling YMM keys via `ymmVehicleKeysForPromote`).

### Display copy (header strip)

```
2017 Audi Q5 Premium Plus · 2.0L Turbo · AWD · VIN …521AD
Cache: YMM match · Qualifiers: 4-Wheel ABS, Automatic trans
```

When YMM-only: `2009 Hyundai Sonata GLS · 2.4L · [Add VIN for trim-specific variants]`

---

## Before / after example paths

Legend: **Before** = current Miller columns. **After** = proposed trail › middle › right.

### Brakes — Front pad replacement

**Before**

```
[Brakes] | [Brake Pads] | [Front] | [Replace brake pads] | [JOBS: 3 hits]
```

**After**

```
LEFT TRAIL                          MIDDLE (results)                    RIGHT (detail)
─────────────────────────────────────────────────────────────────────────────────────
Brakes ›                            Qualifier: Disc · 4-Wheel ABS       Brake Pads R&R — Front
  Brake Pads ›                        ┌─────────────────────────────┐   ─────────────────────
  Front ›                             │ ● Pads R&R          1.0 hr  │   Skill: B
  Replace pads                        │   Resurface rotors    0.5 hr  │   MOTOR 1.0 hr
                                      │   Inspect / measure   0.3 hr  │   Shop rate → $150
                                      │ + Related: caliper…           │   [Add to job]
                                      └─────────────────────────────┘
```

**Tekmetric equivalent:** `Brakes > Brake Pads > Front` *or* sibling rows Front/Rear (Video 2).  
**AutoLeap equivalent:** `Brakes > Disc Brakes` + band `4-Wheel ABS` + `Brake Pads R&R (Front)`.

---

### CV axle — Front left R&R

**Before**

```
[Transmission] | [CV Axles & Driveshaft] | [Front] | [Replace CV axle] | [JOBS]
```
*(Today may also need left/right — verify `labor-nav-facets` for `trans-axle`.)*

**After**

```
LEFT TRAIL                          MIDDLE                              RIGHT
──────────────────────────────────────────────────────────────────────────────
Drivetrain ›                        Pick corner (if not in trail):      CV Axle R&R — Front Left
  CV Axle ›                           [Front Left] [Front Right]       ─────────────────────
  Front Left ›                        ┌──────────────────────────┐      1.4 hr · FWD
  Replace axle                        │ ● CV Axle R&R     1.4 hr │      Boot kit (optional)
                                      │   CV Joint/boot   0.8 hr │      [Add to job]
                                      └──────────────────────────┘
```

**Rationale:** Corner position belongs in L3; Tekmetric would use inline `Front One Side` qualifiers (Video 1 suspension knuckle pattern).

---

### HVAC — Heater core with A/C qualifier

**Before**

```
[HVAC] | [Heater Core] | (no position) | [Replace heater core] | [JOBS: With/Without AC variants mixed]
```

**After**

```
LEFT TRAIL                          MIDDLE                              RIGHT
──────────────────────────────────────────────────────────────────────────────
HVAC ›                              Qualifier: **With Air Conditioning** Heater Core R&R
  Heating ›                         (from VIN/trim — not a nav level)  ─────────────────────
  Heater Core ›                     ┌──────────────────────────────┐   5.2 hr MOTOR
  Replace                           │ ● R&R w/ AC           5.2 hr │   Includes: evac AC…
                                    │ ○ R&R w/o AC          4.1 hr │   (dim if AC confirmed)
                                    │   Heater hose R&R     0.5 hr │   [Add to job]
                                    └──────────────────────────────┘
```

**AutoLeap equivalent:** Video 3 — two ops under Heating, AC in the **operation title**.  
**ShopRally rule:** When MOTOR sends qualifier-only splits, **skip L3** and show **qualifier band + radio-style variants** in middle pane.

---

## Wireframes

### A — Full layout (browse mode)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ Smart Labor Book — 2017 Audi Q5 Premium Plus · 2.0L · AWD · VIN …521AD          [×]     │
│ [Search labor…________________________]  [YMM ▼] [VIN decode]     Source: Cache · MOTOR │
├───────────────┬────────────────────────────────────────────┬─────────────────────────────┤
│ BROWSE TRAIL  │ RESULTS                                    │ DETAIL                      │
│               │                                            │                             │
│ ● Brakes      │ Filter: [Front] [Rear]    Qualifier: ABS   │ Brake Pads R&R — Front      │
│   Brake Pads  │ ┌────────────────────────────────────────┐ │ ─────────────────────────── │
│   Front       │ │ Hrs  Operation                          │ │ Labor        1.0 hr         │
│   Replace pads│ │ 1.0  Brake Pads R&R              [+]   │ │ Skill        B              │
│               │ │ 0.5  Rotor R&R (each)            [+]   │ │ Includes     —              │
│ ○ Suspension  │ │ 0.3  Caliper R&R (each)          [+]   │ │ Parts        (0)            │
│ ○ HVAC        │ └────────────────────────────────────────┘ │                             │
│ ○ …           │ Related labor ▸                            │ [Add to job]  [Add to cart] │
│               │                                            │                             │
├───────────────┴────────────────────────────────────────────┴─────────────────────────────┤
│ Cart (2 lines · 1.9 hr)                                              [Add to estimate →] │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### B — Left trail interactions

- Click **Brakes** → truncates trail; middle shows **Component** list (Pads, Rotors, Calipers, …).
- Click **Front** in trail → truncates to L3; middle refreshes variants.
- **Search** clears trail; middle = flat search hits (existing `searchLaborGuide` behavior).
- **Quick chips** (Front brakes, Rear brakes, Struts) pre-fill trail (`shop-library-chip-paths.ts`).

### C — YMM-only Quick Labor entry

```
┌─────────────────────────────────────────────┐
│ Vehicle: [2014 ▼] [Honda ▼] [Accord ▼]      │
│ Engine:  [2.4L 4-cyl ▼]   (required)        │
│ VIN (optional): [________________] [Decode]   │
│ → Opens browse with ymm cache key           │
└─────────────────────────────────────────────┘
```

---

## Mapping competitors → ShopRally levels

| Competitor node | ShopRally L1 | ShopRally L2 | ShopRally L3 | ShopRally L4–5 |
|-----------------|-------------|-------------|-------------|----------------|
| Tekmetric “Brakes” | brakes | — | — | — |
| Tekmetric “Brake Pads” | brakes | brakes-pads | — | — |
| Tekmetric “Brake Pads Rear” | brakes | brakes-pads | rear | (op in list) |
| Tekmetric “Stabilizer Bar Link” + “Rear Both Sides” link | suspension | suspension-joints | rear | R&R + variant |
| MOTOR “Brakes > Disc Brakes” | brakes | brakes-pads *or* brakes-rotors | front/rear in op | variant |
| MOTOR “Brake: Disc/4-Wheel ABS” band | — | — | — | **qualifier filter on L5** |
| MOTOR “Heater Core w/ AC” | hvac | hvac-heater-core | *(skip)* | variant label |

*Exact MOTOR → ShopRally component IDs: **pending other agents** (licensed taxonomy import).*

---

## Migration notes (future implementation — out of scope for this DRAFT)

1. Replace horizontal Miller row with **trail + single list**; keep `browseStepOrder()` server-side.
2. Move JOBS list into **middle pane**; reuse `JobsBrowseColumn` rendering.
3. Promote **qualifier band** component for MOTOR-style config rows.
4. Header: use `vehicleDisplayLabel()` + `vehicleMatchLabel()` for cache transparency.
5. Optional: keep Miller as **compact mode** toggle for power users (P3).

---

## Open questions (user approval)

1. **Layout default:** Adopt Tekmetric-style **breadcrumb + list** as default and demote Miller columns to optional? Or hybrid (trail on top + 2–3 visible columns)?

2. **Position in trail vs chips:** For brake pads, prefer trail `… › Front › Replace` (Tekmetric deep breadcrumb) or `… › Replace pads` + **Front/Rear chips** in middle (closer to current ShopRally facets)?

3. **Qualifier band placement:** Above middle results (AutoLeap/MOTOR) or only in right detail panel?

4. **Engine required on YMM:** Require engine pick when YMM has multiple engines before browse, or allow YMM-only with “pick engine to refine” banner?

5. **Cache write key:** Confirm **always write `ymm:`** even on VIN decode (VIN key as match accelerator only) — matches user requirement; contradicts current `primaryVehicleKey()` VIN-first write. **Approve changing write-through to YMM-primary?**

6. **Duplicate Tekmetric segments** (`Steering > Steering > …`): Normalize in UI display (collapse consecutive duplicates) or show raw provider path?

7. **Related / Additional labor** (Tekmetric Video 2): Show as expandable section in middle pane, or separate “Suggestions” tab?

8. **MOTOR licensed taxonomy:** Wait for agent import before renaming components (e.g. map “Disc Brakes” → `brakes-pads` + `brakes-rotors` split)?

9. **CV axle corners:** Standardize on **Front/Rear** only, or full **FL/FR/RL/RR** when MOTOR provides four corners?

10. **Cart persistence:** Keep Tekmetric-style cart visible while browsing (right column split: detail top, cart bottom)?

---

## Appendix — source files

| Recording | Path | Frames |
|-----------|------|--------|
| Video 1 | `39484576-C64E-4B83-9EA2-72741CC521AD.MP4` | `docs/design/labor-video-frames/39484576_*.jpg` |
| Video 2 | `62F7BBC4-B69C-43DE-AE5A-DDE93D2F602D.MP4` | `docs/design/labor-video-frames/62F7BBC4_*.jpg` |
| Video 3 | `40A71B5C-113B-4ABD-932F-559532300AD1.MP4` | `docs/design/labor-video-frames/40A71B5C_*.jpg` |

**Extraction command used:** `ffprobe` duration + `ffmpeg -vf fps=1/N` (~9s interval for 115–152s clips, ~4s for 56s clip).

---

*DRAFT — for review only. No production code modified.*
