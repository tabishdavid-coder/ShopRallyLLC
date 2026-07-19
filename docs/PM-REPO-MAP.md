# ShopRally — repo map (PM edition)

One-page guide: **open these / ignore these**.  
Companion to [`PM-HANDOFF.md`](./PM-HANDOFF.md).

---

## Top level

| Folder / file | Open it for… | PM note |
|---------------|--------------|---------|
| **`src/`** | All product UI and server logic | This is the app |
| **`prisma/`** | Data model, migrations, seed | Schema = source of truth for entities |
| **`docs/`** | Runbooks, architecture, roadmap | Start with `PM-HANDOFF.md` |
| **`public/`** | Logos, static assets | Brand SVGs also in `shoprally-brand-kit/` |
| **`scripts/`** | Dev utilities, seed helpers, smoke tests | Not user-facing |
| **`agents/`** | AI agent prompts + build state per workstream | Eng coordination; see ignore list below |
| **`apps/tech-mobile/`** | Expo technician mobile app (future) | Separate from web CRM |
| **`prototypes/`** | Static HTML labs | Ignore unless explicitly reviving a prototype |
| **`.cursor/`** | Cursor rules and skills | AI tooling config |
| **`package.json`** | npm scripts (`dev`, `db:*`, `build`) | Dev port 3031 via `npm run dev` |
| **`.env.example`** | Required env var list | Copy to `.env.local`; never commit secrets |
| **`SHOPRALLY.md`**, **`AGENTS.md`**, **`CLAUDE.md`** | High-level project context | Eng/onboarding |
| **`PROJECT_SPEC.md`** | Domain model and feature spec | Deep product reference |
| **`vercel.json`** | Deploy config | Infra |
| **`tmp/`**, **`tmp-vindecoder-test/`** | Scratch / test artifacts | Safe to ignore |

**Outside this repo:** sibling **`karvio/`** — do not use for ShopRally work.

---

## `src/` — where the product lives

| Path | What |
|------|------|
| **`src/app/(marketing)/`** | Public marketing site (`/`, `/pricing`, `/features`, …) |
| **`src/app/(app)/`** | Authenticated shop CRM + platform routes |
| **`src/app/(app)/platform/`** | Platform owner console |
| **`src/app/(app)/job-board/`** | Kanban job board |
| **`src/app/(app)/repair-orders/`** | RO workspace (estimate, inspections, payment) |
| **`src/app/(app)/customers/`**, **`vehicles/`**, **`settings/`** | Core shop modules |
| **`src/app/(app)/marketing/`** | Campaigns, automations, SEO, reviews |
| **`src/app/(app)/design-review/`** | **Lab** — batch UI review pages; not prod IA |
| **`src/app/sites/[slug]/`** | Tenant customer microsites (ShopSite) |
| **`src/app/approve/`**, **`invoice/`**, **`book/`** | Public customer-facing flows |
| **`src/server/`** | Server actions, queries, services (business logic) |
| **`src/server/trpc/`** | tRPC routers (where used) |
| **`src/components/`** | Shared UI; domain folders mirror features |
| **`src/components/estimate-building/`** | Estimate lab components (some merged into prod RO) |
| **`src/components/rp2/`** | Legacy folder name — still active code |
| **`src/lib/`** | Config: nav, brand, plans, permissions, release flags |
| **`src/inngest/`** | Background job definitions |

---

## `prisma/`

| Path | What |
|------|------|
| **`schema.prisma`** | Full data model (shops, ROs, customers, invoices, …) |
| **`migrations/`** | Ordered migration history — prod uses `npm run db:deploy` |
| **`seed.ts`** | Demo shops, Macuto QA tenant, 352-customer CSV import |
| **`data/`** | Seed CSVs and static seed inputs |

---

## `docs/` — PM-relevant picks

| Doc | Topic |
|-----|--------|
| **`PM-HANDOFF.md`** | **Start here** |
| **`SHOPRALLY-DEV.md`** | Dev 3031 setup |
| **`cloud-architecture.md`** | Prod topology + env |
| **`platform-operations.md`** | Platform admin ops |
| **`PHASED-ROLLOUT.md`** | Feature flags, kill switches |
| **`MIGRATION-EXPAND-CONTRACT.md`** | Safe DB changes on live |
| **`GROWTH-POSITIONING.md`** | Marketing copy source |
| **`SPRINT-ROADMAP-Q3-2026.md`** | Near-term priorities |
| **`scenarios/CORE-PNL-SCALE.md`** | Scale / P&L model |
| **`SHOP_ONBOARDING.md`** | New shop intake compliance |

---

## `agents/` — open vs ignore

### Still useful (active workstreams)

| Agent folder | Purpose |
|--------------|---------|
| **`ShopRallyCRM/`** | Primary CRM agent — `CONTINUE.md`, `BUILD-STATE.md` |
| **`WebsiteCode/`** | Tenant websites + platform websites pipeline |
| **`SeoAutopilot/`** | SEO automation module |
| **`ShopRallyTechApp/`** | Mobile tech app |
| **`MasterCRM/`** | Platform / master CRM coordination |

### Ignore for day-to-day PM (labs / experiments)

| Agent folder | Purpose |
|--------------|---------|
| **`OrderProcessLab/`** | Three-agent intake→estimate experiment — not in prod |
| **`EstimateBuilding/`** | Estimate UI blend specs — reference only |
| **`Autopilot3030/`** | Isolated :3030 menu mockup agent |

---

## Ports cheat sheet

| Port | Command | Status |
|------|---------|--------|
| **3031** | `npm run dev` | **Active — use this** |
| 3001 | `npm run dev:3001` | Deprecated CRM shell |
| 3004 | `npm run dev:3004` | Legacy design-mode dev |
| 3030 | `npm run dev:3030` | Isolated Autopilot preview |
| 3010 | `npm run intake-lab` | Static prototype server |

---

## Quick npm commands

```bash
npm run dev              # Start CRM + marketing on :3031
npm run db:migrate       # Apply migrations locally
npm run db:deploy        # Production migrations (CI)
npm run db:seed          # Load demo data
npm run typecheck        # TypeScript check
npm run lint             # ESLint
```

Do **not** run `npm run db:push` against production.
