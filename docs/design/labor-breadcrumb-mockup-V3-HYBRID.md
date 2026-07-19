# Mock v3 — Hybrid speed + browse

**Date:** 2026-07-07  
**Status:** Design-only — recommended default for Labor Book rebuild approval  
**Scope:** ShopRally Smart Labor Book / Shop Library (:3031)  
**Option label:** **F** (synthesis of Q1 Options A–D + Q2 Option E with chip-sync)  
**Canvas:** `canvases/labor-book-mock-v3-hybrid.canvas.tsx` (ShopRally workspace — open beside chat)

---

## Executive pitch

Mock v3 keeps **Q1 Option A** (trail | results | detail, Miller hidden) for discoverability, but **opens search-first** like Tekmetric and AutoLeap. Repeat jobs hit **chips or typeahead in 1–2 clicks**; cold browse uses a **chip-sync trail** — position and operation appear as **toolbar chips in the middle pane** that write back to the left trail when selected, saving a drill step vs pure Tekmetric breadcrumb. Position handling is **context-aware** via existing `browseStepOrder()` — not one global rule, but one rules engine. Power users get **⌘⇧M Miller toggle** without changing the default.

**Recommended as default?** **Yes.** It is the only option that simultaneously optimizes advisor speed (D), new-hire browse (A), Front/Rear scanning (B chips), and subcategory fidelity (E) without maintaining two navigation metaphors at full width.

---

## What we took from each option

| Source | What Mock v3 steals |
|--------|---------------------|
| **Q1-A** (Tekmetric trail) | 3-pane shell; left trail clickable for escape; middle = one active list; right = detail + add |
| **Q1-B** (hybrid columns) | Front/Rear and operation **chip strips** in middle toolbar — not Miller columns |
| **Q1-C** (Miller today) | Optional **⌘⇧M** power-user column mode; hidden by default |
| **Q1-D** (search-first) | **Default landing = search + chips**; Browse button expands trail; flat results on search hit |
| **Q2-E** (context-aware) | `browseStepOrder()` drives position UX per subcategory |
| **Q2-B** (chips) | Axle-first: position as chips (not trail drill) — 1-click Front↔Rear swap |
| **Tekmetric** | Related labor expandable; cart persists while browsing; inline qualifier links for corner ops |
| **AutoLeap / MOTOR** | Qualifier band above results; flat table when L3 skipped; position in row label where useful |
| **ShopRally today** | `shop-library-chip-paths.ts`, `SUBCATEGORY_NAV`, `applyBrowseFacets`, YMM cache keys |

---

## Core interaction model

### Three modes (one shell)

| Mode | Trigger | Left trail | Middle pane | Right detail |
|------|---------|------------|-------------|--------------|
| **Default** | Open Labor Book | System list (collapsed) | Empty + chip hints + Recent | Empty |
| **Search** | Type in search / ⌘K | Dimmed (“search mode”) | Flat table, position badges on rows | Selected row preview |
| **Browse** | Browse → or chip with partial path | Active path segments | Next decision = **list OR chip strip** | Job preview at leaf |

### Chip-sync rule (Mock v3 signature)

When `browseStepOrder()` requires position or operation:

1. Middle pane shows **chips for the next unresolved facet** (e.g. `[Front] [Rear]`).
2. Picking a chip **writes that segment into the left trail** and loads the next level.
3. Already-resolved facets stay as **toggle chips** — switching Rear updates trail without re-drilling System → Component.

This is faster than Q2-A (pure trail drill) and clearer than Q2-B alone (chips with no trail feedback).

---

## ASCII wireframes — three states

### State 1 — Default (search-first landing)

```
┌─ Smart Labor Book — 2010 Honda Civic · 2.0L · VIN …28415 ─────────────────────────────┐
│ [ Search flat-rate ops for this vehicle…………………………… ]  ⌘K   Recent ▾   Browse →     │
│  Front brakes   Rear brakes   Struts   Rotors   A/C recharge   (chips → full path)  │
├───────────────┬────────────────────────────────────────────┬──────────────────────────┤
│ BROWSE TRAIL  │ RESULTS (empty — search or chip)           │ DETAIL                   │
│ ○ Brakes      │  Type or pick a chip to jump to jobs.      │ Select a row to preview  │
│ ○ Suspension  │  New hire? Browse → starts System list.    │                          │
│ ○ HVAC        │  Recent: Front pads 1.0h · Strut 2.0h     │                          │
├───────────────┴────────────────────────────────────────────┴──────────────────────────┤
│ Cart (0) · Miller off · [⌘⇧M columns]                                    [Add to estimate] │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### State 2 — Search hit (AutoLeap flat table)

```
┌─ Smart Labor Book — 2010 Honda Civic · 2.0L ──────────────────────────────────────────┐
│ [ rear brake pads____________________________________ ]  Clear   Filter: All systems  │
├───────────────┬────────────────────────────────────────────┬──────────────────────────┤
│ TRAIL (dim)   │ SEARCH RESULTS                             │ DETAIL                   │
│ search mode   │ Qualifier: Disc · 4-Wheel ABS              │ Brake Pads R&R — Rear    │
│               │ ┌──────────────────────────────────────────┐│ 1.0 hr · Skill B [Add]   │
│               │ │ 1.0  Brake Pads R&R         Rear   [+] ││                          │
│               │ │ 0.5  Rotor R&R (each)       Rear   [+] ││                          │
│               │ └──────────────────────────────────────────┘│                          │
│               │ No match? [ Browse Brakes → ]                 │                          │
└───────────────┴────────────────────────────────────────────┴──────────────────────────┘
```

### State 3 — Browse deep (axle-first, chip-sync)

```
┌─ Smart Labor Book — 2010 Honda Civic · 2.0L ──────────────────────────────────────────┐
│ [ Search… ]   Chip: Front brakes (active)                              Browse ✓        │
├───────────────┬────────────────────────────────────────────┬──────────────────────────┤
│ BROWSE TRAIL  │ RESULTS                                    │ DETAIL                   │
│ ● Brakes      │ Position: [Front●] [Rear]  ← syncs trail   │ Brake Pads R&R — Front   │
│   Brake Pads  │ Qualifier: Disc · 4-Wheel ABS              │ 1.0 hr · [Add to job]    │
│   Front       │ Operation: [Replace●] [Pads+rotors] [Insp] │ Related labor ▸          │
│   Replace pads│ ┌──────────────────────────────────────────┐│                          │
│               │ │ 1.0  Brake Pads R&R              [+]     ││                          │
│               │ └──────────────────────────────────────────┘│                          │
└───────────────┴────────────────────────────────────────────┴──────────────────────────┘
```

### State 4 — Qualifier variant (assembly + MOTOR band)

```
┌─ Smart Labor Book — 2009 Hyundai Sonata GLS · 2.4L ───────────────────────────────────┐
│ Browse → HVAC › Heating › Heater Core                                                 │
├───────────────┬────────────────────────────────────────────┬──────────────────────────┤
│ ● HVAC        │ Qualifier: With Air Conditioning ●         │ Heater Core R&R w/ AC    │
│   Heating     │ (VIN-derived — not a nav level)              │ 5.2 hr · [Add]           │
│   Heater Core │ ┌──────────────────────────────────────────┐│                          │
│               │ │ ● R&R w/ AC                    5.2  [+]  ││                          │
│               │ │ ○ R&R w/o AC (dim)             4.1  [+]  ││                          │
│               │ └──────────────────────────────────────────┘│                          │
└───────────────┴────────────────────────────────────────────┴──────────────────────────┘
```

---

## Click budget comparison

| Task | Option A (trail) | Option B (columns) | Option D (search) | **Mock v3 (F)** |
|------|------------------|--------------------|--------------------|-----------------|
| Repeat: front brake pads | 5 | 5 | **2** | **2** (chip + add) |
| Cold browse: front pads | 4 | 4 | N/A | **3** (chip-sync position) |
| Front → Rear swap | 2 trail clicks | 1 column | 1 chip/search | **1 chip** |
| Front strut (op-first) | 4 | 4 | **2** | **2** (Struts chip) |
| Heater core w/ AC | 3 | 3 | search or 2 | **2** browse + pick |
| New hire finds brakes | Browse + 2 + drill | Browse + columns | Browse button | Browse + system + component + chips |

---

## Speed shortcuts

| Shortcut | Behavior |
|----------|----------|
| **⌘K** | Focus search; clears trail to search mode |
| **Enter** | Add first / selected result |
| **↑ ↓** | Navigate results |
| **Esc** | Clear search → default chips |
| **Chips** | Jump to complete path per `shop-library-chip-paths.ts` |
| **Recent ▾** | Last 5 added jobs — one-click re-add |
| **Browse →** | Expand left trail to System list |
| **⌘⇧M** | Toggle Miller columns (power user) |

---

## Position decision rules (Q2 resolution)

Mock v3 **locks Q2 to Option E engine + B chip UX** for axle-first categories.

| Subcategory pattern | `browseStepOrder()` | Position UX in Mock v3 | Trail encodes | Middle pane |
|---------------------|---------------------|------------------------|---------------|-------------|
| **Axle-first** | position → operation | Position **chips → trail sync** | `… › Front` | Front\|Rear chips, then op chips |
| **Operation-first** | operation → position | Op in trail, then position chips | `… › Replace strut › Front` | Op list → Front\|Rear chips |
| **Assembly-only** | `[]` | Skip L3 | `… › Heater Core` | Qualifier band + variant rows |
| **MOTOR qualifier-only** | skip L3 | Qualifier band filters L5 | `… › Heating` | Flat variants (w/ AC / w/o AC) |
| **Corner / link ops** | position → operation | **Inline links** under op row (Tekmetric Video 1) | `… › Stabilizer Link` | R&R + Front/Rear/Both links |
| **Flat scan** (optional) | varies | Position in **row label** (AutoLeap) | System › Component only | Full op table |

Implementation mapping: reuse `labor-browse-hierarchy.ts`, `labor-nav-facets.ts`, `browseBreadcrumbParts()`, `applyBrowseFacets()`.

---

## Relation to the 2 test paths

Another agent is building **automated end-to-end paths** in `labor-browse-paths.ts`:

| Path | Pattern | Mock v3 UI mapping |
|------|---------|-------------------|
| **Path 1** — Front brake pads | Axle-first | Chip “Front brakes” → jobs; browse = Brakes → Pads → **Front chip** → Replace chip → add |
| **Path 2** — Front strut | Operation-first | Chip “Struts” → jobs; browse = Suspension → Struts → **Replace chip** → **Front chip** → add |
| **Path 3** (reference) — Heater core | Assembly + qualifier | Browse HVAC → Heating → Heater Core → **qualifier band** → variant pick |

Mock v3 does **not** change hierarchy validation — it only changes **how each Miller step renders** (trail segment vs chip vs flat row). Tests at `npm run test:labor-paths` and `/dev/labor-paths` remain the acceptance gate.

---

## Open items (unchanged from DRAFT)

- MOTOR licensed taxonomy import (component ID mapping)
- Cache write key YMM-primary approval (Question 5)
- Cart split: detail top / cart bottom (Tekmetric Video 2)
- Duplicate trail segment collapse (`Steering › Steering`)

---

## Source files

| Artifact | Path |
|----------|------|
| DRAFT mock | `docs/design/labor-breadcrumb-mockup-DRAFT.md` |
| This doc | `docs/design/labor-breadcrumb-mockup-V3-HYBRID.md` |
| Q1 canvas | `canvases/labor-book-q1-layout.canvas.tsx` |
| Q2 canvas | `canvases/labor-book-q2-position.canvas.tsx` |
| Mock v3 canvas | `canvases/labor-book-mock-v3-hybrid.canvas.tsx` |
| Test paths | `src/lib/labor-browse-paths.ts` |
| Chips | `src/lib/shop-library-chip-paths.ts` |
| Hierarchy | `src/lib/labor-browse-hierarchy.ts` |
| Facets | `src/lib/labor-nav-facets.ts` |

---

*Design-only — no production code modified.*
