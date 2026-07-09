# SnagIt library — Order Process Lab reference catalog

**Local path:** `C:\Users\tabis\AppData\Local\TechSmith\SnagIt\DataStore\`

Open in SnagIt Editor or VLC. Frame extraction:

```powershell
ffmpeg -ss 00:00:05 -i "C:\Users\tabis\AppData\Local\TechSmith\SnagIt\DataStore\{UUID}.MP4" -frames:v 1 agents/OrderProcessLab/output/frames/{name}.png
```

---

## Tier 1 — Intake → estimate (watch first)

| UUID | Product | Topic | Used in |
|------|---------|-------|---------|
| `2BBF85F0-FCA8-415A-8B7F-CFBF33E92BC8.MP4` | AutoLeap | Work board → + Estimate → inline RO → customer/vehicle modals → Services | Intake blend |
| `8EEE20F8-A5C0-48C7-8B86-96315F1469F9.MP4` | AutoLeap | Board → estimate-first RO create (lands on estimate step 1) — **v2 spec reference** | `SHOPRALLY-ESTIMATE-FIRST-INTAKE.md` |
| `7ABF2D71-5914-4759-825C-4F3CB8FAB326.MP4` | Tekmetric | Job board → + Repair Order → single form → duplicate guards → Estimate tab | Intake blend |
| `7B6B4614-73E3-41B4-8567-EDD06481F234.MP4` | AutoLeap | RO #10246 estimate build — toolbar, job cards, sticky totals | Estimate blend |
| `A52B9681-F826-43ED-8814-6FE999059BEA.MP4` | AutoLeap | Per-job inline edit — no pencil mode, ⋮ menu, unified grid | Job bridge |
| `FA2ED0E7-7F18-4096-825E-F808F7B67E57.MP4` | AutoLeap | Right-rail backlog ideas — deferred auth, phase toggle | Right rail IA |

---

## Tier 2 — Supporting context

| UUID | Topic | Used in |
|------|-------|---------|
| `3A79AC83-F44F-48D4-BE87-E7E548484B3D.MP4` | General CRM navigation (frames in `.tmp/video-frames-3A79AC83/`) | Shell UX |
| `DF121B1C-4EC3-4213-AC68-F9690F20418C.MP4` | CRM workflow capture | Research |
| `8D95A0D6-3508-4A63-9672-3963E55972B5.MP4` | Estimate/workspace | Estimate lab |
| `2D255260-D308-4326-A844-C6A1A902D5C1.MP4` | RO workspace | Batch 03 |
| `294B911C-921D-4ED0-8906-279B0A08340C.MP4` | Recent capture (2026-07-05) | Review when refining spec |
| `78165A97-45B2-4084-9753-C041080B8D76.MP4` | Recent capture (2026-07-05 AM) | Review when refining spec |
| `389EFFFD-10D7-4D73-BE1C-64741AA3CB66.MP4` | Recent capture (2026-07-05 AM) | Review when refining spec |
| `B7504AC5-0A03-4D2A-A86B-B4EBB08AA66B.MP4` | Recent capture (2026-07-05 AM) | Review when refining spec |
| `D25F0F07-A06C-4A5E-A7A7-817790D085EC.MP4` | Most recent (2026-07-05 AM) | Review when refining spec |

---

## Tier 3 — Brand / audit (not order flow)

| UUID | Topic |
|------|-------|
| `91AF0A82-2395-4B9B-AF67-05083481E63D.SNAG` | Graphite Garage palette reference — brand contrast audit |

---

## Written research (no video)

| Doc | Topic |
|-----|-------|
| `prototypes/intake-lab/SHOPRALLY-INTAKE-BLEND.md` | Blended intake model |
| `agents/EstimateBuilding/SHOPRALLY-ESTIMATE-BLEND.md` | Estimate layout map |
| `agents/EstimateBuilding/JOB-ESTIMATE-BRIDGE.md` | Inline job editing |
| `agents/EstimateBuilding/RIGHT-RAIL-IA.md` | Sidebar dedup rules |
| `docs/research/estimate-right-rail-quick-reference-2026-07-05.md` | Competitor rail widgets |
| `docs/design/shop-library-miller-flow-2026-07-05.md` | Labor guide Miller columns |
| `docs/BATCH-05-RO-INTAKE.md` | Shipped intake (approved) |
| `docs/BATCH-07-ESTIMATE-LAB-MERGE.md` | Estimate merge sprint |

---

## Competitor patterns extracted (for Agent 1)

### Tekmetric (from `7ABF2D71…`)
- Single scrollable intake form on dedicated page
- Concerns as chips **on intake**
- Duplicate vehicle + **active RO exists** table warning
- Estimate tab: Smart Jobs + canned search after create

### AutoLeap (from `2BBF85F0…`, `7B6B4614…`, `A52B9681…`)
- RO number assigned **immediately** on create
- Search mode pills (name / phone / plate / VIN)
- Services toolbar: search + browse + add
- Inline line edit, debounced save, ⋮ job menu
- Sticky GP footer on Services tab

### ShopRally v2 decision (estimate-first shell)
**Draft RO on FAB + identity bar on estimate + Tekmetric guardrails** — see `SHOPRALLY-ESTIMATE-FIRST-INTAKE.md`. Deprioritize slide-over sheet as default entry.
