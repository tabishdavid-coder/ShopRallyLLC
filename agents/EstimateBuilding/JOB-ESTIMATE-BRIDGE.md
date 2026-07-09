# Job estimate bridge — AutoLeap → ShopRally lab

**Reference video:** `A52B9681-F826-43ED-8814-6FE999059BEA.MP4` (SnagIt)  
**Preview:** http://localhost:3004/design-review/estimate-building?design=open&ro={id}

RO-level blend (header, work tabs) is documented in [`SHOPRALLY-ESTIMATE-BLEND.md`](./SHOPRALLY-ESTIMATE-BLEND.md). This doc covers **per-job estimate building** inside the Services tab.

---

## What AutoLeap does (from video)

| Pattern | Detail |
|--------|--------|
| **No edit mode gate** | Lines and job name are editable in place; no pencil → edit → save cycle per job |
| **Service notes (internal)** | Textarea under every job header, always visible |
| **⋮ job menu** | Add labor, add part, fees/discounts, delete — without entering a separate edit shell |
| **Unified line grid** | Single table: Type · Name · Cost · Price · Qty · Amount · Net · Taxable |
| **Service lookup** | Category sidebar + search modal to add canned/MOTOR-style services |
| **RO-level Save** | One save for the estimate; jobs don’t each require their own save bar |

---

## ShopRally before (lab v9)

- Job card opened in **view mode**; user clicked **Pencil** to edit labor/parts
- **⋮** menu disabled (“coming soon”)
- Job `note` only in edit footer (“visible to customers”)
- Separate labor + parts tables; totals hidden while editing
- Per-job **Save / Cancel** at bottom of edit shell

---

## Bridge implemented (lab v11 — Tekmetric density + AutoLeap inline edit)

| Pattern | ShopRally lab v11 |
|--------|----------------|
| Always-editable job | Auto builder mode when `canEdit` |
| Service notes (internal) | Compact single-line `EstimateLabJobNotes` (blur-save) |
| ⋮ job menu | `EstimateLabJobMenu` — add labor/part, fee, discount, template, delete |
| No per-job Save | **Debounced auto-save** (~1.2s) + Unsaved / Saving / Saved status |
| Service items | Slim header + tighter labor/parts tables |
| Card chrome | **`EstimateLabJobCardShell`** — light border (Tekmetric-clean) |

### Files

| File | Role |
|------|------|
| `src/components/repair-order/estimate-job-card.tsx` | Lab auto-edit, auto-save, compact tables |
| `src/components/estimate-building/estimate-lab-job-notes.tsx` | Internal service notes |
| `src/components/estimate-building/estimate-lab-job-card-shell.tsx` | Shell, save status, table tokens |
| `src/components/estimate-building/estimate-lab-job-menu.tsx` | Per-job ⋮ actions |

### Server actions (unchanged)

- `saveJob` — job name + labor + part lines
- `updateJob` — internal notes (and name/auth flags)
- `addLaborLine` / `addPartLine` — available for future inline blur-save grid

---

## Still to build (backlog)

1. **Unified inline line grid** — single table with blur-save per cell (`updateLaborLine` / `updatePartLine`) instead of draft-then-Save
2. **Service lookup modal** — category rail + search (ShopRally labels only; see `COMMERCIAL-SAFETY.md`)
3. **Collapse edit header chrome** — optional Reset instead of Cancel for lab
4. **Merge to production estimate tab** — after design sign-off

---

## Commercial safety

Do **not** ship competitor strings (“+ Service”, “Search canned services”, teal chrome). Use ShopRally navy/light-blue/red and generic copy: “Add job”, “Browse templates”, “Service notes (internal)”.
