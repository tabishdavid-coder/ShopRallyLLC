# ShopRally Estimate Blend — AutoLeap-inspired, ShopRally-owned

**Reference video:** SnagIt `7B6B4614-73E3-41B4-8567-EDD06481F234.MP4` (AutoLeap estimate build, RO #10246)  
**Lab URL:** http://localhost:3004/design-review/estimate-building?ro={id}  
**Commercial rules:** [`COMMERCIAL-SAFETY.md`](./COMMERCIAL-SAFETY.md)

This doc maps reference **workflow patterns** to ShopRally components. We adopt industry-standard IA, not competitor copy or teal chrome.

---

## Layout map

| Reference area | ShopRally implementation | Notes |
|---|---|---|
| Shop notes + customer recommendations (header) | `EstimateLabRoHeader` | Internal `notes` + `customerRecommendations` on `RepairOrder`; Print / Send / Save |
| Tab strip: Concerns · Services · … | `EstimateLabWorkTabs` | Navy underline active tab; ShopRally labels |
| Services toolbar (search, browse, add) | `EstimateLabToolbar` + `EstimateJobLauncher` | **Search jobs & templates**, **+ Add job** — not "+ Service" |
| Job cards (auth, GP, lines) | `EstimateJobCard` `variant="lab"` | Pending approval, Job total, Recommended |
| Sticky totals + approval | `EstimateLabLiveTotalsBar` | Services tab footer only |
| Right rail (auth buckets, totals) | `EstimateLabRightRail` | Existing v5 accordion — unchanged in this pass |
| Parts ordering tab | `EstimateLabPartsTab` → `EstimateLabPartsMenu` sheet | Same vendor rail as job card Parts |
| Activity tab | `EstimateLabActivityTab` + `AddActivityDialog` | Uses `RoActivity` |
| Inspections tab | `EstimateLabInspectionsTab` | Summary + link to full MPI |
| Attachments | `EstimateLabAttachmentsTab` | Stub until blob upload |

---

## Copy glossary (lab → merge)

| Reference (do not ship) | ShopRally label |
|---|---|
| Search canned services | Search jobs & templates |
| Browse canned services | Browse job templates |
| + Service | + Add job |
| Not yet authorized | Pending approval |
| Service net total | Job total |
| Services (tab) | **Services** (lab) — production may adopt 3030 **Work lines** later |

---

## Schema (2026-07-05)

- `RepairOrder.customerRecommendations` — advisor text shown on customer estimate; separate from internal `notes`
- `updateRepairOrderSidebar` accepts both fields; Save in header persists

Run after pull:

```bash
npm run db:push
```

---

## Not in this pass (backlog)

- Deferred authorization bucket on right rail
- Unsaved-changes guard when switching tabs with dirty header
- Attachments upload (Vercel Blob)
- Customer recommendations on print template (`/print/[id]/estimate`)
- Inline vehicle swap / plate lookup (FA2ED0E7 video)

---

## QA checklist

1. Open lab with `?ro=` on an estimate RO
2. Header: edit shop notes + recommendations → **Save** → refresh persists
3. **Print** opens `/print/{id}/estimate`; **Send** opens share dialog
4. Tabs: Concerns (clickable boxes), Services (toolbar + jobs + sticky bar), Inspections, Activity, Parts, Attachments stub
5. Parts tab opens same slide-over as job **Parts** button
6. No competitor trademarks in visible UI
