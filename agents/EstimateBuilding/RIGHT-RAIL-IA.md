# Estimate Building — Order Summary Right Rail IA

**Component:** `src/components/estimate-building/estimate-lab-right-rail.tsx`  
**Last updated:** 2026-07-04 (v5 — profitability expanded, Totals removed when jobs exist)  
**Preview:** http://localhost:3004/design-review/estimate-building?ro={id}

---

## Design intent

Supplementary sidebar for estimate-phase actions and profitability — **not** a second copy of the lab panel header or sticky totals bar. Tekmetric-first actions with selective AutoLeap-inspired approval counts and GP metrics; ShopRally navy/light-blue identity, accordion sections matching command-rail context panel aesthetic.

**3030 glossary note:** Dev 3004 and 3030 stepper both use industry-standard phase labels (Overview → Estimate → Work in Progress → Payment). Inspections are inner estimate tabs, not a phase step.

---

## Dedup rules (v5)

Information shown elsewhere in the lab layout must **not** repeat in the right rail.

| Shown in main column | Where | Right rail rule |
|---|---|---|
| RO #, status badge | Lab panel header | **Do not show** |
| Customer, vehicle, VIN/mileage | Lab panel header | **Do not show** |
| Estimate phase chip | Was rail-only; header covers context | **Removed** |
| Labor, parts, fees, discounts, tax, subtotal, total | Sticky `EstimateLabLiveTotalsBar` | **Do not show** when jobs exist — Totals section **hidden entirely** |
| Margin / GP block (compact) | Sticky totals bar left cluster | **Do not duplicate** — Profitability expands with labor/parts margin detail |
| Paid, balance due, deposit status | Sticky bar (deposit chip) + Actions | **Do not show** in rail when jobs exist |
| Per-job authorization badge | Job cards | **Keep** aggregate counts in Approval; no duplicate Authorize CTA |
| Get approval | Sticky totals bar | **Do not duplicate** Authorize button in rail |
| Request deposit | Sticky totals bar + Actions | **Keep** in Actions (primary payment shortcuts rail) |
| Service advisor | Not in header | **Keep** in Advisor & payment |
| Payment badge (Unpaid/Partial/Paid) | Not in header | **Keep** in Advisor & payment |

When the RO has **no jobs** (no sticky bar), **Profitability** is hidden and **Totals** shows the full revenue + payment breakdown.

When the RO has **jobs**, **Profitability** is shown and **Totals** is removed — revenue lines live in the sticky bar; rail focuses on shop-owner GP metrics.

---

## Section map (max 4 when jobs exist)

1. **Advisor & payment** — service advisor + payment badge (supplementary context only)
2. **Approval** — inline stat strip: `Pending N · Approved N · Declined N` + thin progress bar
3. **Profitability** — expanded GP snapshot (see table below); shown when jobs exist
4. **Actions** — Send estimate, Print, Share estimate, Request deposit, Payment, **Parts ordering** (opens slide-over; does not duplicate panel content)

**Parts ordering** opens the estimate slide-over (`EstimateLabPartsMenu`) — not inline in the rail. Triggers also live on job card header **Parts** and footer **+ Add part**. See [`PARTS-UX.md`](./PARTS-UX.md).

**Empty estimate (no jobs):** sections 1, 2, **Totals** (full breakdown + paid/balance), 4 — no Profitability.

Mobile: same body in right-side sheet; trigger label **Order summary**.

---

## Approval (v4 compact)

| v3 | v4 | Reason |
|---|---|---|
| 3-column grid of large tinted cards | Single row of dot + label + count chips separated by middots | ~40–50% less vertical space |
| Helper paragraph pointing to Get approval | Removed — per-job badges + sticky bar CTA are sufficient | Obvious from context |
| No visual mix indicator | 1px stacked progress bar (approved / pending / declined) | Quick at-a-glance mix without card height |

Labels shortened: **Pending**, **Approved**, **Declined** (drop "approval" suffix in strip).

---

## Profitability (v5 expanded)

| Field | Source | Notes |
|---|---|---|
| Gross profit ($) | `ctx.totals.gpCents` via `computeRoTotals` | Emphasis row; same as sticky bar GP$ |
| GP % | `ctx.totals.gpPct` | One decimal |
| GP / hr | `gpCents ÷ authorized labor hours` | `—` when zero hours; red when below shop `gpPerHourGoalCents` |
| Labor margin | `laborCents` (no labor cost tracked) | `$X (100%)` when labor revenue > 0 |
| Parts margin | `partsCents − partsCostCents` | `$X (Y%)` — Y = parts GP ÷ parts retail |
| Total revenue | `ctx.totals.totalCents` | Estimate total incl. fees/discounts/tax; single line |
| Billable hrs | Sum authorized labor line hours | Two decimals |
| Labor rate | `laborCents ÷ billable hrs` | Effective billed rate; muted |
| Shop GP goal | `gpGoalCents` prop | Footnote: goal $/hr + on track / below goal |

Rendered when `profitability` prop is set (`EstimateLabRightRailLive` with jobs). Static empty-estimate rail omits the section and shows Totals instead.

---

## Totals (v5 — empty estimate only)

Shown only when `profitability` is null (no jobs / no sticky bar):

- Labor, parts, fees, discounts, tax, estimate total
- Deposit status, paid to date, balance due

---

## Old vs new IA

| v4 | v5 | Reason |
|---|---|---|
| **Totals** always visible (payment delta when sticky bar) | **Totals** hidden when jobs exist | User: sticky bar covers revenue; rail for profitability |
| **Profitability** — 3-line GP snapshot | **Profitability** — 8 metric rows + goal footnote | AutoLeap-inspired shop-owner focus without ledger duplicate |
| `deltaTotalsOnly` prop | Removed — `profitability` presence gates Totals | Simpler API |
| 5 sections (profitability conditional) | 4 sections when jobs exist | Totals removed from populated estimate |

---

## Commercial safety

- No competitor product names in UI
- No Estimate \| Invoice toggle or Carfax toggle in v1 (reduces AutoLeap fingerprint per `COMMERCIAL-SAFETY.md`)
- Section title **Order summary**, not "Authorizations widget"
- Labels: **Pending**, **Approved**, **Declined**, **Gross profit**, **GP / hr**, **Labor margin**, **Parts margin**, **Total revenue**, **Billable hrs**, **Labor rate**

---

## Props (v5)

| Prop | Purpose |
|---|---|
| `profitability` | `{ gpCents, gpPct, gpPerHourCents, laborGpCents, laborGpPct, partsGpCents, partsGpPct, totalRevenueCents, billableHours, effectiveLaborRateCents, gpGoalCents? }` — set by `EstimateLabRightRailLive` |
| `gpGoalCents` | Passed to Live wrapper only; drives GP/hr warn + goal footnote |
| `serviceAdvisorName` | Advisor & payment section |
| `shopName`, `customerFirstName`, `email` | Share estimate dialog |
| Removed v5: `deltaTotalsOnly` | Replaced by `profitability` presence |
| Removed from v2: `roStatus`, `customerId`, `vehicleId`, `vehicleLabel` | Duplicated lab panel header |

---

## Future (backlog)

- Workflow status change (persisted server action)
- Estimate ↔ invoice phase when RO posts
- Vehicle history reporting toggle (shop settings)
- Footer link to full RO context deck on main estimate merge
- Include draft labor hours + part costs in profitability while job card is in edit mode (context extension)
