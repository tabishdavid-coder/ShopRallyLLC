# Labor Book — Brakes Breadcrumb & Duplicate Audit

**Date:** 2026-07-07  
**Scope:** ShopRally ProDemand+Tekmetric v5 (`prodemand-tekmetric-explorer.tsx`)  
**Trigger:** User sees repeated/duplicate content for Brakes — operations, positions, breadcrumb segments, grid rows.

---

## Executive summary

v5 intentionally moved **position out of the breadcrumb** (ProDemand/MOTOR flat-table pattern) but **left operation in the breadcrumb** while also showing operation pills and a left-tree subcategory label. For Brakes subcategories whose names overlap operation facets (“Brake Pads” + “Replace brake pads”), the trail reads as triple repetition. Grid duplicates come from **(a)** loading all axle positions at once with no Front/Rear filter pills, **(b)** `expandBrakeVariants()` synthesizing Front/Rear/Front & Rear from generic cache hits, and **(c)** multiple cache rows merging into identical name+position+hours rows with no grid dedup.

**Recommended ShopRally ladder:** `Vehicle › System › Component` in breadcrumb; **operation + position only in center UI** (pills + Pos column). Generalize: never put a facet segment in the breadcrumb if the same noun already appears in the left-tree selection.

---

## Phase 1 — Code trace

### Brakes taxonomy (`labor-categories.ts`)

| Subcategory ID | Label | Keywords (sample) |
|----------------|-------|-------------------|
| `brakes-pads` | Brake Pads | brake pad, pad replacement, pad r&r |
| `brakes-rotors` | Rotors & Drums | rotor, drum brake, resurface |
| `brakes-calipers` | Calipers & Hardware | caliper, slide pin, bracket |
| `brakes-lines` | Lines & Hoses | brake line, bleed, master cylinder |
| `brakes-abs` | ABS & Traction | abs, wheel speed sensor |
| `brakes-parking` | Parking Brake | parking brake, e-brake |

Classification breadcrumb template (per hit): `Brakes › {Subcategory}` — lines 437–442.

### Browse step order (`labor-browse-hierarchy.ts` + `labor-nav-facets.ts`)

| Subcategory | `facetOrder` | `browseStepOrder()` | Miller intent |
|-------------|--------------|---------------------|---------------|
| `brakes-pads` | **position-first** (default) | `["position", "operation"]` | Front/Rear → Replace pads |
| `brakes-rotors` | **operation-first** | `["operation", "position"]` | Replace rotors → Front/Rear |
| `brakes-calipers` | **operation-first** | `["operation", "position"]` | Replace caliper → Front/Rear |
| `brakes-lines` | operation-first | `["operation"]` only (Vehicle-wide position) | Bleed / Lines |
| `brakes-abs` | — | `["position"]` only (no operation facets) | Vehicle-wide |
| `brakes-parking` | position-first | `["position"]` only | Front/Rear |

Config refs: `SUBCATEGORY_NAV` lines 122–140 in `labor-nav-facets.ts`; `browseStepOrder()` lines 39–49 in `labor-browse-hierarchy.ts`.

### What v5 actually builds today

**Breadcrumb** (`prodemand-tekmetric-explorer.tsx` lines 150–152):

```ts
browseBreadcrumbParts(selectedSubcategoryId, null, browseOperationId);
```

`positionId` is **always `null`** — position never appears in the trail.

**Browse fetch** (lines 199–209): passes `positionId: null` to server; gates with `shouldLoadBrowseResults(subcategoryId, "all", operationId)`.

**Center filters** (lines 651–657): **Operation pills only** — no Front/Rear/All position pills (design doc wireframe shows both).

**Grid** (lines 216, 674–695): `hitsToGridRows(res.hits, "all")` — all axle variants visible; Pos column shows Front/Rear.

#### Breadcrumb segments generated today (by subcategory)

Assume vehicle `2010 Honda Civic`, operation pill auto-selects first facet on subcategory pick.

| Subcategory | Left tree highlight | Breadcrumb segments (after vehicle) | Operation pill (center) | Position in trail? | Position in grid? |
|-------------|--------------------|---------------------------------------|-------------------------|-------------------|-------------------|
| **Brake Pads** | Brake Pads ● | `Brakes › Brake Pads › Replace brake pads` | Replace brake pads (selected) | **No** | **Yes** — Front + Rear rows |
| **Rotors & Drums** | Rotors ● | `Brakes › Rotors & Drums › Replace rotors` | Replace rotors | No | Yes |
| **Calipers & Hardware** | Calipers ● | `Brakes › Calipers & Hardware › Replace caliper` | Replace caliper | No | Yes |
| **Lines & Hoses** | Lines ● | `Brakes › Lines & Hoses › Bleed / flush` | Bleed / flush | No | Vehicle (—) |
| **ABS & Traction** | ABS ● | `Brakes › ABS & Traction` | (none) | No | — |
| **Parking Brake** | Parking ● | `Brakes › Parking Brake` | (none) | No | Front + Rear if hits exist |

**Design doc mismatch:** `labor-book-prodemand-tekmetric.md` line 23 wireframe shows  
`Brakes › Brake Pads › Front › Replace brake pads` — **not implemented** in v5 code.

**Classic Miller (`smart-labor-guide.tsx`)** line 666 passes **both** `selectedPosition` and `selectedOperation` to `browseBreadcrumbParts` — full 5-segment trail. v5 diverged from Classic without updating breadcrumb builder.

### Operation facets vs grid row labels — where “Front”/“Rear” appear twice

| Surface | Brake Pads example | Duplicate? |
|---------|-------------------|------------|
| Left tree | “Brake Pads” | — |
| Breadcrumb L2 | “Brake Pads” | **Repeats tree** (expected — trail confirms selection) |
| Breadcrumb L3 | “Replace brake pads” | **Repeats “pads”** from L2 + tree |
| Operation pill | “Replace brake pads” | **Repeats breadcrumb L3** |
| Grid Operation col | “Brake Pads R&R” | **Repeats “Brake Pads”** again |
| Grid Pos col | “Front”, “Rear” | Correct sole position surface (when no filter) |
| Detail pane | “Brake Pads R&R — Front” | Position appended to name (third “pads” context) |

For **rotors/calipers** (operation-first): operation appears in breadcrumb + pills; position only in Pos column — **less noun stacking**, still no position filter pills.

### Duplicate grid rows — root causes

| # | Source | Mechanism | File:line |
|---|--------|-----------|-----------|
| 1 | **Variant expansion** | Generic hit `"Brake Pads R&R"` (no front/rear in text) → `expandBrakeVariants()` emits **3 rows**: Front, Rear, Front & Rear | `labor-guide-variants.ts` 482–487 |
| 2 | **Multi-hit merge** | Separate cache rows for front/rear pads + generic pads query → same name+position+hours after expansion | `labor-guide.ts` 159–171 `mergeHits`; `hitsToGridRows` (no dedup before fix) |
| 3 | **All-positions browse** | v5 passes `positionId: null` / `"all"`; `applyBrowseFacets` does not filter by axle; mock fallback merges front+rear via `mockJobsAllPositions` | `prodemand-tekmetric-explorer.tsx` 49–63, 199, 216 |
| 4 | **Path-complete bypass** | `shouldLoadBrowseResults(sub, "all", op)` treats `"all"` as truthy positionId, skipping real Front/Rear pick for position-first subcategories | `prodemand-tekmetric-explorer.tsx` 199; `labor-browse-hierarchy.ts` 53–65 |
| 5 | **Combined ops split** | `"Brake Pads & Rotors R&R"` → component split yields Pads only + Rotors only + combined per axle | `labor-guide-variants.ts` 212–240, 437–464 |
| 6 | **Server dedup scope** | `mergeHits` dedupes by `jobName` only — not by position variant; `dedupeEnrichedHits` dedupes by hit `id` only | `labor-guide.ts` 159–184 |

**Not duplicates (by design):** Two rows with same Operation name `"Brake Pads R&R"` but Pos `Front` vs `Rear` and different hours — correct MOTOR/AutoLeap pattern.

### Operation-first vs axle-first (per brake subcategory)

| Subcategory | Pattern | Breadcrumb facet order (if fully wired) | v5 actual trail | Position belongs in |
|-------------|---------|----------------------------------------|-----------------|---------------------|
| Brake Pads | **Axle-first** | Front › Replace brake pads | Op only (no axle) | Grid Pos + filter pills |
| Rotors & Drums | **Operation-first** | Replace rotors › Front | Op only | Grid Pos + filter pills |
| Calipers & Hardware | **Operation-first** | Replace caliper › Front | Op only | Grid Pos + filter pills |
| Lines & Hoses | Operation-first (vehicle) | Bleed / flush | Op only | Row label / includes |
| ABS & Traction | Position-only (vehicle) | (none) | Category › Sub only | Row label |
| Parking Brake | Axle-first | Front › (no op facets) | Category › Sub only | Grid Pos |

---

## Phase 2 — Competitor breadcrumb models

| Product | Brakes / Pads trail | Position | Operation |
|---------|---------------------|----------|-----------|
| **Tekmetric** | `Brakes › Brake Pads › Brake Pads Rear` OR sibling rows | **In breadcrumb OR row label** (inconsistent) | Often embedded in breadcrumb leaf name |
| **ProDemand Estimate Guide** | `System › Group › SubGroup` dropdowns | On **application row** | Row is the operation |
| **MOTOR / AutoLeap** | Left category + flat table | **Pos column** + qualifier band | Operation column; browse tabs for op type |
| **ShopRally v4 (rejected)** | Read-only scope pills `Brakes › Brake Pads` | **Filter chips** Front/Rear/All | Not in trail |
| **ShopRally Classic Miller** | Full trail w/ position + operation columns | Miller Position column → trail segment | Miller Operation column → trail segment |

**Tekmetric pain:** position sometimes in breadcrumb *and* row — same repetition v5 is drifting toward with operation in breadcrumb + pills + grid name.

---

## Phase 3 — Recommended ShopRally breadcrumb model

### Chosen ladder: **Component scope in trail; facets in center**

```
L0  {Vehicle YMM}
L1  {System}           e.g. Brakes
L2  {Component}        e.g. Brake Pads
—   (stop breadcrumb here for v5)
    Center: [Operation pills]  e.g. Replace · Pads & rotors · Inspect
    Center: [Position pills]   e.g. Front · Rear · All   ← missing today
    Grid:   Operation name · Pos · Hrs
```

### Per-subcategory: current vs proposed

| Subcategory | Current v5 breadcrumb | Proposed breadcrumb | Operation | Position |
|-------------|----------------------|---------------------|-----------|----------|
| Brake Pads | `Brakes › Brake Pads › Replace brake pads` | `Brakes › Brake Pads` | Pills only | Pills + Pos col |
| Rotors & Drums | `Brakes › Rotors & Drums › Replace rotors` | `Brakes › Rotors & Drums` | Pills only | Pills + Pos col |
| Calipers & Hardware | `Brakes › Calipers & Hardware › Replace caliper` | `Brakes › Calipers & Hardware` | Pills only | Pills + Pos col |
| Lines & Hoses | `Brakes › Lines & Hoses › Bleed / flush` | `Brakes › Lines & Hoses` | Pills only | Row/includes |
| ABS & Traction | `Brakes › ABS & Traction` | *(unchanged)* | — | Row |
| Parking Brake | `Brakes › Parking Brake` | *(unchanged)* | — | Pills + Pos col |

### Brake Pads worked example (target)

```
2010 Honda Civic › Brakes › Brake Pads
───────────────────────────────────────
Operation:  [Replace●] [Pads & rotors] [Inspect] [Resurface]
Position:   [Front] [Rear] [All●]
───────────────────────────────────────
Operation          Pos    Hrs
Brake Pads R&R     Front  1.00
Brake Pads R&R     Rear   1.00
```

Chip **Front brakes** deep-link: set position pill `Front` + operation `Replace` — **do not** add Front to breadcrumb.

### Generalized rules (all systems)

1. **Breadcrumb = vehicle + system + component** (max 3 segments after vehicle). Facets are not trail levels in v5.
2. **Position never in breadcrumb** when left tree + Pos column already convey scope (ProDemand/MOTOR rule).
3. **Operation never in breadcrumb** when operation pills are visible — pills are the facet control; trail would duplicate.
4. **Collapse noun repetition:** if operation facet label contains subcategory noun (pad/rotor/caliper), use **verb-only pill** (`Replace`, `Inspect`) and keep long label for `aria-label` only.
5. **`browseBreadcrumbParts`:** add `opts: { includeFacets?: boolean }` default `false` for v5; Classic Miller passes `true`.
6. **`browseStepOrder` still drives pill order** — position-first vs operation-first only affects **pill order**, not breadcrumb depth.
7. **Grid dedup key:** `normalize(name)|normalize(position)|hours` after variant expansion.
8. **Variant expansion:** position-specific cache hits must not synthesize opposite axle rows (`expandBrakeVariants` fix).

---

## Code changes in this audit

### Applied (small wins)

| Change | File | Purpose |
|--------|------|---------|
| Skip 3-way brake expansion when hit text already names Front or Rear | `src/lib/labor-guide-variants.ts` | `"Front brake pads"` → 1 row, not 3 |
| Dedupe grid rows by name+position+hours | `src/lib/labor-book-v4-helpers.ts` | Collapse merged cache duplicates |

### Not implemented (next sprint)

| Item | Effort | Impact |
|------|--------|--------|
| Add Front/Rear/All position pills to v5 explorer | Medium | Stops showing both axles by default |
| Truncate breadcrumb at subcategory (omit operation segment) | Small | Removes “pads” triple repeat |
| Wire `browsePositionId` state; stop using `"all"` bypass | Medium | Aligns with `browseStepOrder` for pads |
| Verb-only operation facet labels for brakes | Small | Cleaner pills |
| Update `labor-book-prodemand-tekmetric.md` wireframe | Trivial | Doc/code parity |

---

## Reference map

| Concern | Primary file | Lines |
|---------|--------------|-------|
| Brakes subcategories | `src/lib/labor-categories.ts` | 100–109 |
| Facet config + breadcrumb builder | `src/lib/labor-nav-facets.ts` | 122–140, 321–341 |
| Step order | `src/lib/labor-browse-hierarchy.ts` | 39–49 |
| Chip deep paths | `src/lib/shop-library-chip-paths.ts` | 22–40 |
| v5 breadcrumb (position omitted) | `src/components/labor-book/prodemand-tekmetric-explorer.tsx` | 150–152, 509–535 |
| Grid flatten + dedup | `src/lib/labor-book-v4-helpers.ts` | 68–103 |
| Brake variant expansion | `src/lib/labor-guide-variants.ts` | 481–492 |
| Browse + merge + dedup | `src/server/actions/labor-guide.ts` | 159–184, 278–280 |
| Cache browse | `src/server/labor-guide-cache.ts` | 222–229 |
| Canonical path spec | `src/lib/labor-browse-paths.ts` | 187–209 |
| Design intent | `docs/design/labor-book-prodemand-tekmetric.md` | 10–37 |
| Classic full trail | `src/components/repair-order/smart-labor-guide.tsx` | 664–666 |

---

## Next implementation step

1. **Breadcrumb:** call `browseBreadcrumbParts(sub, null, null)` in v5 (or new `browseScopeBreadcrumbParts`) — trail ends at component.
2. **Position pills:** add `browsePositionId` state + `positionFacetsForSubcategory` pills; pass real `positionId` to `browseLaborGuideSubcategory` and `hitsToGridRows(..., filter)`.
3. **Chips:** `SHOP_LIBRARY_CHIPS` should set position + operation pills on click, not rely on breadcrumb.
4. **QA:** `/dev/labor-mockup` Mock v5 tab + live Labor Book on :3031 — Brakes › Pads with Front filter should show **one** pad row, breadcrumb **three** segments after vehicle.
