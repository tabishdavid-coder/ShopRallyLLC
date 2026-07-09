# Estimate Building — Parts Ordering UX

**Component:** `src/components/estimate-building/estimate-lab-parts-menu.tsx`  
**Context:** `EstimateLabPartsProvider` + `useEstimateLabParts()`  
**Preview:** http://localhost:3004/design-review/estimate-building?ro={id}  
**Last updated:** 2026-07-05 (v8 — Needed/Quoted/Ordered pipeline + job assignment)

---

## Pipeline (Tekmetric PartsHub + AutoLeap tab)

Parts attach to jobs via `PartLine.jobId`. Status drives the ordering workflow:

| Status | Entry path | Server action |
|--------|------------|---------------|
| **NEEDED** | Job card **+ Add part** (inline) | `addPartLine` |
| **QUOTED** | Phone order / PartsTech in parts panel | `addPhoneOrderPart`, `importMappedParts` |
| **ORDERED** | Submit order on Quoted tab | `markPartsOrdered` |

**Quoted tab:** per-part job reassignment (`reassignPartLineJob`) before PO submit — see `PARTS-JOB-ASSIGNMENT.md`.

**Surfaces:** Parts ordering **tab** (compact pipeline + vendor buttons) and slide-over **home** view (full pipeline + vendor rail).

---

## Pattern chosen: **Option A + B blend**

| Option | What we took | Why |
|--------|----------------|-----|
| **A — Slide-over panel** | Primary shell: Radix `Sheet` sliding from **right** (desktop) or **bottom** (mobile ≤767px), dimmed backdrop (`bg-black/45`), estimate stays visible behind | Tekmetric keeps the advisor in estimate context while adding parts; avoids full-page nav like AutoLeap’s **Parts ordering** tab |
| **B — Vendor rail** | Persistent **Source** rail (desktop) left of search/cart content | AutoLeap’s vendor cards (Manual, PartsTech, Nexpart, etc.) map to a scannable rail; faster re-source switching than modal back-stack |
| **C — Inline expand** | Not used as primary | Tekmetric’s **+ Add part** stays on the job card footer; header **Parts** button opens the same panel (step 2 = vendor picker) |

**Rationale:** Tekmetric wins on **context preservation** (estimate + GP footer still visible). AutoLeap wins on **multi-vendor discovery** (card grid / connected badges). ShopRally blends both: in-place animated panel + vendor rail, without cloning AutoLeap’s full-tab parts module or Tekmetric’s green-outline-only inline flow.

---

## Animation

- **Overlay:** fade in/out, 300ms, semi-opaque navy-friendly dim + light blur
- **Panel:** `translate` slide — `slide-in-from-right` / `slide-out-to-right` on desktop; `slide-in-from-bottom` on mobile
- **Width:** `min(44rem, calc(100vw - 1rem))` — wide enough for rail + results, not full viewport
- **Implementation:** custom `SheetPrimitive.Content` (same Radix Dialog primitive as shadcn Sheet) — no centered modal

---

## Flow

1. **Trigger** (any opens panel with optional `jobId` pre-select):
   - Job card header **Parts** button (lab, beside Assign technician)
   - Job card footer **+ Add part**
   - Order summary rail **Actions → Parts ordering**
2. **Desktop:** vendor rail → PartsTech | Manual | Wholesale stub | Tire stub
3. **Mobile:** home grid of vendor cards (same four sources)
4. **PartsTech:** job picker → punchout or inline search → multi-select → **Add N parts to job** (`importMappedParts`)
5. **Manual:** description / PN / qty / cost → **Add part to job** (`addPhoneOrderPart` → **QUOTED**)
6. **Home / Parts tab:** Needed → Quoted → Ordered pipeline grouped by job
7. **Close:** X or backdrop click → panel animates out; estimate unchanged until refresh after add

---

## Tekmetric vs AutoLeap reference

| Behavior | Tekmetric | AutoLeap | ShopRally lab |
|----------|-----------|----------|------------|
| Parts entry on job | **+ ADD PART** on job card (inline row) | Parts on service line grid in Services tab | Footer **+ Add part** + header **Parts** → slide-over |
| Vendor ordering | Separate parts workflow / integrations | Dedicated **Parts ordering** tab w/ vendor cards | Slide-over vendor rail (not a RO tab) |
| Catalog search | Labor Guide bundles parts into jobs | Browse / MOTOR canned services | PartsTech search + punchout in panel |
| Assign to job | Implicit (part added to open job) | Per-service assignment | Job `<Select>` in panel; pre-filled from trigger job |
| Stay on estimate | Yes | Tab switch away from Services | Yes — panel overlay |

---

## Files

| File | Role |
|------|------|
| `estimate-lab-parts-pipeline.tsx` | Needed / Quoted / Ordered tabs + job reassignment |
| `estimate-lab-parts-menu.tsx` | Slide-over UI + vendor rail + PartsTech/manual flows |
| `estimate-lab-parts-tab.tsx` | Parts ordering tab — compact pipeline + vendor buttons |
| `estimate-lab-parts-provider.tsx` | `openPartsMenu({ jobId?, mode? })` + `hubParts` context |
| `src/lib/hub-parts.ts` | `buildHubParts` flattening job part lines |
| `estimate-lab-jobs-list.tsx` | Wires `onJobAddPart` → provider |
| `estimate-job-card.tsx` | Lab header **Parts** + footer **+ Add part** |
| `estimate-lab-right-rail.tsx` | Actions → Parts ordering |
| `estimate-building-lab-panel.tsx` | Provider wrapper + integration status |

---

## Commercial safety

- UI labels: **Parts ordering**, **Manual ordering**, **PartsTech**, **Wholesale catalog** — no competitor product names
- Stubs for unconnected wholesalers (roadmap copy only)
- ShopRally navy header, light-blue accents, no AutoLeap teal or Tekmetric green CTAs in this panel

---

## Test checklist

1. Open lab with an estimate RO that has ≥1 job
2. Click job header **Parts** → panel slides in; desktop shows vendor rail + “Choose a supplier”
3. Select **PartsTech** → search → pick parts → add → job part lines refresh
4. **+ Add part** on same job → job pre-selected in manual/PartsTech forms
5. **Actions → Parts ordering** from right rail → same panel, no job pre-select
6. Resize to mobile width → panel slides from bottom; vendor cards on home step
7. Read-only RO → browse allowed; add buttons disabled
