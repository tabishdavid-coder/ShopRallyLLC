# Competitive Gap Analysis — ShopRally vs Auto Shop CRMs

**Benchmarks:** Tekmetric (primary), AutoLeap, Shopmonkey, Mitchell 1, Shop-Ware, Fullbay  
**Last updated:** 2026-07-05  
**Action plan:** [`COMPETITIVE-GAP-STRATEGY.md`](./COMPETITIVE-GAP-STRATEGY.md) · [`SPRINT-ROADMAP-Q3-2026.md`](./SPRINT-ROADMAP-Q3-2026.md) · [`GROWTH-POSITIONING.md`](./GROWTH-POSITIONING.md)

---

## Executive summary

ShopRally covers **core CRM workflow** (customers, ROs, job board, editable estimates backend, payments, inspections, tires, booking, campaigns, automations, ShopSite, platform MSO console) at **Tekmetric-class** level with **unique Growth Engine + platform operator** layers.

**July 2026 audit (3 agents):** 13 CRMs + 12 forms platforms. Top switcher wedges: (1) marketing included not $345 add-on, (2) Forms Hub → RO, (3) website+CRM unified, (4) Estimate Lab UX on production RO, (5) MSO platform console.

**Remaining gaps vs Tekmetric/AutoLeap:** MOTOR labor, live PartsTech, time clock, inspection photos, production Clerk auth, Forms Hub, deep reporting, QuickBooks API.

---

## Gap matrix

Legend: ✅ built · ⬜ partial/stub · ❌ missing

| Category | Feature | ShopRally | Tekmetric | Shopmonkey |
|----------|---------|-------------|-----------|------------|
| **Core** | Customer list | ✅ | ✅ | ✅ |
| | Customer detail | ✅ (this pass) | ✅ | ✅ |
| | Vehicles + VIN | ✅ | ✅ | ✅ |
| | Create RO | ✅ | ✅ | ✅ |
| | RO detail (5 tabs) | ✅ read-mostly | ✅ editable | ✅ |
| | Job board kanban | ✅ DnD | ✅ | ✅ |
| | Estimates editable | ✅ backend; ⬜ prod UX (lab has inline) | ✅ | ✅ |
| | Forms Hub (work request → RO) | ❌ → Sprint 2 | ❌ | ✅ |
| | Marketing in base tier | ✅ | ❌ $345 add-on | ❌ $314 add-on |
| | Shop website native | ✅ ShopSite | ❌ | ❌ |
| | Platform MSO console | ✅ | ❌ | ❌ |
| | Maintenance programs | ✅ BayCare | ❌ | ❌ |
| | Invoicing + share | ✅ | ✅ | ✅ |
| **Operations** | Appointments week view | ✅ | ✅ | ✅ |
| | Tech board | ✅ (this pass) | ✅ | ✅ |
| | Time clock | ❌ | ✅ | ✅ |
| | Bay management | ❌ | ⬜ | ⬜ |
| **Marketing** | Online booking | ✅ | ✅ | ✅ |
| | Google reviews | ✅ | ⬜ partner | ⬜ |
| | Campaigns / blasts | ⬜ hub stub | ✅ | ✅ |
| | Lead sources | ✅ settings | ✅ | ✅ |
| **Parts** | PartsTech | ⬜ mock/stub | ✅ live | ✅ |
| | Inventory | ⬜ stub page | ✅ | ✅ |
| | Purchase orders | ⬜ partial (RO PO panel) | ✅ | ✅ |
| | Vendor integrations UI | ✅ | ✅ | ✅ |
| **Financial** | Stripe Connect payments | ✅ | ✅ (partner) | ✅ |
| | AR / collections | ⬜ report stub | ✅ | ✅ |
| | Reporting / KPI charts | ⬜ dashboard + 3 reports | ✅ deep | ✅ |
| | QuickBooks | ⬜ CSV export (this pass) | ✅ API | ✅ |
| **Inspection** | DVI templates | ✅ | ✅ | ✅ |
| | Photo upload per item | ⬜ coming soon | ✅ | ✅ |
| | Customer share link | ✅ | ✅ | ✅ |
| **Platform** | Multi-shop platform admin | ✅ | ❌ (single product) | ⬜ |
| | RBAC / permissions | ⬜ employee perms v1 | ✅ | ✅ |
| | Subscription tiers | ✅ v1 | ✅ | ✅ |
| | Support + FAQ + AI | ✅ (parallel work) | ✅ | ✅ |
| **Integrations** | Carfax | ⬜ mock history | ✅ | ⬜ |
| | VIN decode | ✅ NHTSA + Auto.dev | ✅ | ✅ |
| | Weldon tires | ⬜ stub workflow | ⬜ | ⬜ |
| | Google OAuth login | ⬜ UI scaffold | — | — |
| | Clerk auth | ⬜ stub | — | — |

---

## Built this pass (2026-06-29)

| Feature | URL |
|---------|-----|
| Customer detail (profile, vehicles, RO history, notes, Text-to-Pay stub) | `/customers/[id]` |
| Reports — sales summary, AR aging, tech hours + CSV | `/reports` |
| Tech board — per-tech work queue | `/tech-board` |
| Notifications center — bell in header | all app pages |
| RO summary — activity timeline, job/inspection/auth history | `/repair-orders/[id]` |
| QuickBooks invoice CSV export | `/settings/quickbooks`, `/api/export/quickbooks` |
| Marketing campaigns hub | `/marketing/campaigns` |
| Nav: inspections, reports, tech board live | sidebar |
| Support widget rendered in app shell | floating help button |

**Not duplicated (already built):** dashboard KPIs, appointments calendar, inspections list, tires, Stripe Connect, Google reviews, vendor integrations, platform admin, subscription settings, support/FAQ (subagent 39e91c7d).

---

## Roadmap by milestone

### M8 — Editable estimates & shop settings depth
- Add/edit jobs, labor, parts on estimate tab
- Markup matrices drive pricing (settings exist; wire to editor)
- Payment method capture on RO payment tab
- Plate lookup (Auto.dev) on vehicle add

### M9 — Parts, inventory, accounting
- PartsTech live punchout + order sync
- Inventory levels, adjustments, PO workflow
- QuickBooks Online OAuth + daily sync
- Marketing SMS/email campaign builder

### M10 — Operations & reporting
- Time clock + tech efficiency
- Full report library (EOD, GP%, car count, ARO charts)
- Bay / lift scheduling
- Carfax live service history

### M11 — Auth & enterprise
- Clerk Organizations (replace shop stub)
- SSO / Google login
- **API & developer platform** — see **`docs/API-PLATFORM-TASK.md`** (parked 2026-07-03): outbound webhooks, shop API keys, REST v1, partner OAuth, developer portal
- API keys for Enterprise tier
- Usage enforcement on plan features

---

## External dependencies

| Dependency | Blocks |
|------------|--------|
| **Clerk keys** | Real multi-user auth, org-per-shop tenancy |
| **MOTOR / labor data** | OEM labor times in labor guide (currently canned + AI assist) |
| **PartsTech partner ID + API** | Live catalog, ordering, inventory sync |
| **Carfax agreement** | Live service history on RO |
| **QuickBooks Intuit OAuth** | Auto journal sync (CSV export available now) |
| **Stripe Billing** | Self-serve SaaS subscription upgrades (Connect done for shop payments) |
| **Twilio** | Live SMS (mock mode without keys) |
| **Anthropic API** | FAQ AI assistant full answers |
| **Google Business Profile API** | Live review sync (mock/seed mode today) |

---

## Top 10 gaps vs Tekmetric (prioritized)

1. **Editable estimates** — add/edit jobs, labor, parts, recompute totals
2. **MOTOR / OEM labor guide** — industry-standard labor times
3. **PartsTech live ordering** — catalog punchout + PO sync
4. **Inventory management** — qty on hand, adjustments, transfers
5. **Time clock** — tech clock-in/out tied to jobs
6. **Full reporting suite** — EOD, GP dashboards, technician productivity charts
7. **QuickBooks API sync** — not just CSV export
8. **Inspection photo capture** — per-item photos + customer share gallery
9. **Payment capture UI** — record cash/check/card on RO (Stripe partial)
10. **Clerk auth + RBAC enforcement** — replace stub tenant context

---

## Recommended next 5 priorities

1. **Editable estimate tab** — highest daily-use gap vs Tekmetric
2. **Wire markup matrices to pricing** — settings already seeded
3. **PartsTech live path** — when partner credentials arrive
4. **Time clock MVP** — tech board + clock pairs naturally
5. **Clerk wiring** — unlock real multi-user and RBAC

---

## References

- `CLAUDE.md` — current milestone status
- `PROJECT_SPEC.md` — domain model
- `docs/cloud-architecture.md` — deployment topology
- `docs/platform-operations.md` — tiers & support (subagent 39e91c7d)
- `docs/stripe-connect-shop-payments.md` — shop payments
- `docs/google-reviews.md` — reviews integration
