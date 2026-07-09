# Shop Library Miller Column Flow — Design Spec

**Date:** 2026-07-05  
**Scope:** ShopRally CRM Dev :3004 — Shop Library browse + add jobs from Labor Guide  
**Primary UI:** `SmartLaborGuide` (full-screen dialog on RO estimate / Estimate Building Lab)

---

## Executive summary

ShopRally already ships a **5-column Miller browse** inside `SmartLaborGuide`: System → Component → Position → Operation → Jobs. The JOBS column loads vehicle-scoped labor hits (global cache + shop canned jobs + optional catalog) when the path is complete. What was missing for screenshot parity: **quick-pick chips that pre-fill the column path** (not just text search), unified canned-job add behavior, keyboard nav, and consolidation with the separate canned-template browse sheet.

This doc audits the current stack, compares competitor patterns, proposes the target architecture, and lists incremental backlog.

---

## Phase 1 — Codebase audit

### Surfaces that expose Shop Library / labor browse

| Surface | Component | Miller columns? | Data source | Add action |
|--------|-----------|-----------------|-------------|------------|
| RO Labor Guide dialog | `smart-labor-guide.tsx` | **Yes** (5 cols) | `browseLaborGuideSubcategory` | Cart → `addLaborGuideJob` or `onAddLines` |
| Estimate lab — Labor lookup on job card | `estimate-lab-labor-provider.tsx` → SmartLaborGuide | Same | Same | `addLines` → existing job labor grid |
| Estimate lab — Browse templates | `estimate-lab-canned-browse-sheet.tsx` | **No** (single-step drill + breadcrumb) | Client-filtered `CannedJobSummary[]` | `addCannedJobToRepairOrder` |
| Quick Labor page | `quick-labor-guide-panel.tsx` | Yes (4–5 cols, no cart) | `browseQuickLabor` | Copy hours only |
| RO hero toolbar | `ro-estimate-hero-toolbar.tsx` | Opens SmartLaborGuide | Same | Create job |
| Job launcher | `estimate-job-launcher.tsx` | Opens SmartLaborGuide | Same | Create job |

**Preview URL (Estimate Building Lab):**  
`http://localhost:3004/design-review/estimate-building?design=open`  
→ Open an RO → **Labor lookup** on a service card row, or **Labor Guide** from job launcher / hero toolbar.

### Taxonomy layers

```
SYSTEM       LABOR_CATEGORY_TREE[].id          e.g. brakes
COMPONENT    subcategories[].id                e.g. brakes-pads
POSITION     SUBCATEGORY_NAV.positions         e.g. front | rear
OPERATION    SUBCATEGORY_NAV.operations        e.g. pads-rr
JOBS         LaborGuideHit[]                   cached | shop_custom | catalog | ai_estimate
```

**Files:**

- Tree: `src/lib/labor-categories.ts` (`LABOR_CATEGORY_TREE`, `classifyOperation`, `matchOperationsToSubcategory`)
- Facets: `src/lib/labor-nav-facets.ts` (`SUBCATEGORY_NAV`, `applyBrowseFacets`, `browseSyntheticQuery`)
- Hit types: `src/lib/labor-guide-types.ts`
- Variant expansion: `src/lib/labor-guide-variants.ts`

### Server actions

| Action | File | Purpose |
|--------|------|---------|
| `browseLaborGuideSubcategory` | `server/actions/labor-guide.ts` | Merge cache + canned + catalog; filter by facets |
| `searchLaborGuide` | same | Text search; **no AI** on debounce |
| `generateLaborSuggestion` | same | Explicit AI; cache-first |
| `addLaborGuideJob` | same | Create **one** RO `Job` + `LaborLine[]` from cart |
| `addCannedJobToRepairOrder` | `server/actions/canned-jobs.ts` | Clone template → full job (labor + parts) |
| `fetchCannedJobDetail` | same | Preview for browse sheet |

**Browse pipeline (`browseLaborGuideForVehicle`):**

1. `browseCachedLaborBySubcategory(vehicle, subcategoryId)` — global `LaborOperation` cache keyed by YMM/VIN
2. `searchCannedHits(shopId, "", subcategoryId)` — shop `CannedJob` rows classified into subcategory
3. Optional `fetchCatalogLaborGuide` when catalog service enabled
4. `mergeHits` dedupe
5. `applyBrowseFacets(hits, subcategoryId, positionId, operationId)` — position/operation keyword filters

### Prisma models (relevant fields)

**CannedJob** — shop template; no structured taxonomy columns (only free-text `category` string). Classification is **runtime** via `classifyOperation(name, description)`.

**Job** — RO service card; created by `addLaborGuideJob` (labor only) or `addCannedJobToRepairOrder` (labor + parts).

**LaborLine** — `description`, `hours`, `rateCents`, `totalCents` (cents), scoped by `shopId` + `jobId`.

**Gap:** No DB columns for `systemId`, `componentId`, `positionId`, `operationId` on `CannedJob`. Browse path matching is heuristic on name/description.

### Estimate lab — Labor lookup wiring

```567:584:src/components/repair-order/estimate-job-card.tsx
  function addLaborLookup() {
    if (!canEdit) return;
    if (isLab && laborGuide) {
      laborGuide.openLaborGuide({
        onAddLines: (lines) => {
          const rows = laborRowsFromGuide(lines);
          // ... append to editing job labor grid
        },
      });
      return;
    }
    addLaborLine();
  }
```

`EstimateLabLaborProvider` sets `addMode="addLines"` and `submitLabel="Add to job"` when opened with `onAddLines`.

### What exists vs screenshot target

| Requirement | Status |
|-------------|--------|
| 5 Miller columns with selection highlight | ✅ `BrowseColumn` in `smart-labor-guide.tsx` |
| JOBS empty until path complete | ✅ `browseReady` gate |
| JOBS lists matching jobs | ✅ `browseLaborGuideSubcategory` + `JobsBrowseColumn` |
| Search bar + AI generate | ✅ debounced cache search + Generate button |
| Chips Front/Rear/Struts | ⚠️ **Was search-only** → **fixed 2026-07-05** via `shop-library-chip-paths.ts` |
| Click job → add to current job (lab) | ✅ single-variant quick-add; multi-variant → detail panel |
| Click canned template → full job w/ parts | ⚠️ Labor guide adds **labor lines only**; use browse sheet for full template |
| Breadcrumb trail above columns | ❌ columns only (breadcrumb in detail panel) |
| Keyboard column nav | ❌ backlog |
| Unify canned browse sheet w/ Miller | ❌ two UXes today |

---

## Phase 2 — Competitor / pattern research

### Tekmetric

- **No Miller columns** in public docs. Labor Guide is **search-first** inside estimate: vehicle issues menu, Build Estimate launcher, per-job actions.
- Integrations (ProDemand, ALLDATA) open **provider UIs** or transfer lines — not a fixed 5-column ShopRally taxonomy.
- **Smart jobs** = pre-built jobs with auto labor/parts lookup; **canned jobs** = shop templates; separate from guide search.
- **UX takeaway:** Tekmetric optimizes for **search + smart job picker**, not category drilling. ShopRally’s Miller flow is a **differentiation / shop-library** pattern (closer to filesystem column view).

### AutoLeap

- **Browse canned services** modal: source tabs (AutoLeap / MOTOR / Mitchell), table with Add per row — **not Miller columns**.
- **Search canned services** typeahead bypasses categories.
- MOTOR labor integrated in estimate; canned services are shop templates.
- **UX takeaway:** Search bypasses hierarchy; browse is **flat list after filter**, not sequential columns.

### Shopmonkey (industry pattern)

- Category drill-down in job builder reported anecdotally as **list + breadcrumb** (similar to `EstimateLabCannedBrowseSheet`), not always simultaneous columns.
- Add Service copies template to RO (`addCannedJobToRepairOrder` parity).

### Miller columns — UX patterns (general)

| Pattern | Recommendation for ShopRally |
|---------|---------------------------|
| Selection state | Left border + background (`border-l-brand-light bg-brand-light/15`) — already used |
| Chevrons on selected row | ✅ indicates deeper column opens |
| Lazy load JOBS | Fetch on path complete only — ✅ `loadBrowseResults` |
| Search bypass | Clears column state, shows flat results — ✅ |
| Keyboard | ↑↓ within column, → next column, ← previous — **backlog** |
| Empty JOBS | Offer AI generate with `browseSyntheticQuery` — ✅ |
| Partial path | Later columns hidden until prerequisites selected — ✅ `showPositionColumn` / `showOperationColumn` |
| Horizontal scroll | `overflow-x-auto` on column row — ✅ |

---

## Phase 3 — Architecture proposal

### Data model mapping

| Miller level | Source today | Future option |
|--------------|--------------|---------------|
| SYSTEM | `LaborCategory.id` | Keep static tree |
| COMPONENT | `LaborSubcategory.id` | Keep static tree |
| POSITION | `PositionFacet.id` in `SUBCATEGORY_NAV` | Optional `CannedJob.positionFacetId` |
| OPERATION | `OperationFacet.id` | Optional `CannedJob.operationFacetId` |
| JOBS | `LaborGuideHit` union | Same |

**Do not add DB taxonomy yet** unless shops need explicit template placement beyond `classifyOperation`. Heuristic matching works for v1; misfires go to AI generate or Settings → Canned Jobs edit.

### State machine (browse mode)

```
idle
  → selectSystem(categoryId)           → systemSelected
  → selectComponent(subcategoryId)     → componentSelected
  → [optional position-first path]
      selectPosition → selectOperation → pathComplete → loadingJobs → jobsListed
  → [optional operation-first path]
      selectOperation → selectPosition → pathComplete → loadingJobs → jobsListed

searchMode (request non-empty)
  → debounced searchLaborGuide → searchResults | zeroHits → offer AI

detailMode (selectedHit)
  → variant table → addVariantToCart

cartConfirm
  → addMode=createJob  → addLaborGuideJob
  → addMode=addLines   → onAddLines callback
```

**Transitions that reset downstream:**

- Changing system clears component, position, operation, hits.
- Changing component clears position, operation, hits; may auto-set `position=all` when operation required but position not.
- Search input clears all column selections.

### API / actions

| User action | API | Notes |
|-------------|-----|-------|
| Complete browse path | `browseLaborGuideSubcategory(vehicleId, subId, pos?, op?)` | Server-side facet filter |
| Type in search | `searchLaborGuide(vehicleId, query)` | Cache + canned; no AI |
| Generate | `generateLaborSuggestion(vehicleId, query)` | AI + cache write |
| Add labor cart | `addLaborGuideJob(roId, name, lines)` | New job, labor only |
| Add to existing job | Client `onAddLines` | Estimate lab only |
| Add full canned template | `addCannedJobToRepairOrder(roId, cannedJobId)` | Labor + parts job |

**Proposed unified resolver (backlog):**

```ts
resolveShopLibraryJobs({
  vehicleId,
  path?: BrowsePath,
  query?: string,
}): LaborGuideHit[]
```

Single server entry; client chooses browse vs search.

### Integration with EstimateLabLaborProvider

1. Provider mounts hidden `SmartLaborGuide` with RO/vehicle context.
2. Job card **Labor lookup** calls `openLaborGuide({ onAddLines })`.
3. Writer completes Miller path or search → adds variants to cart → **Add to job**.
4. Cart lines map to `LaborRow[]` with matrix pricing in `estimate-job-card.tsx`.

**Canned job hits in JOBS column:** Today treated as labor-only variants. For full template (parts), either:
- **A)** Double-badge UI: "Template" row → `addCannedJobToRepairOrder` on click (backlog), or
- **B)** Keep labor guide labor-only; direct users to **Browse templates** sheet for parts templates.

Recommend **A** for parity with screenshot "add job" semantics.

### AI search path

| Mode | Trigger | Cost | Result |
|------|---------|------|--------|
| Cache search | Debounced typing | $0 | `LaborGuideHit[]` list |
| Browse | Column complete | $0 | Filtered hits |
| AI generate | Generate button / Enter / empty JOBS | Anthropic on miss | Single hit → detail or cart |

Stub vs real: **Real** via `lookupLaborSuggestion` → `generateLaborSuggestion`. Never auto-call AI from debounced search (by design).

### Edge cases

| Case | Behavior |
|------|----------|
| Partial path | JOBS column not rendered; no fetch |
| Empty JOBS | Message + Generate with `browseSyntheticQuery` |
| Front-only cache, user wants rear | `browsePositionHint` + chip/search derive sibling |
| Pads-only vs pads+rotors | Operation facet `pads-rr` excludes combined rotor rows |
| Multi-variant hit | Open detail panel; per-variant + buttons |
| Canned job w/ parts in labor guide | Single labor variant from total hours — **lossy**; use template add (backlog) |
| Multi-select jobs | Not supported — cart is single job builder |
| Tire/brake chips | Extend `SHOP_LIBRARY_CHIPS` with `browsePath` entries |
| Tenancy | All server actions use `getShopId()`; never trust client `shopId` |

### Component structure (target)

```
src/components/shop-library/
  shop-library-miller.tsx      # shared BrowseColumn + column row (extract from smart-labor-guide)
  shop-library-toolbar.tsx     # search, chips, disclaimer
  shop-library-jobs-column.tsx # JOBS list + empty state
  use-shop-library-browse.ts   # shared state machine hook

smart-labor-guide.tsx          # composes above + cart + dialog chrome
quick-labor-guide-panel.tsx    # composes above, no cart
estimate-lab-canned-browse-sheet.tsx  # migrate to Miller or embed shared hook
```

**Incremental:** Phase 4 shipped chip path module only; full extract is backlog.

---

## Phase 4 — Implementation status (2026-07-05)

### Shipped this session

1. **`src/lib/shop-library-chip-paths.ts`** — Front brakes, Rear brakes, Struts → full browse paths.
2. **`smart-labor-guide.tsx`** — Chips call `applyBrowsePath()` instead of text search when `browsePath` defined.
3. **`quick-labor-guide-panel.tsx`** — Same chip behavior for Quick Labor parity.

### Already in codebase (no change required)

- 5-column Miller UI and JOBS loading in `SmartLaborGuide`
- Server browse/search/generate/add actions
- Estimate lab labor provider add-to-job mode

### Backlog

| Priority | Item |
|----------|------|
| P1 | Extract shared `useShopLibraryBrowse` hook (DRY smart-labor + quick-labor + canned sheet) |
| P1 | Canned job row in JOBS → `addCannedJobToRepairOrder` when `source=shop_custom` and not in addLines mode |
| P2 | Horizontal breadcrumb strip above columns (click to truncate path) |
| P2 | Keyboard navigation (↑↓/←/→, Enter) |
| P2 | Merge `EstimateLabCannedBrowseSheet` into Miller flow or embed same hook |
| P3 | Optional `CannedJob` taxonomy columns + admin UI |
| P3 | Multi-select cart / add multiple jobs at once |
| P3 | Tire chip + more quick picks |

---

## Files reference

| File | Role |
|------|------|
| `src/components/repair-order/smart-labor-guide.tsx` | Full Shop Library dialog + Miller + cart |
| `src/components/quick-labor/quick-labor-guide-panel.tsx` | Standalone labor reference |
| `src/lib/labor-categories.ts` | SYSTEM/COMPONENT tree |
| `src/lib/labor-nav-facets.ts` | POSITION/OPERATION facets + filters |
| `src/lib/shop-library-chip-paths.ts` | Quick-pick → browse path |
| `src/components/estimate-building/estimate-lab-labor-provider.tsx` | Lab labor lookup host |
| `src/components/estimate-building/estimate-lab-canned-browse-sheet.tsx` | Canned template browse (alternate UX) |
| `src/server/actions/labor-guide.ts` | Browse/search/generate/add labor |
| `src/server/actions/canned-jobs.ts` | Template CRUD + add to RO |
| `prisma/schema.prisma` | `CannedJob`, `Job`, `LaborLine` |

---

## Test plan

1. Open Estimate Building Lab with an RO that has a decoded vehicle.
2. Click **Labor lookup** on a job card → Shop Library opens.
3. Click **Front brakes** chip → columns show Brakes → Brake Pads → Front → Replace brake pads; JOBS loads.
4. Click a single-variant row → appears in cart → **Add to job** → labor rows append to job.
5. Clear dialog; browse manually through Suspension → Struts → Operation → Front → verify JOBS.
6. Type in search → columns clear; cache results list.
7. Empty search with no cache → Generate with AI (if configured).
8. `/quick-labor` — same chip path behavior without cart.
