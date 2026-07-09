# Autopilot 3030 — Menu Layout Mockup

Last updated: 2026-07-04  
Live preview: **http://localhost:3030/design-review/menu-mockup-3030**

---

## Competitor pattern summary (reference only)

### Pattern A — Horizontal module strip + 4-column kanban

*(AutoLeap-class products)*

- Teal full-width top bar with **9 horizontal icon+label tabs** (Dashboard, Work Board, Calendar, …)
- Sub-toolbar: Kanban/List toggle, dense filter chips, "+ Estimate" CTA
- Kanban: **Estimate → In progress → Invoice → Paid**
- Cards: teal left accent, priority badge, vehicle line, unpaid/paid coloring

**ShopRally avoids:** top module strip as primary nav; teal palette; four-column invoice/paid split.

### Pattern B — Dark sidebar groups + 3-column job board

*(Tekmetric-class products)*

- Dark left sidebar with **Top / Main / Manage / Admin** section labels
- Thin dark top bar: logo, centered search, utility cluster
- Job board: **Estimates / Work-In-Progress / Completed**
- Light gray workspace; blue active states; RO cards with status pill + total

**ShopRally avoids:** Main/Manage/Admin mirror; single full sidebar as only nav; Estimates/WIP/Completed column names.

---

## Proposed ShopRally 3030 layout — Command Rail + Context Panel

Hybrid shell that uses **neither** competitor primary-nav pattern.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PREVIEW BANNER (3030 only)                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ TOP BAR (light) — page title · search · shop switcher · notifications       │
├────┬──────────────┬─────────────────────────────────────────────────────────┤
│ R  │ CONTEXT      │ MODULE SUBNAV (chips) — optional per section            │
│ A  │ PANEL        │ e.g. Shop Growth products, Service Ticket stepper       │
│ I  │ (~248px)     ├─────────────────────────────────────────────────────────┤
│ L  │ Section      │                                                         │
│    │ submenu      │              MAIN WORKSPACE                             │
│ ~  │ for active   │         (Bay Pipeline, Command Center, etc.)            │
│ 68 │ rail section │                                                         │
│ px │              │                                                         │
└────┴──────────────┴─────────────────────────────────────────────────────────┘
│ MOBILE: bottom dock (Operations · Customers · Schedule · More)              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Command rail sections (icon-only, left)

| # | Section | Default route | Context panel items |
|---|---------|---------------|---------------------|
| 1 | **Operations** | `/dashboard` | Dashboard, Job Board, Tech Board, Tires, Labor Guide, Messages, Reports, Payments |
| 2 | **Customers** | `/customers` | All Customers, Care Plan Members |
| 3 | **Schedule** | `/appointments` | Appointments |
| 4 | **Catalog** | `/inventory` | Inventory, Service Templates, Labor Library, Inspection Templates, Vendor Connect, Purchase Orders |
| 5 | **Shop Growth** | `/marketing` | Growth Hub + 8 products (chip subnav replaces context panel) |
| 6 | **Admin** | `/settings` | Team + Configuration groups (context panel) |

Implementation: `src/lib/autopilot3030/nav.ts` → `AP_NAV_SECTIONS`, `AP_OPERATIONS_NAV_ITEMS`, `AP_SETTINGS_GROUPS`.

### Service Ticket focus mode

On `/repair-orders/[id]/*`:

- Command rail + context panel **hidden**
- Horizontal **phase stepper** replaces RO tabs: Overview → Estimate → Work in Progress → Payment (inspections live inside estimate workspace, not a phase step)
- Full-width ticket workspace

---

## Bay Pipeline — differentiated kanban

**3030 column headers** (not Tekmetric or AutoLeap):

| Column | Maps from (internal) | Competitor avoid |
|--------|----------------------|------------------|
| **Intake** | ESTIMATE status ROs | "Estimates", "Estimate" |
| **Active Bay** | WORK_IN_PROGRESS | "Work-In-Progress", "In progress" |
| **Closed & Paid** | COMPLETED + paid | "Completed", "Invoice", "Paid" as separate columns |

Payment/invoicing happens in the **Service Ticket → Payment** phase, not as a kanban column — structural differentiator from AutoLeap's 4-column flow.

```
┌──────────────┬──────────────┬──────────────┐
│ Intake (12)  │ Active Bay(4)│ Closed & Paid│
│              │              │ (231)        │
│  [ticket]    │  [ticket]    │  [ticket]    │
│  [ticket]    │              │  [ticket]    │
└──────────────┴──────────────┴──────────────┘
Toolbar: search · advisor filter · + New Service Ticket
```

---

## Deep Ocean color & spacing notes

From `globals.autopilot3030.css`:

| Token | Use |
|-------|-----|
| `--ap-chrome` | Command rail background (deep ocean ink) |
| `--ap-accent` | Coral — active rail icon, context active link, primary CTA emphasis |
| `--ap-accent-secondary` | Seafoam — completed stepper states, secondary highlights |
| `--ap-primary` | Deep blue — chip subnav active, links |
| `--ap-surface` / `--ap-surface-raised` | Workspace + top bar (light) |
| `--ap-rail-width` | 4.25rem (68px) |
| `--ap-context-width` | 15.5rem (248px) |
| `--ap-topbar-height` | 3.5rem |

**Spacing:** Tight enterprise radius (`--radius: 0.45rem`); context links min-height 40px; rail icons 44px touch targets.

---

## Route map (3030 label → path)

| UI label | Route |
|----------|-------|
| Dashboard | `/dashboard` |
| Job Board | `/job-board` |
| Tech Board | `/tech-board` |
| Tires | `/tires` |
| Labor Guide | `/quick-labor` |
| Messages | `/messages` |
| Reports | `/reports` |
| Payments | `/payments` |
| Workflow *(unlinked)* | `/workflow` — split view only; toggle from Job Board |
| All Customers | `/customers` |
| Care Plan Members | `/maintenance-programs/subscribers` |
| Appointments | `/appointments` |
| Shop Growth hub | `/marketing` |
| Shop Configuration | `/settings` |
| New Service Ticket | `/repair-orders/new` |
| Service Ticket workspace | `/repair-orders/[id]/*` |

---

## Structural differentiators (summary)

| Dimension | Tekmetric | AutoLeap | **Autopilot 3030** |
|-----------|-----------|----------|---------------------|
| Primary nav | Dark full sidebar | Teal top tabs | Icon command rail |
| Secondary nav | Inline in sidebar | Filters under tabs | Context panel or chip subnav |
| Top bar | Dark, utilities | Teal, modules | Light, title + search |
| Kanban columns | 3 (Est/WIP/Done) | 4 (Est/Prog/Inv/Paid) | 3 (Intake/Active/Closed) |
| RO terminology | Repair Order | RO / Estimate | Service Ticket / Quote |
| Active accent | Blue | Teal | Coral (Deep Ocean) |

---

## Next steps

1. User review at `/design-review/menu-mockup-3030`
2. Complete checklist in [`MENU-LAYOUT-COMMERCIAL-RULES.md`](./MENU-LAYOUT-COMMERCIAL-RULES.md)
3. Sign-off in `BUILD-STATE.md` before Dev 3004 merge
