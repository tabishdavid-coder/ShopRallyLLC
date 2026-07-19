# ShopRally — Cloud Architecture

Authoritative reference for deploying ShopRally as a multi-tenant SaaS on Vercel.

---

## Deployment topology

```
                    ┌─────────────────────────────────────────┐
                    │              Vercel (Edge + Node)        │
                    │  Next.js 16 App Router — serverless     │
                    │  functions + Route Handlers (webhooks)  │
                    └───────┬─────────┬──────────┬───────────┘
                            │         │          │
              ┌─────────────┘         │          └──────────────┐
              ▼                       ▼                         ▼
     ┌────────────────┐    ┌─────────────────┐      ┌──────────────────┐
     │ Neon Postgres   │    │ Clerk (planned)  │      │ Inngest (planned) │
     │ serverless PG   │    │ Organizations    │      │ background jobs   │
     └────────────────┘    └─────────────────┘      └──────────────────┘
              │
              ▼
     ┌────────────────┐    ┌─────────────────┐      ┌──────────────────┐
     │ Stripe Connect  │    │ Twilio SMS       │      │ Resend email      │
     │ platform acct   │    │ inbound webhook  │      │ (optional)        │
     └────────────────┘    └─────────────────┘      └──────────────────┘
              │
              ▼
     ┌────────────────┐    ┌─────────────────┐
     │ Vercel Blob      │    │ Upstash Redis    │
     │ (planned uploads)│    │ (optional rate)  │
     └────────────────┘    └─────────────────┘
```

| Service | Role | Status |
|---------|------|--------|
| **Vercel** | Host Next.js, HTTPS, auto-scaling serverless | Ready |
| **Neon** | Primary Postgres (prod + preview branches) | Live |
| **Clerk** | Auth + Organizations (1 shop = 1 org) | Stub — M1b |
| **Inngest** | Long-running / scheduled jobs | Not wired |
| **Stripe Connect** | Platform payments + per-shop Express accounts | Partial |
| **Twilio** | Outbound + inbound SMS | Live (mock fallback) |
| **Resend** | Transactional email | Live (mailto fallback) |
| **Vercel Blob** | Inspection photos, documents | Stub interface only |

---

## Multi-tenant data isolation

1. **Every tenant-scoped model** carries `shopId` (see `prisma/schema.prisma`).
2. **All server queries/mutations** resolve the active shop via `getShopId()` in `src/lib/shop.ts` — never trust a client-supplied `shopId`.
3. **Per-shop integrations** (PartsTech, Google Reviews, Stripe Connect account id, etc.) live in `ShopIntegration` rows — not env files or local config.
4. **Platform admin** can switch shops via cookie `sr_active_shop` (legacy `rp_active_shop` still read); shop users are limited to `Membership` rows.
5. **Public pages** (`/approve/[token]`, `/invoice/[token]`, `/inspection/[token]`) use unguessable tokens — no shop id in the URL.

### Clerk migration path (M1b)

Current stub (`src/lib/platform.ts`, `src/lib/shop.ts`):

| Today | After Clerk |
|-------|-------------|
| `getCurrentUser()` reads `PLATFORM_ADMIN_EMAIL` from DB | `auth()` from `@clerk/nextjs/server` |
| Shop switcher cookie `sr_active_shop` | Clerk Organization = Shop; `orgId` maps to `Shop.clerkOrgId` |
| `Membership` links User ↔ Shop | Sync from Clerk org membership webhooks |
| Platform admin via `User.isPlatformAdmin` | Clerk `publicMetadata.role === "platform_admin"` or separate Clerk app |

Replace stub incrementally: middleware → `getCurrentUser` → `getShopId` / `canAccessShop`.

---

## Environment variables (production checklist)

Copy `.env.example` → Vercel Project Settings → Environment Variables.

### Required for prod

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon **pooled** connection string (`?pgbouncer=true` or Neon pooler host) |
| `APP_URL` | Canonical HTTPS origin, e.g. `https://app.getshoprally.com` |
| `CLERK_SECRET_KEY` | Server auth (when M1b ships) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Client auth |
| `STRIPE_SECRET_KEY` | Platform Stripe secret |
| `STRIPE_WEBHOOK_SECRET` | Verify `/api/webhooks/stripe` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Connect embedded UI (future) |

### Integrations (enable as features go live)

| Variable | Purpose |
|----------|---------|
| `TWILIO_*` | Live SMS |
| `RESEND_API_KEY` (+ shop From in Settings; optional `EMAIL_FROM` for internal only) | Live email — see `docs/SHOP-EMAIL.md` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | GBP reviews OAuth |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | Background jobs |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob uploads |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Distributed rate limiting (optional) |

### Auto-set on Vercel (do not override unless needed)

| Variable | Purpose |
|----------|---------|
| `VERCEL_URL` | Preview deployment host — `getAppUrl()` falls back here when `APP_URL` unset |

**Always set `APP_URL` in production** to your custom domain. Preview deploys can rely on `VERCEL_URL`.

Use `getAppUrl()` / `publicUrl()` from `src/lib/app-url.ts` for all absolute links — never hardcode `localhost:3000`.

---

## What runs where

| Workload | Runtime | Notes |
|----------|---------|-------|
| Pages, Server Components, Server Actions | Vercel Node serverless | Default; 10–60s timeout by plan |
| Webhooks (`/api/webhooks/stripe`, `/api/webhooks/twilio/sms`) | Route Handlers | Must be public HTTPS; verify signatures |
| OAuth callbacks (`/api/google/reviews/callback`) | Route Handlers | Redirect URIs must match `APP_URL` |
| Public share pages (`/approve`, `/invoice`, `/inspection`) | RSC / static | No auth; token-gated |
| Edge middleware (future Clerk) | Edge | Session cookies; no filesystem |
| Long AI labor batch, review sync cron | **Inngest** (planned) | Not in-request — see below |

No file-based sessions. Cookies (`sr_active_shop`, legacy `rp_active_shop`, future Clerk session) are HTTP-only and work across Vercel instances.

---

## Database (Neon serverless)

- **Provider:** PostgreSQL via Prisma (`prisma/schema.prisma`).
- **Connection pooling:** Use Neon's pooler URL in `DATABASE_URL` for serverless (avoids connection exhaustion). Direct URL can be used for migrations only (`DIRECT_URL` — add when splitting).
- **Migrations in CI/CD:** `npx prisma migrate deploy` — **never** `db:push` in production.
- **Build step:** `prisma generate` before `next build`.
- **No SQLite** — Postgres only.

Recommended Vercel build command:

```bash
npx prisma generate && npx prisma migrate deploy && next build
```

Or split: run `migrate deploy` in a CI step before deploy; build only runs `prisma generate && next build`.

Dev scripts (`db:migrate`, `db:seed`) stay local-only.

---

## File uploads

Inspection photos and documents **must not** use the local filesystem on Vercel (ephemeral, non-shared across instances).

Interface: `src/server/services/cloud-storage.ts`

| Provider | When | Status |
|----------|------|--------|
| `LocalDevStorageProvider` | No `BLOB_READ_WRITE_TOKEN` | Dev stub — logs warning in prod |
| `VercelBlobStorageProvider` | Token set | TODO — install `@vercel/blob` |

Future: S3/R2 providers behind the same interface if needed.

---

## Background jobs (Inngest — planned)

These should **not** block HTTP requests in production:

| Task | Today | Target |
|------|-------|--------|
| Estimate/invoice email + SMS | Sync in Server Actions (`share.ts`) | OK for now; queue if volume grows |
| Google Reviews sync | Sync in Server Action | Inngest cron per shop |
| Labor catalog refresh (`refreshStaleLaborOperations`) | Manual / script only | Inngest cron |
| Labor batch seed (`db:build-labor`) | Local script | Inngest or one-off job |
| Stripe webhook side effects | Sync in webhook handler | OK — keep idempotent |
| Carfax SFTP push | Not built | Inngest + external storage |

No Inngest SDK or `/api/inngest` route exists yet.

---

## Stateless app constraints

| Pattern | Status | Risk |
|---------|--------|------|
| Prisma client singleton (`globalThis` in dev) | OK | Standard Next.js pattern |
| Provider singletons (SMS, email, PartsTech) | OK | Env-based, read-only config |
| In-memory rate limiting | **Not present** | Add Upstash before public API abuse |
| Labor guide DB cache (`LaborOperation`) | OK | Shared Postgres, not process memory |
| OneDrive CSS cache (dev only) | Local quirk | See below |

---

## Webhooks & OAuth URLs

All external callbacks must use **`APP_URL`** (via `getAppUrl()`):

| Integration | Endpoint |
|-------------|----------|
| Stripe | `https://YOUR_DOMAIN/api/webhooks/stripe` |
| Twilio SMS | `https://YOUR_DOMAIN/api/webhooks/twilio/sms` |
| Google Reviews OAuth | `https://YOUR_DOMAIN/api/google/reviews/callback` |
| Stripe Connect return | `https://YOUR_DOMAIN/payments/account` |
| PartsTech punchout return | `https://YOUR_DOMAIN/api/partstech/return` |

Register these exact URLs in each provider's dashboard.

---

## Local dev on OneDrive (not production)

Developing under OneDrive (`C:\Users\...\OneDrive\...`) can cause:

- Slow or locked `node_modules` operations
- **Turbopack CSS cache staleness** — after editing `globals.css`, run:
  ```bash
  rm -rf .next node_modules/.cache
  ```
  then restart `npm run dev`.

This is a **local dev quirk only**. Production on Vercel is unaffected.

For smoother dev, clone the repo to e.g. `C:\dev\shoprally`.

---

## Pre-production checklist

- [ ] Neon project + pooled `DATABASE_URL` in Vercel
- [ ] `APP_URL=https://your-domain.com` in Vercel production
- [ ] `prisma migrate deploy` in CI/CD (not `db:push`)
- [ ] Clerk keys + Organizations wired (M1b)
- [ ] Stripe Connect enabled; webhook endpoint registered
- [ ] Twilio webhook URL set to production domain
- [ ] Google OAuth consent screen: prod redirect URI registered
- [ ] `RESEND_API_KEY` + each shop From domain verified in Resend (see `docs/SHOP-EMAIL.md`)
- [ ] Inngest app + signing keys; migrate long jobs
- [ ] `BLOB_READ_WRITE_TOKEN` before inspection photo uploads
- [ ] Optional: Upstash Redis for API rate limits
- [ ] Remove / gate stub auth (`PLATFORM_ADMIN_EMAIL`) before go-live
