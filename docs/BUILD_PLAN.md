# RepairPilot — Build Plan

Sequenced milestones. Each is a self-contained chunk of work. Do them in order;
pair the customer-facing ones with your Tekmetric screenshots.

| # | Milestone | Delivers | Blocked by |
|---|-----------|----------|------------|
| 0 | **Foundation** ✅ | `PROJECT_SPEC.md`, `CLAUDE.md`, this plan | — |
| 1 | **Scaffold** ✅ | Next.js + TS + Tailwind + shadcn(Radix), app shell (sidebar nav, shop switcher, search, dashboard KPIs, module placeholders), stub tenant context | — |
| 1b | **Wire Clerk** | Clerk Organizations (each shop = org), protected routes, replace shop stub | Clerk keys |
| 2 | **Data model** | Full Prisma schema (all domains), migration, seed (demo shop, 3 customers, 5 vehicles, 2 ROs) | 1b |
| 3 | **Customers & Vehicles** | Customer list + detail, vehicle detail, quick-add | 2 |
| 4 | **VIN decoder** | `VinService` (DataOne/VinAudit primary + NHTSA fallback), auto-fill on vehicle form, cache decoded JSON | 3, VIN account |
| 5 | **Repair Orders + Inspections** | RO lifecycle, jobs/labor/part lines, live totals, DVI checklists w/ photos | 4 |
| 6 | **Scheduling** | Calendar (day/week), drag-to-create, convert appt → RO | 5 |
| 7 | **PartsTech** | `PartsTechService`, search by vehicle specs, add parts to job, order + track | 5, PartsTech account |
| 8 | **Invoicing & Payments** | Invoice from RO, PDF, Stripe + cash/check, payment status | 5 |
| 9 | **Messaging** | Twilio two-way SMS, templates, inbox, logged on customer | 3 |
| 10 | **Dashboard & Reporting** | KPIs, sales chart, tech productivity, end-of-day report | 5, 8 |

**Premier AI (parallel track):** see [`docs/premier-ai-roadmap.md`](./premier-ai-roadmap.md) for phased AI delivery, progress tracking, and exit criteria.

## Long-pole items to start NOW (in parallel with building)
- [ ] Apply for **PartsTech** partner API + punchout credentials (gates M7).
- [ ] Set up **paid VIN provider** account — DataOne or VinAudit (gates M4).
- [x] Install **Node** (v24.18.0 + npm 11.16.0 installed).
- [ ] Create **Clerk**, **Neon**, **Stripe**, **Twilio** accounts (free tiers fine to start).

## Working rhythm
- One milestone per focused session where possible.
- Feed screenshots with the "match this screenshot" template (see chat) for
  M3, M5, M6, M8, M10.
- Update `CLAUDE.md` → Current status / Next steps at the end of each session.
