# Autopilot Project 3030 — build state



Last updated: 2026-07-04 (shell promoted to Dev 3004 default)

## Isolation from Dev 3004

- **Never** import `globals.autopilot3030.css` from root `layout.tsx` (only from `autopilot-shell.tsx`)
- Shell loads via dynamic `loadAppShell()` — **3004 now uses AutopilotShell by default** (`NEXT_PUBLIC_AP_SHELL=3030` in `scripts/dev-3004.mjs`)
- Separate build dir: `.next-3030` via `scripts/dev-3030.mjs` (gitignored) for isolated preview only
- `isAutopilot3030Shell()` requires `NODE_ENV=development` + `NEXT_PUBLIC_AP_SHELL=3030` (both :3004 and :3030)
- `isIsolated3030Preview()` — true only on `dev:3030` (design mode off, preview banner on)
- Stop port 3030 before relying on 3004 if you see port/lock conflicts



## Shell layout (original design)



- **ApTopBar** — preview banner, page title, search, shop switcher

- **ApCommandRail** — icon-only section rail (~68px)

- **ApContextPanel** — section submenu (~248px); always visible on desktop (md+); fixed beside command rail

- **ApModuleSubnav** — horizontal chip subnav (Shop Growth, SEO Autopilot, Payments, Markups) or Service Ticket phase stepper on RO pages — stacks above main content, does not replace context panel

- **Fixed nav chrome (2026-07-04)** — command rail + context panel use `position: fixed` below top bar; main content offset via `.ap-main-column` margin

- **RoTabs** hidden on 3030 (`ro-tabs-bar--ap-stepper-hidden`); stepper replaces horizontal tabs



`ApSidebar` (persistent full left sidebar) is **not used** — kept in repo as reference only.



## Done



- [x] Palette C tokens + legacy `--brand-*` bridge

- [x] Autopilot logo/mark SVG + React components

- [x] Full nav IA in `src/lib/autopilot3030/nav.ts`

- [x] Command rail + context panel shell (original design restored)

- [x] Module chip subnavs — Shop Growth, SEO Autopilot, Payments, Markups

- [x] Service Ticket phase stepper (replaces RO tabs in 3030) — shared with 3004 via `ro-phase-stepper.tsx` / `ro-phases.ts`

- [x] Settings hub groups in context panel (replaces horizontal settings tabs via CSS hide)

- [x] `/brand/autopilot` preview page

- [x] Agent docs



## Nav map (3030 labels → routes)



| Section | Items |

|---|---|

| Operations | Dashboard, Job Board, Tech Board, Tires, Labor Guide, Messages, Reports, Payments |

| Customers | All Customers, Care Plan Members |

| Schedule | Appointments |

| Catalog | Inventory, Service Templates, Labor Library, Inspection Templates, Vendor Connect, Purchase Orders |

| Shop Growth | Hub + 8 products (same `/marketing/*` routes) |

| Admin | Team, Configuration groups, Help |



## Menu layout mockup (2026-07-04)

- [x] `MENU-LAYOUT-COMMERCIAL-RULES.md` — trade dress / IA differentiation rules
- [x] `MENU-LAYOUT-MOCKUP.md` — wireframes + route map
- [x] Live preview: `/design-review/menu-mockup-3030` (port 3030)
- [x] Bay Pipeline slice: Intake / Active Bay / Closed & Paid columns
- [x] **User sign-off (2026-07-04)** — mockup approved; live shell updated to match
- [x] Live shell parity — `AutopilotShell` command rail + context panel + light top bar on all 3030 routes
- [x] Bay Pipeline labels — `src/lib/autopilot3030/bay-pipeline.ts` + conditional job-board UI (3030 only)
- [x] **Promoted to Dev 3004 default (2026-07-04)** — `npm run dev` uses AutopilotShell + ShopRally logo; `:3030` remains isolated preview

## Shell chrome (live 3030)

| Component | Role |
|---|---|
| `ApCommandRail` | 68px icon rail — 6 sections, coral active state; **ShopRally mark** on 3004+3030 |
| `ApTopBar` | Light bar — ShopRally logo (mobile), page title, search, coral CTA; preview banner only on :3030 |
| `ApContextPanel` | 248px section submenu — always visible on desktop (fixed) |
| `ApModuleSubnav` | Chip subnav (Shop Growth, SEO, Payments, Markups) or Service Ticket stepper |
| `globals.autopilot3030.css` | Deep Ocean tokens + Bay Pipeline column accents |

Preview: `npm run dev` → http://localhost:3004 (canonical) · `npm run dev:3030` → http://localhost:3030 (isolated preview)

## Next

- [ ] ApTireSizeSelect smart dropdown

- [ ] Quote Composer visual pass (estimate tab)

- [ ] Trade-dress audit checklist per route

- [ ] Workflow page — split view copy pass (route unlinked from Operations nav; reachable via Job Board toggle)


