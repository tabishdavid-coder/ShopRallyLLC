# Mock v4 — Tree-Grid Explorer (competitor research + fresh direction)

**Date:** 2026-07-07  
**Status:** Design-only — recommended Labor Book direction (replaces rejected v1 trail + v3 hybrid)  
**Scope:** ShopRally Smart Labor Book / Shop Library (:3031)  
**Pattern name:** **Tree-Grid Explorer** — persistent side tree + live results grid + bottom staging dock  
**Canvas:** `canvases/labor-book-mock-v4-competitor.canvas.tsx` (ShopRally workspace — open beside chat)  
**Prototype:** `/dev/labor-mockup` → **Mock v4 (tree-grid)** tab

---

## Executive pitch (Mock v4)

Advisors don't need another breadcrumb or chip-sync hybrid — they need **one stable map** (MOTOR tree always visible) and **one stable table** (flat-rate rows that update when the tree selection changes). Mock v4 drops the left trail, drops search-first landing, and drops middle-pane navigation lists. **Tree selection drives the grid; position and qualifiers are grid filters, not nav levels.** Row expand shows hours/includes; a **bottom staging dock** holds the cart so the grid stays full-width. Search **filters the tree in place** (highlights + auto-expand) instead of swapping the whole layout to "search mode."

---

## Phase 1 — Competitive research (fresh sources)

Sources: ShopRally SnagIt frame analysis (`labor-breadcrumb-mockup-DRAFT.md`), vendor help docs, Mitchell1 PDFs, RO Writer Epicor docs, NAPA TRACS release notes, Shopmonkey support, Identifix/Shop Manager integration docs, web walkthroughs. **No repackaging of rejected Option A / Mock v3 / Miller.**

### Competitive matrix

| CRM | Entry point | Nav model | Position handling | Search role | Clicks to common job | Strengths | Weaknesses |
|-----|-------------|-----------|-------------------|-------------|---------------------|-----------|------------|
| **Tekmetric** | Labor Guide modal from estimate; full-width search bar | **Drill trail** — breadcrumb + single list replaces each level; right "New Job" cart | Inconsistent: sibling rows (`Front`/`Rear`), breadcrumb segment (`Brake Pads Rear`), or inline qualifier links under one op | Primary — search bar always visible; browse is secondary | **4–5** browse + add (e.g. Brakes → Pads → Front → R&R → +) | Familiar trail escape; cart persists; related labor at leaf; ProDemand tab switch | Trail fatigue on deep paths; position rules vary; list context lost when drilling |
| **AutoLeap + MOTOR** | "Search all services" modal on RO Services tab | **Category rail** — left System/Component nav + flat results table; source tabs (MOTOR Primary/Secondary) | **In operation label** (`Front`, `Rear`, `Each`) + **qualifier band** above table (`Brake: Disc/4-Wheel ABS`) | Inline typeahead + Browse modal; MOTOR sub-tabs (Services/Maintenance/Code) | **3–4** (Brakes → Disc → pick row → +) | Fast flat scan; qualifier band matches VIN config; expand row for includes | Left nav + table split can feel cramped; category back-arrow adds cognitive load |
| **Shopmonkey** | Estimate → Search All Services → **Service Guides** tab | **Category pick + flat service list** inside Services menu (MOTOR OEM) | Embedded in service name; vehicle must be VIN/YMM/LP-linked | Search all service guides OR category browse | **3–4** | Native MOTOR in estimate flow; +Add Service bundles labor+parts; ALLDATA integration option | Thin UX docs — mostly category + search; no public detail on position facets |
| **Mitchell ProDemand** | Vehicle → **Estimate Guide** module (also 1Search Plus for diag) | **Dropdown cascade + breadcrumb** — Engine Performance → Ignition → Spark Plugs; labor/parts/diagrams **on one page** | Usually in operation row on consolidated page | 1Search Plus keyword (diag-first); Estimate Guide is category-first | **3–4** in Estimate Guide | Single-page labor+parts+diagram; breadcrumb back-nav; streamlined 2021 overhaul | Standalone tool — transfer friction into shop CRM; category dropdowns feel desktop-era |
| **ALLDATA Manage Online** | Work screen → OEM Labor Times catalog | **Multi-column catalog** — Part Categories → drill sub-components → shopping cart | Filter list (`Type term to filter`); position often in component drill chain | Category browse + component filter box; Repair app has vehicle info search | **4–6** (category → sub-component chain → add) | Deep OEM linkage; cart metaphor; linked part categories | Feels like 2000s desktop ERP; many clicks for sub-components |
| **ALLDATA Repair** | Parts & Labor page after vehicle select | **Component column drill** — keep clicking Component until sub-component found | Position often implicit in component name | Vehicle Info Search with suggestions → Parts & Labor section | **4–5** | Popular Information shortcut; show-more for deep results | Component column drill is slow for new hires |
| **RO Writer + Epicor** | Smart eCat Catalog tab → Categories toolbar | **Split-stack catalog** — Categories column + simultaneous **Parts section** + **Labor section** | Vehicle condition questions saved to vehicle; specs as expandable notes | Keyword narrows categories column; toolbar **dropdown cascade** (Category → Parts → Labor) post-search | **2–3** if Smart Job pre-configured; **4–5** cold Epicor browse | Parts+labor together; checkbox select + post; specs/notes inline | Dense legacy UI; categories column disappears after search unless toolbar used |
| **NAPA TRACS** | Search menu → Epicor Catalog OR Mitchell Labor Guide | **Epicor unified catalog** (Mitchell labor + industry parts) + **PROJobs** canned resolver | Mitchell groups in Epicor; PROJobs steps through saved description searches | By labor category/group OR description; PROJobs = multi-step canned | **2** (PROJob) / **4–5** (cold Epicor) | PROJobs blazing for repeat work; parts+labor same window | PROJobs setup overhead; stepped resolver confusing for one-off ops |
| **MaxxTraxx** | External labor provider integration (not native) | **No native browse** — links out to ALLDATA/Mitchell/RTLG | Provider-dependent | Provider-dependent | N/A (integration) | Integration-ready; no subscription lock-in | No unified UX — shop juggles external tools |
| **Identifix Direct-Hit / Shop Manager** | RO → +Service → Estimator (MOTOR) or Mitchell1 button | **Keyword-first** — manufacturer/make/model/symptom; multi-guide tabs on one page | Provider-dependent (MOTOR/Chilton/OEM) | **Primary** — keyword + bookmarks; symptom browse | **1–2** search + transfer | Instant keyword; bookmark sections; Mitchell+MOTOR dual providers | Standalone info tool feel; transfer modal breaks flow |

### Five distinct UX patterns (new taxonomy — not A/B/C)

| Pattern | Name | Who uses it | Core mechanic |
|---------|------|-------------|---------------|
| **P1** | **Drill Trail** | Tekmetric, ProDemand Estimate Guide | One list at a time; breadcrumb records path; back truncates |
| **P2** | **Category Rail + Flat Table** | AutoLeap/MOTOR, Shopmonkey Service Guides | Left category list persists; right side is always a scannable table |
| **P3** | **Split-Stack Catalog** | RO Writer Epicor, NAPA TRACS Epicor | Categories column + parts stack + labor stack visible together |
| **P4** | **Command Palette First** | Identifix Direct-Hit, (v3 search-first) | Type to find; browse is fallback; layout swaps to flat hits |
| **P5** | **Canned Job Resolver** | NAPA PROJobs, Tekmetric Smart Jobs (partial) | Pre-saved multi-search recipes; stepped apply to RO |
| **P6** *(Mock v4)* | **Tree-Grid Explorer** | *Proposed ShopRally* | Persistent collapsible MOTOR tree + live grid; filters not levels; bottom dock |

**Mock v4 = P6**, synthesizing the best of P2 (flat table scan) and P3 (persistent category context) while avoiding P1 trail fatigue and P4 layout-swapping confusion.

---

## Why v1 trail and v3 hybrid likely failed

Both rejected directions asked advisors to **manage navigation state** instead of **scanning jobs**. Option A pure trail forces sequential drill with a replacing list — you lose sibling context (can't see Rotors while on Pads) and every back-click is a context switch. Mock v3 hybrid added chip-sync and search-first on top of the same trail metaphor, creating **two competing mental models** (chips write trail, trail truncates chips, search dims trail, Miller toggle adds a third). The result felt like three half-implementations rather than one confident surface — trail fatigue plus hybrid confusion.

---

## Phase 2 — Mock v4 design (ONE bold direction)

### Chosen pattern: Tree-Grid Explorer (P6)

| Principle | Mock v4 rule |
|-----------|--------------|
| **Stable left** | MOTOR taxonomy tree always visible; expand/collapse; never replaced by drill list |
| **Stable center** | Always a **sortable grid** (Op · Position · Hrs · Parts · +); never a nav list |
| **Scope display** | Read-only **scope pills** above grid (`Brakes › Brake Pads`) — not clickable trail |
| **Position** | **Grid toolbar filters** `[Front] [Rear] [All]` driven by `browseStepOrder()` — not tree levels |
| **Qualifiers** | Sticky **config band** above grid (VIN-derived ABS/AC/trans) — AutoLeap pattern |
| **Search** | Filters + highlights tree nodes; grid shows cross-system matches; **no layout swap** |
| **Detail** | **Expand row** (AutoLeap) for includes/skill; no permanent right column |
| **Cart** | **Bottom staging dock** — always visible; detail doesn't compete for width |
| **Add flow** | Row `[+]` → staging dock → **Add to estimate** |

### Why NOT v1 / v3 / Miller

| Rejected | Why Mock v4 differs |
|----------|---------------------|
| **Option A (trail + list)** | No breadcrumb drill; tree stays put; center is never a nav list |
| **Mock v3 (hybrid)** | No chip-sync, no search-first landing, no trail/chip duality, no Miller toggle |
| **Miller columns** | Two panes + dock, not 5 simultaneous columns |

### ShopRally stack alignment

- **MOTOR taxonomy** → left tree nodes map to `LABOR_CATEGORY_TREE` + `SUBCATEGORY_NAV` (licensed import pending)
- **YMM cache** → header shows cache key; grid rows from `LaborOperation` via `ymmVehicleKey`
- **VIN qualifiers** → config band narrows grid rows client-side; tree unchanged
- **`browseStepOrder()`** → controls which filter chips appear (Front/Rear vs op type vs none)

---

## ASCII wireframes — four states

### State 1 — Landing (tree-default)

```
┌─ Smart Labor Book — 2010 Honda Civic · 2.0L · VIN …28415 ──────────────────────────────┐
│ [ Filter tree & operations……………………………………… ]  Scope: All systems   Cache: YMM ✓       │
├──────────────────┬───────────────────────────────────────────────────────────────────────┤
│ MOTOR TREE       │ RESULTS GRID                                                          │
│ ▼ Brakes         │ Pick a component in the tree — or search to filter across all systems.│
│   Brake Pads     │                                                                       │
│   Rotors         │ Popular for this vehicle:                                           │
│   Calipers       │   Front brake pads 1.0h · Rear brake pads 1.0h · Front strut 2.0h     │
│ ▼ Suspension     │                                                                       │
│   Struts         │ (Grid empty until tree leaf selected or search active)                │
│ ▼ HVAC           │                                                                       │
│   …              │                                                                       │
├──────────────────┴───────────────────────────────────────────────────────────────────────┤
│ STAGING (0) · 0.0 hr                                              [Add to estimate →]   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### State 2 — Browse deep (Brake Pads selected)

```
┌─ Smart Labor Book — 2010 Honda Civic · 2.0L ─────────────────────────────────────────────┐
│ [ Filter… ]   Scope pills: Brakes › Brake Pads (read-only)                             │
├──────────────────┬───────────────────────────────────────────────────────────────────────┤
│ MOTOR TREE       │ Filters: [Front●] [Rear] [All]    Config: Disc · 4-Wheel ABS         │
│ ▼ Brakes         │ ┌─────────────────────────────────────────────────────────────────┐   │
│   ● Brake Pads   │ │ Operation          Pos    Hrs   Skill  Parts  │                  │   │
│   Rotors         │ │ Brake Pads R&R       Front  1.0    B       0   [+]               │   │
│   Calipers       │ │ Rotor R&R (each)     Front  0.5    B       2   [+]               │   │
│ ▼ Suspension     │ │ Caliper R&R (each)   Front  0.8    B       0   [+]               │   │
│                  │ └─────────────────────────────────────────────────────────────────┘   │
│                  │ ▾ Expand row: includes inspect hardware; related bleed 0.3h          │
├──────────────────┴───────────────────────────────────────────────────────────────────────┤
│ STAGING (1) · 1.0 hr — Brake Pads R&R Front                         [Add to estimate →] │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### State 3 — Search hit (tree filtered, grid cross-system)

```
┌─ Smart Labor Book — 2010 Honda Civic · 2.0L ─────────────────────────────────────────────┐
│ [ rear brake pads________________________________ ]  Clear   12 matches · tree filtered    │
├──────────────────┬───────────────────────────────────────────────────────────────────────┤
│ MOTOR TREE       │ SEARCH RESULTS (flat grid — all systems)                              │
│ ▼ Brakes ←highlight│ ┌─────────────────────────────────────────────────────────────────┐ │
│   ● Pads ←highlight│ │ Operation           System   Pos   Hrs   │                       │ │
│   Rotors (dim)   │ │ Brake Pads R&R        Brakes  Rear  1.0   [+]                      │ │
│ ▼ Suspension     │ │ Rotor R&R (each)      Brakes  Rear  0.5   [+]                      │ │
│   (collapsed)    │ │ Caliper R&R           Brakes  Rear  0.8   [+]                      │ │
│                  │ └─────────────────────────────────────────────────────────────────┘ │
│                  │ Enter = add first row · ↑↓ navigate · Esc = clear                     │
├──────────────────┴───────────────────────────────────────────────────────────────────────┤
│ STAGING (0) · 0.0 hr                                              [Add to estimate →]   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### State 4 — Add to job (row expand + staging)

```
┌─ Smart Labor Book — 2010 Honda Civic · 2.0L ─────────────────────────────────────────────┐
│ Scope: Brakes › Brake Pads · Filter: Front                                               │
├──────────────────┬───────────────────────────────────────────────────────────────────────┤
│ MOTOR TREE       │ ┌─────────────────────────────────────────────────────────────────┐   │
│   ● Brake Pads   │ │ ▾ Brake Pads R&R — Front                              1.0 hr [+] │   │
│                  │ │   MOTOR 1.0h · Skill B · ymm cache                              │   │
│                  │ │   Includes: inspect hardware                                    │   │
│                  │ │   Shop rate $150 → $150.00                                      │   │
│                  │ └─────────────────────────────────────────────────────────────────┘   │
│                  │ Rotor R&R (each) · Front · 0.5h                              [+]   │
├──────────────────┴───────────────────────────────────────────────────────────────────────┤
│ STAGING (2) · 1.5 hr                                                                    │
│   ✓ Brake Pads R&R — Front 1.0h   ✓ Rotor R&R — Front 0.5h          [Add to estimate →] │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Click budget (Mock v4 vs rejected)

| Task | Option A trail | Mock v3 hybrid | **Mock v4 tree-grid** |
|------|----------------|----------------|------------------------|
| Repeat: front brake pads | 5 | 2 (chip) | **2** (tree: Pads → +) |
| Cold browse: front pads | 4 | 3 | **3** (Brakes expand → Pads → Front filter → +) |
| Front → Rear swap | 2 trail clicks | 1 chip | **1** filter click |
| Compare pads vs rotors | Must back out | Must back out | **0** — click sibling tree node |
| Heater core w/ AC | 2 browse + pick | 2 browse + pick | **2** (HVAC → Heater Core → variant row) |
| New hire: find brakes | Browse → drill | Browse → chips | **1** expand Brakes — see all children |

---

## Top 3 competitor approaches ranked for ShopRally

1. **AutoLeap Category Rail + Flat Table (P2)** — Best balance of scan speed and MOTOR fidelity; qualifier band matches ShopRally VIN strategy. Mock v4 **inherits the flat grid + config band** but upgrades the rail to a **full persistent tree**.

2. **Tekmetric Drill Trail + Cart (P1)** — Best cart persistence and related-labor discovery. Mock v4 **inherits bottom staging dock + related rows** but **rejects replacing lists**.

3. **RO Writer Split-Stack Catalog (P3)** — Best "see parts and labor together" for parts-heavy workflows. ShopRally can add a **Parts column** in the grid later; tree-grid leaves room without parts/labor column competition.

**Honorable mention:** Identifix keyword-first (P4) — keep `/` search as **tree filter**, not a separate mode (learns from v3 rejection).

---

## Implementation notes (future — out of scope)

1. Replace Miller / trail shell with `TreeGridLaborExplorer` component.
2. Tree data from `LABOR_CATEGORY_TREE`; selection sets `{ categoryId, subcategoryId }`.
3. Grid queries reuse `mockJobsForContext` / production cache lookup keyed by selection + filters.
4. `browseStepOrder()` → grid toolbar filter set (not tree depth).
5. Bottom dock replaces right-rail cart from Tekmetric mockups.

---

## Files

| File | Purpose |
|------|---------|
| `docs/design/labor-breadcrumb-mockup-V4-COMPETITOR.md` | This document |
| `canvases/labor-book-mock-v4-competitor.canvas.tsx` | Visual mock — 4 states |
| `src/components/dev/labor-mockup/labor-mockup-v4-panel.tsx` | Interactive v4 tab |
| `/dev/labor-mockup` | Prototype page — select **Mock v4 (tree-grid)** |

---

*Design-only. No production Labor Book rebuild. No commit.*
