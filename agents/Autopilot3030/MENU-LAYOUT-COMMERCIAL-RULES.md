# Autopilot 3030 — Menu & Layout Commercial Rules

Last updated: 2026-07-04  
Scope: **Project 3030 preview only** — do not merge layout chrome to Dev 3004 without explicit user sign-off.

---

## Purpose

ShopRally Autopilot serves **independent auto repair shops** with a proprietary UX language and Deep Ocean visual identity. These rules keep our menu IA and trade dress **legally differentiated** from Tekmetric, AutoLeap, Shop Monkey, and similar shop-management products while still using industry-standard patterns that are not protectable alone.

Reference terminology: [`COMPLIANCE-GLOSSARY.md`](./COMPLIANCE-GLOSSARY.md).

---

## What we CAN take (not protectable alone)

| Pattern | Notes |
|---|---|
| **Grouped navigation** | Section labels, collapsible groups, and icon+text links are functional conventions in B2B SaaS. |
| **Kanban / pipeline boards** | Column-based workflow for repair orders is an industry workflow pattern. |
| **Search in header** | Universal CRM affordance. |
| **Status pills on cards** | Functional indicators (e.g. balance due, not started). |
| **Light content + darker chrome** | High-level contrast pattern; protectability depends on *specific* execution, not the idea. |
| **Settings hub with categories** | Grouping configuration items is standard IA. |
| **KPI dashboard tiles** | Common analytics layout. |

We may use these patterns with **our own** section names, colors, spacing, typography, and component shapes.

---

## What we MUST NOT copy

### Tekmetric fingerprints (reference screenshots)

| Element | Do not replicate |
|---|---|
| Sidebar IA | Exact group labels **Main / Manage / Admin** in that order with the same item roster |
| Sidebar chrome | Full-height dark sidebar as the *sole* primary nav with Tekmetric-style density and blue active pill |
| Job board columns | **Estimates / Work-In-Progress / Completed** as the default 3030 column set |
| Top bar | Thin dark strip + centered mega-search + "Recent ROs" cluster in Tekmetric order |
| Card layout | RO# top-right, "Created X ago", status pill top-left, total bottom-right in that exact hierarchy |
| Color story | Navy sidebar + single blue accent as the *only* brand story mirroring Tekmetric |

### AutoLeap fingerprints (reference screenshots)

| Element | Do not replicate |
|---|---|
| Top module strip | Full-width **teal** bar with icon+label horizontal tabs (Dashboard, Work Board, Calendar, …) |
| Kanban columns | **Estimate / In progress / Invoice / Paid** four-column sequence |
| Card chrome | Teal left-edge accent bar, priority badge top-left, financial line in competitor orange/teal |
| Primary CTA | "+ Estimate" in competitor teal placement on filter row |
| Palette | Teal-forward brand bar + white cards + teal paid-state coloring |

### Universal prohibitions

- Competitor **trademarks, logos, or product names** in UI, marketing, or docs shipped to users
- Pixel-level reproduction of competitor screenshots in production assets
- Using competitor **exact** nav item order as our default without documented differentiation
- Copying competitor **marketing taglines** or help-center phrasing

---

## ShopRally / Autopilot differentiation checklist

Use this before merging any 3030 layout to commercial builds.

### Information architecture

- [ ] Primary nav uses **6 command-rail sections** (Operations, Customers, Schedule, Catalog, Shop Growth, Admin) — not Tekmetric Main/Manage/Admin
- [ ] No full-width horizontal **module tab strip** as primary nav (AutoLeap pattern)
- [ ] Operations subnav uses industry-standard shop CRM labels: **Job Board**, **Tech Board**, **Labor Guide**, **Messages**, **Reports** (see glossary); **Service Flow** removed from nav
- [ ] Settings use **3030 context-panel groups** (Shop Identity, Service Defaults, Pricing & Quotes, …) — not competitor tab strips
- [ ] Service Ticket workspace uses **phase stepper** (Overview → Estimate → Work in Progress → Payment) — industry-standard labels, not competitor tab names

### Visual / trade dress

- [ ] **Deep Ocean** tokens only on 3030: `--ap-chrome`, `--ap-accent` (coral), `--ap-accent-secondary` (seafoam) — not Tekmetric blue-only or AutoLeap teal bar
- [ ] **Command rail** (~68px icon rail) + **context panel** (~248px) — not a single persistent 280px competitor sidebar clone
- [ ] **Light top bar** with page title — not competitor dark top strip as primary chrome
- [ ] Active state: **coral accent** on rail + context panel — not competitor blue underline or teal fill
- [ ] Logo: **Autopilot AP mark** — never competitor wordmarks

### Bay Pipeline (kanban)

- [ ] Column labels: **Intake / Active Bay / Closed & Paid** (or glossary equivalents) — not Estimates/WIP/Completed or Estimate/In progress/Invoice/Paid
- [ ] Three primary columns by default (invoice/checkout lives inside ticket phase stepper, not a separate kanban column)
- [ ] Card fields and visual hierarchy documented as ShopRally-original in mockup review

### Copy & positioning

- [ ] UI copy follows [`COMPLIANCE-GLOSSARY.md`](./COMPLIANCE-GLOSSARY.md) — Service Ticket, Quote, Finalize Quote, etc.
- [ ] Messaging emphasizes **independent shop focus** and **Autopilot** brand — not "Tekmetric alternative" in product UI
- [ ] Competitor names appear only in **internal** design-review docs, never in customer-facing chrome

---

## Review workflow

1. **Design mockup** — `/design-review/menu-mockup-3030` (3030 port only styling)
2. **Checklist** — complete differentiation checklist above
3. **Legal spot-check** — confirm no trademarks in UI; patterns are functional, execution is original
4. **User sign-off** — recorded in `BUILD-STATE.md` before any merge to Dev 3004

---

## Related files

| File | Role |
|---|---|
| [`MENU-LAYOUT-MOCKUP.md`](./MENU-LAYOUT-MOCKUP.md) | Wireframes + route map |
| [`COMPLIANCE-GLOSSARY.md`](./COMPLIANCE-GLOSSARY.md) | UI label glossary |
| `src/lib/autopilot3030/nav.ts` | Canonical 3030 IA |
| `src/app/globals.autopilot3030.css` | Deep Ocean tokens |
| `/design-review/menu-mockup-3030` | Live preview |
