# ShopRally — PM handoff

**Audience:** New project manager (non-engineering primary).  
**Last updated:** 2026-07-18

This is the short orientation doc. For folder-level navigation, see [`PM-REPO-MAP.md`](./PM-REPO-MAP.md).

---

## Product identity

| Item | Value |
|------|--------|
| **Product** | ShopRally — cloud shop-management CRM for auto repair |
| **Canonical repo folder** | `ShopRally/` only (e.g. `C:\Users\...\ShopRally` or your Git clone) |
| **Public site** | [getShopRally.com](https://getshoprally.com) |
| **Brand contact email** | **hello@getshoprally.com** |
| **Local dev** | `npm run dev` → **http://localhost:3031** |

**Do not:**

- Develop in the sibling **`karvio/`** folder — legacy platform fork, not the live product.
- Treat **RepairPilot** as the live brand (old name; kept only in legacy strings and `BRAND.formerName`).
- Use ports **3000**, **3001**, or **3004** as primary dev — those are archived or comparison shells.

---

## How data works

ShopRally is **one Postgres database, many shops**. Every business record is scoped by `shopId`. Platform owners manage all shops from **`/platform`**.

| Topic | Detail |
|-------|--------|
| **Database** | Neon Postgres |
| **ORM / schema** | Prisma — `prisma/schema.prisma` |
| **Migrations** | `prisma/migrations/` — versioned SQL, committed to git |
| **Local migrate** | `npm run db:migrate` |
| **Production migrate** | `npm run db:deploy` (CI/CD: `prisma migrate deploy`) |
| **Never in prod** | `npm run db:push` — dev-only shortcut |
| **Seed / demo data** | `npm run db:seed` |
| **Money** | Stored as integer **cents** (never floats) |
| **Tenancy rule** | Server resolves the current shop from auth; never trust client-supplied `shopId` |

**Read next (engineering depth):**

- [`cloud-architecture.md`](./cloud-architecture.md) — Vercel, Neon, integrations, env checklist
- [`platform-operations.md`](./platform-operations.md) — platform admin, shop onboarding, ops runbook
- [`MIGRATION-EXPAND-CONTRACT.md`](./MIGRATION-EXPAND-CONTRACT.md) — safe schema change pattern on live data
- [`PHASED-ROLLOUT.md`](./PHASED-ROLLOUT.md) — deploy ≠ release; feature flags per shop

---

## Stack at a glance

| Layer | Technology | Notes |
|-------|------------|-------|
| App | Next.js 16 (App Router) | Single app: marketing + shop CRM + platform console |
| Hosting | Vercel | One shared production deploy |
| Database | Neon Postgres | Serverless Postgres; preview branches for PRs |
| Auth | Clerk (Organizations) | **In progress** — stub platform admin via env email today |
| Payments | Stripe (+ Connect for shops) | Partial wiring |
| SMS | Twilio | Live with mock fallback when env unset |
| Email | Resend | Live with mailto fallback |
| Background jobs | Inngest | Campaign sends, automations, SEO jobs |
| Mobile (future) | Expo app in `apps/tech-mobile/` | Separate surface; not primary CRM |

Brand tokens and contact email live in `src/lib/brand.ts`.

---

## What is live vs noise

### Live (product surfaces)

- **Shop CRM** on port **3031** — job board, repair orders, estimates, customers, settings, marketing modules
- **Marketing website** — `/`, `/features`, `/pricing`, `/demo`, `/launch`
- **Platform owner console** — `/platform/**` (shops, onboarding, billing, release flags)
- **Public customer flows** — `/approve/[token]`, `/invoice/[token]`, `/book/[slug]`, tenant sites `/sites/[slug]`

### Ignore / archive (PM clarity — still in repo)

| Path / artifact | Why ignore |
|-----------------|------------|
| Sibling **`karvio/`** folder | Legacy fork |
| **`agents/OrderProcessLab/`** | Experimental intake/estimate pipeline — not merged to prod |
| **`agents/EstimateBuilding/`**, **`/design-review/**`** | Design labs and batch review pages |
| **`prototypes/`** | Static HTML prototypes (e.g. intake-lab on :3010) |
| Ports **3000** (`_archive-repairpilot`), **3001**, **3004**, **3030** | Old shells or isolated previews |
| SnagIt / competitor videos | Reference only; live outside repo |

### Internal leftovers (OK — not user-facing brand)

- Folder name **`components/rp2/`** — legacy prefix, still in use
- Master IDs like **`RP-`** format in platform records
- **`BRAND.formerName`** = `"RepairPilot"` in code for migration context
- Cookie dual-read: writes **`sr_*`**, still reads legacy **`rp_*`**

---

## Recent cleanup (already done)

So the PM knows these are settled — no open brand migration task:

- User-facing strings → **ShopRally** (not RepairPilot / Karvio)
- Platform contact + stub admin default → **hello@getshoprally.com**
- Cookies write `sr_*` with legacy `rp_*` read for backward compatibility
- FAQ seed upsert + refresh script: `scripts/refresh-faq-brand.ts`

---

## Scale note (~1,000 shops)

Architecture is already **multi-tenant single deploy** — no per-shop app fork.

**Watch as you grow:**

| Area | Why it matters |
|------|----------------|
| Neon connection pooling | Serverless functions × many shops |
| Indexes on `shopId` | Every query must stay tenant-scoped and fast |
| Inngest | Offload bulk SMS, campaigns, SEO crawls from request path |
| Blob storage | Inspection photos, documents (Vercel Blob stub in code) |
| Backups / PITR | Neon point-in-time recovery for prod |
| Clerk Organizations | Finish M1b — replace stub platform admin auth |

**P&L / unit economics:** [`scenarios/CORE-PNL-SCALE.md`](./scenarios/CORE-PNL-SCALE.md) — ARPU, infra cost curves, headcount model through 1k shops.

---

## Access checklist

Hand these off with credentials stored in your team password manager — not in git.

- [ ] **GitHub** — repo access, branch protection, CI secrets
- [ ] **Vercel** — project, env vars, domains
- [ ] **Neon** — prod DB, connection strings, PITR enabled
- [ ] **Clerk** — app keys (when wired)
- [ ] **Stripe** — platform + Connect dashboard
- [ ] **Twilio** — SMS number + webhook URL
- [ ] **Resend** — sending domain
- [ ] **Domain DNS** — getShopRally.com / getshoprally.com (and any tenant custom domains)
- [ ] **Local `.env`** — copy from `.env.example`; set `PLATFORM_ADMIN_EMAIL=hello@getshoprally.com`

**First local run:**

```bash
cd ShopRally
npm install
cp .env.example .env.local   # fill DATABASE_URL and keys
npm run db:migrate
npm run db:seed              # optional demo data
npm run dev                  # http://localhost:3031
```

---

## Demo path (Core QA shop)

**Macuto Auto Repair** is the seeded Core-plan QA tenant (`shop_macuto`). Platform admins can enter it without manual shop switching.

**Job board (quick demo):**

```
http://localhost:3031/platform/enter?shop=shop_macuto&next=%2Fjob-board
```

**Dashboard:**

```
http://localhost:3031/platform/enter?shop=shop_macuto&next=%2Fdashboard
```

**Sample estimate RO:**

```
http://localhost:3031/platform/enter?shop=shop_macuto&next=%2Frepair-orders%2Fro_macuto_1001%2Festimate
```

Requires local dev running and a platform-admin session (stub: email in `PLATFORM_ADMIN_EMAIL`).

---

## Where to go next

| Need | Doc |
|------|-----|
| Dev setup detail | [`SHOPRALLY-DEV.md`](./SHOPRALLY-DEV.md) |
| Repo folder map | [`PM-REPO-MAP.md`](./PM-REPO-MAP.md) |
| Product / positioning copy | [`GROWTH-POSITIONING.md`](./GROWTH-POSITIONING.md) |
| Sprint / roadmap | [`SPRINT-ROADMAP-Q3-2026.md`](./SPRINT-ROADMAP-Q3-2026.md) |
| AI agent context (for eng) | [`../AGENTS.md`](../AGENTS.md), [`../SHOPRALLY.md`](../SHOPRALLY.md) |
