# CRM Brand Contrast Audit — 2026-07-05

**Environment:** Dev `:3004` (`http://localhost:3004`)  
**Brand reference:** SnagIt `91AF0A82-2395-4B9B-AF67-05083481E63D.SNAG` (Graphite Garage palette — charcoal `#1A1D21` + cyan `#0EA5E9`)  
**Design mode:** All routes visited with `?design=open`  
**Method:** Edge headless screenshots (1440×900) + CSS token contrast math on `globals.css` pairs. Browser MCP tabs were unavailable in this session; live computed-style CDP was not run.

## Screenshots

| Route | File |
|-------|------|
| `/dashboard?design=open` | `docs/audits/screenshots/crm-brand-contrast-2026-07-05/dashboard.png` |
| `/job-board?design=open` | `docs/audits/screenshots/crm-brand-contrast-2026-07-05/job-board.png` |
| `/customers?design=open` | `docs/audits/screenshots/crm-brand-contrast-2026-07-05/customers.png` |
| `/design-review/estimate-building?design=open` | `docs/audits/screenshots/crm-brand-contrast-2026-07-05/estimate-building.png` |
| `/repair-orders/cmr6ecri30003hh3kzoxhcee6/estimate?design=open` | `docs/audits/screenshots/crm-brand-contrast-2026-07-05/repair-order-estimate.png` |
| `/settings?design=open` | `docs/audits/screenshots/crm-brand-contrast-2026-07-05/settings.png` |
| `/platform?design=open` | `docs/audits/screenshots/crm-brand-contrast-2026-07-05/platform.png` |

## Summary

| Severity | Count | Notes |
|----------|------:|-------|
| **Pass** | 28 | Primary CTAs, dark sidebar chrome, active nav labels, platform sidebar active, job-board pills, estimate tables |
| **Major** | 4 | Cyan link text on white; borderline muted nav labels |
| **Minor** | 5 | Placeholders, trend greens, destructive-on-wash |
| **Critical** | 1 | Active horizontal sub-nav icon (fixed in this audit) |

**Overall:** **Pass with fixes** — no white-on-white controls found. One critical cyan-on-cyan icon pairing was patched.

## Critical fix applied

| Route | Issue | Severity | Screenshot | Fix |
|-------|-------|----------|------------|-----|
| `/settings`, `/marketing/*` (horizontal sub-nav) | Active tab icon used `text-brand-light` (#0EA5E9) on `bg-brand-light/35` (~#ABE0F7) — **~1.94:1** (icon nearly invisible) | **Critical** | `settings.png` — Settings / Shop Identity sub-nav tabs | Changed active icon to `text-brand-navy` in `src/components/crm/crm-secondary-nav.tsx` |

## Findings by route

### `/dashboard`

| Issue | Severity | Screenshot | Suggested fix |
|-------|----------|------------|---------------|
| Primary buttons (`+ New Service Ticket`, header CTAs) — white on `--brand-navy` | Pass (~16.9:1) | `dashboard.png` | — |
| Dark sidebar idle labels (`--sidebar-foreground` on `--sidebar`) | Pass (~15:1) | `dashboard.png` | — |
| Active sidebar item — white label on cyan wash over charcoal | Pass (~12:1) | `dashboard.png` | — |
| Operator banner shop name `text-brand-light` on dark chrome | Pass (~6.1:1) | `dashboard.png` | — |
| KPI sub-labels `text-muted-foreground` on white cards | Pass (~4.8:1) | `dashboard.png` | — |
| Pipeline segment label `text-brand-red` for Completed | Pass (semantic red, large UI) | `dashboard.png` | Keep semantic `--brand-red` |

### `/job-board`

| Issue | Severity | Screenshot | Suggested fix |
|-------|----------|------------|---------------|
| Column headers — navy/slate titles on tinted headers | Pass | `job-board.png` | — |
| WIP column badge — white on `--brand-navy` | Pass | `job-board.png` | — |
| Status pills (`text-brand-navy` on `bg-brand-light/25`) | Pass (~13:1) | `job-board.png` | — |
| Quote pill (`text-slate-700` on `bg-slate-100`) | Pass | `job-board.png` | — |
| Card body text on WIP cyan wash | Pass | `job-board.png` | — |
| Toolbar search placeholder | Minor (~3.2:1) | `job-board.png` | Darken `--placeholder-foreground` slightly |

### `/customers`

| Issue | Severity | Screenshot | Suggested fix |
|-------|----------|------------|---------------|
| `+ Add Customer` primary button | Pass | `customers.png` | — |
| Table headers uppercase `text-muted-foreground` | Pass / borderline | `customers.png` | — |
| Customer name links (default link color / navy) | Pass | `customers.png` | Ensure `.link-subtle` on name cells if not already |
| Operator banner | Pass (same as dashboard) | `customers.png` | — |
| Secondary nav (Customers list) active vertical tab | Pass (`text-brand-navy` on `bg-brand-light/40`) | `customers.png` | — |

### `/design-review/estimate-building` & `/repair-orders/.../estimate`

| Issue | Severity | Screenshot | Suggested fix |
|-------|----------|------------|---------------|
| RO context bar labels / values | Pass | `estimate-building.png`, `repair-order-estimate.png` | — |
| Tab bar active (`crm-nav-tab-active`) | Pass | both | — |
| Sticky totals bar — white on `--brand-navy` | Pass | `repair-order-estimate.png` | — |
| Pending status pill (amber wash) | Pass (semantic) | both | Keep inspection/status semantics |
| Matrix tags / small metadata | Minor | `repair-order-estimate.png` | Consider `--crm-caption` for 11px labels |
| Inline field placeholders (“Add phone”) | Minor (~3.2:1) | `estimate-building.png` | `--placeholder-foreground` token |

### `/settings`

| Issue | Severity | Screenshot | Suggested fix |
|-------|----------|------------|---------------|
| Vertical settings nav active (`crm-subnav-vertical-active`) | Pass (~11:1) | `settings.png` | — |
| **Horizontal sub-nav active icon** (Settings sections with 2+ tabs) | **Critical → Fixed** | `settings.png` | `text-brand-navy` on active icon (applied) |
| Form labels / Master ID copy | Pass | `settings.png` | — |
| “Add shop ID” placeholder italic | Minor | `settings.png` | `--placeholder-foreground` |

### `/platform`

| Issue | Severity | Screenshot | Suggested fix |
|-------|----------|------------|---------------|
| Sidebar active — `--sidebar-primary-foreground` on `--sidebar-primary` | Pass (~6.1:1) | `platform.png` | — |
| Sidebar idle white on charcoal | Pass | `platform.png` | — |
| Overview KPI green trend `+100%` | Minor (~3.3:1) | `platform.png` | Use `text-emerald-700` or `--chart-4` for small trend text |
| Shortcut card descriptions `text-muted-foreground` | Pass / borderline | `platform.png` | — |
| “Enter shop” CTA on info banner | Pass | `platform.png` | — |

## Cross-cutting token issues

| Route | Issue | Severity | Screenshot | Suggested fix |
|-------|-------|----------|------------|---------------|
| Global | `text-brand-light` used as **body/link on white** (e.g. payments fee link, marketing pages) — **~2.77:1** | Major | N/A (token) | Restrict `--brand-light` text to dark chrome; use `text-brand-navy` or `.link-subtle` on light surfaces |
| Global | `--crm-nav-muted` on white — **~4.37:1** (just under 4.5:1) | Major | Multiple | Darken token to `oklch(0.48 0.012 260)` |
| Global | `--placeholder-foreground` — **~3.18:1** | Minor | All forms | Accept for placeholders or bump to ~3.5:1 |
| Global | `--destructive` on `bg-destructive/10` wash — **~3.83:1** | Minor | Alert banners | Use `text-destructive` on white or darker wash |
| Global | Primary / sidebar / platform chrome | Pass | All | `--primary`, `--sidebar-*` tokens OK |

## WCAG targets used

- **Body text:** 4.5:1 minimum  
- **Large / bold UI (≥18px or ≥14px bold):** 3:1 minimum  
- **Status pills / semantic colors:** Evaluated but not rebranded per project rules

## Recommendations (non-critical backlog)

1. Audit all `text-brand-light` usages on light backgrounds; grep shows ~15 CRM/marketing call sites.
2. Slightly darken `--crm-nav-muted` and `--subtle-foreground` for inactive nav labels on white.
3. Platform KPI trends: prefer `emerald-700`/`800` over `emerald-600` at 12px.
4. Re-run with Browser MCP + CDP computed styles when tab persistence is available for per-element verification.

## Audit metadata

- **Dev server:** Verified HTTP 200 on `:3004`
- **RO used for estimate:** `cmr6ecri30003hh3kzoxhcee6` (RO #1377)
- **Commit:** None (audit-only per request)
