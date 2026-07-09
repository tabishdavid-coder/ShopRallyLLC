# Batch 7 — Estimate Lab → Production RO Merge

**Branch:** `feature/estimate-lab-merge` (suggested)  
**Status:** 🟡 In progress — production estimate tab merged (2026-07-05)  
**Sprint:** 1  
**Strategy:** [`COMPETITIVE-GAP-STRATEGY.md`](./COMPETITIVE-GAP-STRATEGY.md)  
**Preview (keep until merged):** http://localhost:3004/design-review/estimate-building

---

## Goal

Ship AutoLeap-style inline estimate building on the **production** repair order estimate tab — not only in the isolated design lab. Close the #1 UX gap vs AutoLeap while keeping Tekmetric-class matrix depth.

**User preference (from product rules):** Direct inline editing on blur/Enter save — not Edit-button-first dialogs for common fields.

---

## Current state

| Surface | URL | UX |
|---------|-----|-----|
| **Lab (target UX)** | `/design-review/estimate-building?roId=` | Inline odometer, customer/RO rail, right rail auth + financials, work tabs |
| **Production estimate** | `/repair-orders/[id]/estimate` | Edit-button-first; sidebar info panel; no lab right rail |
| **Workflow split** | `/workflow` | Job board + `estimate-builder-panel` — partial lab components |

**Lab entry:** `src/components/estimate-building/estimate-building-lab-panel.tsx`  
**Production entry:** `src/app/(app)/repair-orders/[id]/estimate/page.tsx` + `estimate-work-area.tsx`

---

## Merge strategy

**Option A (recommended):** Extract shared `EstimateWorkspace` shell used by lab, production estimate, and workflow panel. Lab route becomes thin wrapper for design review only.

**Option B:** Redirect production estimate tab to lab panel component with `variant="production"` flag.

Use **Option A** to avoid coupling design-review-only toggles to production.

---

## Checklist

### Phase 1 — Shared shell extraction

- [ ] Create `src/components/estimate-building/estimate-workspace.tsx`
  - Props: `ro`, `shopId`, `variant: "lab" | "production" | "workflow"`
  - Composes: header, odometer bar, work area, right rail, totals bar
- [ ] Move layout grid from `estimate-building-lab-panel.tsx` into workspace
- [ ] Lab panel becomes: fetch data → `<EstimateWorkspace variant="lab" />`
- [ ] Production estimate page: fetch data → `<EstimateWorkspace variant="production" />`

### Phase 2 — Right rail (AutoLeap parity)

- [ ] Merge `EstimateLabRightRail` / `EstimateLabRightRailLive` into production layout
  - Authorization counts (Pending / Approved / Deferred / Declined)
  - Order status toggle (Estimate / Invoice) — wire or stub with tooltip
  - Service advisor select (`EstimateLabServiceAdvisorSelect`)
  - Payment status + quick actions
  - Financial rollup (`buildLabFinancial`)
- [ ] Mobile: sheet drawer (already in lab) — verify on 375px
- [ ] Remove duplicate read-only odometer rows from right rail when odometer bar present

**Files:**
- `estimate-lab-right-rail.tsx` — rename or alias `estimate-right-rail.tsx`
- `estimate-lab-customer-ro-section.tsx` — inline fields
- `estimate-lab-odometer-bar.tsx` — hero strip only

### Phase 3 — Inline customer / vehicle / RO fields

Per AutoLeap/Tekmetric blend spec:

| Field | Interaction | Dialog fallback |
|-------|-------------|-----------------|
| Phone, email | Inline input, blur-save | — |
| License plate + state | Inline + select | — |
| Service advisor | Inline Select | — |
| Customer name | Pencil → `EditCustomerDialog` | Business/person |
| Address, tags, notes | "More" → dialog | `EditCustomerDialog` |
| VIN | Display + copy; pencil → dialog | `EditVehicleDialog` |
| Odometer in/out | Hero bar only | — |
| RO # | Read-only | — |

- [ ] Implement `useRoFieldSave` hook (pattern from odometer bar) for phone/email/plate
- [ ] Hover pencil hint on editable values
- [ ] Empty states: muted "Add phone" → focus into input
- [ ] Demote section-header "Edit" links → "More" or remove when inline covers field

**Files:**
- `estimate-lab-customer-ro-section.tsx`
- `estimate-lab-odometer-bar.tsx`
- Reuse `useRoMileageSave` if exists

### Phase 4 — Estimate editing mode

- [ ] Production: default to inline/view-edit (not `editing=false` until Edit clicked)
- [ ] Keep `isEstimateEditable(ro.status)` gate
- [ ] Matrix pills + toggle in view mode (already in `estimate-job-card.tsx`) — verify on production
- [ ] `EstimateLabJobsList` or merge job list DnD into production job cards
- [ ] Canned search toolbar (`estimate-lab-canned-search`, browse sheet) on production toolbar

### Phase 5 — Work tabs (optional v1.1)

Lab has Concerns | Services | Inspections | Activity | Parts | Attachments.

- [ ] v1: Keep production RO phase stepper tabs; add lab toolbar **inside** Estimate phase only
- [ ] v1.1: Sub-nav under Estimate matching `estimate-lab-work-tabs.tsx` if stepper redundant

### Phase 6 — Cleanup

- [ ] `/design-review/estimate-building` — keep for isolated UX experiments; add banner "Production preview shipped to RO estimate"
- [ ] `/workflow` — align with shared workspace or link "Open full estimate"
- [ ] Remove duplicate components after alias period
- [ ] Update `BUILD-STATE.md` + CLAUDE.md

---

## Files touched (expected)

```
src/components/estimate-building/
  estimate-workspace.tsx          NEW
  estimate-right-rail.tsx         RENAME from estimate-lab-right-rail
  estimate-odometer-bar.tsx       RENAME from estimate-lab-odometer-bar
  estimate-customer-ro-section.tsx
  estimate-building-lab-panel.tsx SLIM
src/app/(app)/repair-orders/[id]/estimate/page.tsx
src/components/repair-order/estimate-work-area.tsx
src/hooks/use-ro-field-save.ts    NEW (optional)
```

---

## Do NOT merge yet (lab-only / stub)

- Attachments tab placeholder
- Parts tab wholesale stubs without PartsTech live
- MOTOR/Mitchell browse tabs (canned only)
- Unsaved-changes modal (backlog — AutoLeap video ref)
- Vehicle swap confirm dialog (backlog)

---

## Test plan

1. Open RO in ESTIMATE status on `/repair-orders/[id]/estimate` — right rail visible desktop, sheet mobile  
2. Edit phone inline → blur → persists → refresh confirms  
3. Odometer in/out save from hero bar; no duplicate odometer in rail  
4. Add canned job from toolbar → job card appears with matrix pill  
5. Authorization counts update when job authorized  
6. WIP/COMPLETED RO — estimate read-only, inline disabled  
7. `/design-review/estimate-building` still works for design iterations  
8. No regression on `/workflow` split view  

---

## Success criteria

- Advisors can complete common estimate edits without opening full customer/vehicle dialogs  
- Sales demo uses production URL, not design-review  
- Matches user rule: AutoLeap inline + Tekmetric matrix, ShopRally branding  

---

## Next batch

After merge: [Forms Hub v1](./FORMS-HUB-TASK.md) (Batch 8)
