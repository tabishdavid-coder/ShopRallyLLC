# Labor Book — ProDemand + Tekmetric Blend

**Date:** 2026-07-07  
**Status:** Implemented as production default on :3031  
**Component:** `src/components/labor-book/prodemand-tekmetric-explorer.tsx`  
**Replaces:** Tree-Grid Explorer v4 as default (Classic Miller toggle retained)

---

## Chosen layout: **3-pane + top breadcrumb**

**Recommendation:** Tekmetric **horizontal breadcrumb on top** + ProDemand **left category accordion** + center flat table + right detail (lg) + bottom staging dock.

ProDemand’s vertical left trail duplicates the MOTOR tree when we already have a persistent accordion — Tekmetric’s top breadcrumb gives escape without stealing left-rail width. Center stays a scannable flat table (ProDemand/MOTOR pattern); position is row labels + center filter pills, not sidebar nav levels.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ VEHICLE HEADER  2017 Audi Q5 Premium Plus · 2.0L Turbo · VIN …A0043        │
│ Body: SUV · Trans: Auto · Drive: AWD          [Config: Disc · 4-Wheel ABS]  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search labor guide…          [Front brakes] [Rear brakes] [Struts] [AC]…  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2017 Audi Q5  ›  Brakes  ›  Brake Pads  ›  Front  ›  Replace brake pads     │
│               ↑ clickable segments truncate path on click                    │
├──────────┬──────────────────────────────────────────────┬────────────────────┤
│ MOTOR    │  FILTERS  [Front] [Rear] [All]               │  DETAIL (lg+)      │
│ tree     │  OP       [Replace pads] [Pads & rotors] …   │  Brake Pads R&R    │
│ (1 open) │  ─────────────────────────────────────────  │  Front · 0.8 hr    │
│ ▾ Brakes │  Operation          Pos    Hrs    +        │  Skill B           │
│   Pads ● │  Brake Pads R&R     Front  0.80   [+]      │  Includes: …       │
│   Rotors │  Brake Pads R&R     Rear   0.90   [+]      │  [Add to job]      │
│ ▾ HVAC   │  …                                           │  Related labor ▸   │
│   …      │                                              │                    │
├──────────┴──────────────────────────────────────────────┴────────────────────┤
│ STAGING (2) · 1.70 hr   [Pads Front 0.8h ×] [Pads Rear 0.9h ×]  [Add to est] │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## What we take from Tekmetric

| Pattern | Implementation |
|---------|----------------|
| Prominent search bar | Full-width below vehicle header; debounced `searchLaborGuide` |
| Horizontal breadcrumb | Clickable `Vehicle › System › Component › Position › Operation`; segment click truncates |
| Quick chips | Popular jobs row (`SHOP_LIBRARY_CHIPS` / `LABOR_BOOK_POPULAR`) |
| Bottom cart / staging | Persistent dock — lines, total hours, **Add to estimate** |
| Related labor | Detail pane “Related” section from hit notes / variants |

## What we take from ProDemand / MOTOR

| Pattern | Implementation |
|---------|----------------|
| Strong vehicle context header | YMM + engine + VIN snippet + spec strip + qualifier band |
| Left category drill | MOTOR accordion — one system expanded; subcategory selects scope |
| Flat operations table | Center grid — position in row, not a nav column |
| Application qualifiers on rows | Position/qualifier in operation label + config band above grid |
| Right detail pane | Hours, includes, Add to job (lg+); row select on smaller screens |

## What we deliberately avoid

| Rejected (v4) | Why |
|---------------|-----|
| Read-only scope pills | Advisors need breadcrumb escape (Tekmetric) |
| Position/Op in sidebar tree | User reverted — center filter pills instead |
| Search swaps entire layout | Search highlights tree + fills center table |
| Replace list at each drill step | Center table always visible once path complete |

---

## Data wiring

| UI region | Server / lib |
|-----------|--------------|
| Left tree | `LABOR_CATEGORY_TREE` |
| Breadcrumb | `browseBreadcrumbParts`, `browseStepOrder` |
| Center filters | `positionFacetsForSubcategory`, `operationFacetsForSubcategory` |
| Center rows | `browseLaborGuideSubcategory`, `searchLaborGuide` |
| Path gating | `shouldLoadBrowseResults`, `labor-browse-hierarchy` |
| Mock fallback | `mockJobsForContext` when cache empty |
| Cart | `variantToCartLine`, `addLaborGuideJob` |

---

## Test URLs

- **Production shell:** http://localhost:3031/design-review/estimate-building → Labor Book
- **Dev mock:** http://localhost:3031/dev/labor-mockup → **Mock v5 (ProDemand+Tekmetric)** tab
- **Classic rollback:** Labor Book dialog → **Classic view** toggle
