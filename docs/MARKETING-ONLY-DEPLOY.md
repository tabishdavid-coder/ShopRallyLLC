# Marketing-only deploy (Vercel Production)

**Decision:** Public getShopRally.com serves the **marketing website only**. Shop CRM stays in **local development** (`npm run dev` → http://localhost:3031) until you intentionally unlock it.

CRM code remains in the repo. This is a **runtime gate**, not a monorepo split.

---

## How the gate works

| Runtime | Gate |
|---------|------|
| Local `npm run dev` | **Off** — full CRM |
| Vercel Preview | **Off** unless `MARKETING_ONLY=true` |
| Vercel Production | **On** by default (fail-safe) |
| Explicit | `MARKETING_ONLY=true` → on; `MARKETING_ONLY=false` → unlock CRM |

Implementation:

- [`src/lib/marketing-prod-gate.ts`](../src/lib/marketing-prod-gate.ts) — allowlist + `isMarketingOnlyProduction()`
- [`src/middleware.ts`](../src/middleware.ts) — runs the gate **before** Clerk so adding Clerk keys cannot open CRM
- [`src/app/(app)/layout.tsx`](../src/app/(app)/layout.tsx) — defense in depth (redirect if shell somehow reached)
- Clean page: [`/crm-unavailable`](../src/app/(marketing)/crm-unavailable/page.tsx)

When the gate is on:

- **Allowed:** `/`, `/pricing`, `/features`, `/demo`, `/launch`, `/compare/**`, `/legal/**`, `/login`, `/signup`, `/crm-unavailable`, sitemap/robots/OG, brand assets
- **Blocked CRM routes** (`/job-board`, `/customers`, `/platform`, …) → **307** to `/crm-unavailable` (not the Autopilot shell)
- **Blocked APIs** (`/api/**`) → **404 JSON** (waitlist/demo leads use Server Actions on marketing page paths, not CRM APIs)

---

## Env vars (Vercel Production)

| Variable | Value | Required? |
|----------|-------|-----------|
| `MARKETING_ONLY` | `true` | **Set it** (belt + suspenders). Missing still blocks CRM on Vercel Production. |
| `APP_URL` | `https://getshoprally.com` | Yes (canonical links / emails) |
| `DATABASE_URL` | Neon pooled URL | Yes (waitlist / demo lead writes) |
| `RESEND_API_KEY` / `EMAIL_FROM` / `PLATFORM_LEAD_NOTIFY_EMAIL` | as needed | Optional for lead notify |
| Clerk keys | leave unset for marketing phase | Optional — **do not** treat Clerk as CRM unlock |

### Set via CLI

```bash
# From repo root (linked project shoprally)
echo true | npx vercel env add MARKETING_ONLY production
# or update if it already exists:
npx vercel env rm MARKETING_ONLY production -y
echo true | npx vercel env add MARKETING_ONLY production
```

### Set via Dashboard

1. [Vercel](https://vercel.com) → team **getshoprally** → project **shoprally**
2. **Settings → Environment Variables**
3. Add `MARKETING_ONLY` = `true`
4. Environment: **Production** only (keep Preview/local without it so Macuto QA still works on Preview)
5. Redeploy Production

### Unlock CRM later (intentional)

Only when you are ready for customers/operators on Production:

1. Set `MARKETING_ONLY=false` on Production
2. Ensure Clerk Orgs + auth are live
3. Redeploy
4. Follow [`MARKETING-SITE-GO-LIVE.md`](./MARKETING-SITE-GO-LIVE.md) Phase 2 / Ignition go-live

---

## Local full CRM

```bash
cd ShopRally
npm run dev
# http://localhost:3031 — job board, customers, platform, etc.
```

Do **not** set `MARKETING_ONLY=true` in `.env.local` unless you are testing the gate locally.

---

## Smoke checks after deploy

```bash
curl -sI https://getshoprally.com/
curl -sI https://getshoprally.com/pricing
curl -sI https://getshoprally.com/features
curl -sI https://getshoprally.com/compare
# Expect 307 → /crm-unavailable?from=...
curl -sI https://getshoprally.com/job-board
curl -sI https://getshoprally.com/customers
curl -sI https://getshoprally.com/api/inventory/export
```

---

## What can still leak (honest)

| Risk | Mitigation / residual |
|------|------------------------|
| Bundle still contains CRM client chunks | Gate blocks navigation + APIs; attackers can still download JS from `_next/static` if they know chunk URLs — **no live CRM data** without auth/DB access |
| Server Actions on CRM routes | Middleware redirects non-allowlisted paths (including POSTs) before handlers run |
| Preview deployments | Gate **off** by default — use Vercel SSO / password if Preview must stay private |
| `MARKETING_ONLY=false` mistake | Explicit unlock; document ops checklist before flipping |
| Public share pages (`/approve`, `/invoice`) | **Blocked** while gate is on (marketing allowlist only) |
| Neon DB reachable from prod functions | Waitlist/demo leads still write tickets; CRM mutations are not reachable via gated routes |

This is **not** a code-split. For a true separate marketing deploy, split packages later.
