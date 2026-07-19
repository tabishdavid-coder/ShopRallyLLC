# ShopRally — Platform Operations

Authoritative design for subscription tiers, remote platform administration, support, and FAQ with AI.

---

## Architecture overview

ShopRally is **true multi-tenant SaaS**: one Vercel deployment, one Neon Postgres database, row-level isolation via `shopId`. There is **no per-shop deploy** — platform admins manage all tenants from `/platform/shops`.

```
┌─────────────────────────────────────────────────────────────┐
│  Vercel — single Next.js app (all shops)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Shop A tenant│  │ Shop B tenant│  │ Platform admin│      │
│  │ (cookie/org) │  │ (cookie/org) │  │ /platform/*  │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
          └─────────────────┴─────────────────┘
                            │
                    Neon Postgres
              (Shop, FaqArticle, SupportTicket, …)
```

| Concern | Implementation | Status |
|---------|----------------|--------|
| Tenant isolation | `shopId` on every model; `getShopId()` server-side | Live |
| Platform admin | `User.isPlatformAdmin` + `PLATFORM_ADMIN_EMAILS` stub | Live (Clerk M1b) |
| Shop subscription | `Shop.plan`, `billingStatus`, `trialEndsAt` | Live |
| Stripe Connect | Per-shop Express account (customer payments) | Partial |
| Stripe Billing | `stripeCustomerId`, `stripeSubscriptionId` on Shop | Schema ready, integration deferred |
| Support tickets | `SupportTicket` model + contact form | Scaffold live |
| FAQ + AI | `FaqArticle` seed + RAG-lite Anthropic assist | Scaffold live |

See also [`docs/cloud-architecture.md`](./cloud-architecture.md) for deployment topology.
See [`docs/PHASED-ROLLOUT.md`](./PHASED-ROLLOUT.md) for deploy ≠ release, release flags, and founding go-live checklist.
See [`docs/MIGRATION-EXPAND-CONTRACT.md`](./MIGRATION-EXPAND-CONTRACT.md) for safe Prisma changes on live Neon.

---

## Subscription tiers

### Tier catalog

ShopRally uses the existing `ShopPlan` enum (`STARTER`, `PROFESSIONAL`, `ENTERPRISE` marketed as **Scale**). Feature gates live in `src/lib/plans.ts`; subscription helpers in `src/lib/subscription.ts`.

| Tier | Users | ROs/month | Key features |
|------|-------|-----------|--------------|
| **Starter** | Up to 5 | 150 | Core CRM, job board, estimates, DVI, approval/invoice links |
| **Professional** | Unlimited | Unlimited | + PartsTech, labor guide, SMS, reports, markup matrices |
| **Scale (Enterprise)** | Unlimited | Unlimited | + Multi-location admin, advanced reporting |

Billing lifecycle uses `BillingStatus`: `TRIAL`, `ACTIVE`, `PAST_DUE`, `CANCELED`.

### Schema (on `Shop`)

```prisma
plan              ShopPlan      @default(PROFESSIONAL)
planFeatures      Json?         // per-shop overrides merged onto plan defaults
trialEndsAt       DateTime?
billingStatus     BillingStatus @default(ACTIVE)
stripeCustomerId     String? @unique  // Stripe Billing (platform subscription)
stripeSubscriptionId String? @unique
lastActiveAt         DateTime?        // platform admin health metric
```

`ShopStatus` (`ACTIVE`, `TRIAL`, `SUSPENDED`) controls shop access separately from billing.

### Signup flow (scaffold)

1. **Public `/signup`** — placeholder until Clerk Organizations (M1b).
2. On org creation → `defaultSignupSubscription()` assigns:
   - `plan: STARTER`
   - `billingStatus: TRIAL`
   - `status: TRIAL`
   - `trialEndsAt`: now + 14 days
3. Shop owner views **Settings → Billing & Plan** (`/settings/subscription`, alias `/settings/billing`).
4. Upgrade CTA stub → future Stripe Checkout Session.

### Feature gates

```typescript
import { canUseFeature } from "@/lib/subscription";

// Friendly keys → PlanFeature mapping in subscription.ts
await canUseFeature(shopId, "inspections");  // digitalInspections
await canUseFeature(shopId, "parts");        // partsTech
await canUseFeature(shopId, "sms");          // customerSms
```

Canceled shops retain read-only core CRM; past-due shops keep features until enforcement is wired.

---

## Remote platform administration

### Access control

- Route prefix: `/platform/*` guarded by `isPlatformAdmin()` in layout.
- Env: `PLATFORM_ADMIN_EMAILS=admin1@example.com,admin2@example.com` (falls back to legacy `PLATFORM_ADMIN_EMAIL`).
- After Clerk: `publicMetadata.role === "platform_admin"` or separate Clerk application.

### Dashboard (`/platform/shops`)

- Lists all shops with plan, billing status, location, customer/RO counts, **MRR stub**, **last active**.
- Actions: create shop, edit tier/status, **Enter** (sets `sr_active_shop` cookie → shop tenant context).
- Suspend: set `Shop.status = SUSPENDED` (enforcement hook deferred).

### Deployment model

| Environment | Vercel | Neon | Notes |
|-------------|--------|------|-------|
| Production | `main` branch | Production branch | `prisma migrate deploy` in CI |
| Preview | PR branches | Optional preview branch | Ephemeral QA |
| Local | `npm run dev` | Local or Neon dev | `db:push` / `db:migrate` |

**No separate deploy per shop.** All shops share the same codebase and database; isolation is data-layer only.

### Health metrics (stub → future)

- `lastActiveAt` — update on authenticated requests (middleware hook deferred).
- MRR — `estimateShopMrrCents(plan, billingStatus)` sums active paid shops.
- Future: Inngest cron for trial expiry, past-due emails, usage limits.

---

## Support contact

### In-app surfaces

| Surface | Path / component |
|---------|------------------|
| Sidebar | Admin → **Help & Support** → `/support` |
| Floating widget | `SupportWidget` — bottom-right `?` on all app pages |
| FAQ | `/support/faq` |

### Support tickets

```prisma
model SupportTicket {
  id      String @id
  shopId  String?   // auto-filled from getShopId() when available
  name    String
  email   String
  subject String
  body    String
  status  SupportTicketStatus  // OPEN | IN_PROGRESS | RESOLVED | CLOSED
}
```

- Server action: `createSupportTicket` in `src/server/actions/support.ts`.
- Email notification: dev console log; wire Resend to `hello@getshoprally.com` later.
- Live chat: placeholder copy on support page.

---

## FAQ library + AI assist

### Data model

```prisma
model FaqArticle {
  slug      String @unique
  category  String
  question  String
  answer    String @db.Text
  sortOrder Int
  published Boolean
}
```

15 seed articles in `prisma/data/faqs.ts` (getting started, billing, Stripe Connect, booking, inspections, tires, SMS, support).

### AI assist (`FaqAiAssistant`)

1. User types a question on `/support` or `/support/faq`.
2. If `ANTHROPIC_API_KEY` is set → `askSupportAi()` injects FAQ titles/bodies as RAG-lite context (same Anthropic SDK pattern as labor guide).
3. Fallback → keyword search via `searchFaqs()`.
4. UI shows answer + “Was this helpful?” + link to contact form.

Model default: `claude-haiku-4-5` (`SUPPORT_AI_MODEL` override).

---

## Stripe Billing integration (deferred steps)

Stripe **Connect** (shop customer payments) is separate from Stripe **Billing** (ShopRally subscription fees).

### Phase 2 — Stripe Billing wiring

1. **Products & Prices** in Stripe Dashboard:
   - `shoprally_starter_monthly`, `shoprally_professional_monthly`, `shoprally_scale_monthly`
   - Mirror cents from `PLANS` in `src/lib/plans.ts`.

2. **Checkout Session** on Upgrade click:
   - Create Stripe Customer (`stripeCustomerId`) on first checkout.
   - `mode: "subscription"`, metadata `{ shopId }`.
   - Success/cancel URLs → `/settings/subscription`.

3. **Customer Portal** on “Manage billing”:
   - `stripe.billingPortal.sessions.create({ customer, return_url })`.

4. **Webhook** `/api/webhooks/stripe-billing`:
   - `customer.subscription.created|updated|deleted`
   - `invoice.payment_failed` → `billingStatus: PAST_DUE`
   - Sync `plan` from price metadata, `stripeSubscriptionId`.

5. **Trial conversion**:
   - Cron or Stripe trial period on subscription create at signup.

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `PLATFORM_ADMIN_EMAILS` | Comma-separated platform admin emails (stub auth) |
| `PLATFORM_ADMIN_EMAIL` | Legacy single admin (fallback) |
| `ANTHROPIC_API_KEY` | FAQ AI assist (+ labor guide) |
| `SUPPORT_AI_MODEL` | Optional override (default `claude-haiku-4-5`) |
| `STRIPE_SECRET_KEY` | Platform Stripe (Billing + Connect) |

---

## How to test

```bash
# Apply migration
npm run db:migrate

# Seed FAQ articles (+ demo data)
npm run db:seed

# Typecheck
npx tsc --noEmit

# Dev server
npm run dev
```

Verify routes return 200:

- http://localhost:3000/support
- http://localhost:3000/support/faq
- http://localhost:3000/settings/subscription
- http://localhost:3000/settings/billing (redirects to subscription)
- http://localhost:3000/platform/shops (platform admin)
- http://localhost:3000/signup

**Support widget:** click `?` bottom-right on any app page.

**FAQ AI:** set `ANTHROPIC_API_KEY`, ask a question on `/support/faq`. Without key, keyword search fallback applies.

**Contact form:** submit ticket → check `SupportTicket` in Prisma Studio (`npm run db:studio`).

**Platform admin:** set `PLATFORM_ADMIN_EMAILS` to your stub user email; open `/platform/shops`, change a shop’s plan/tier.

---

## File map

| Path | Role |
|------|------|
| `src/lib/subscription.ts` | Tier helpers, feature gates, signup defaults |
| `src/lib/plans.ts` | Plan catalog & feature matrix |
| `src/lib/platform.ts` | Platform admin auth stub |
| `src/server/platform-shops.ts` | Shop list + KPIs for admin UI |
| `src/server/support.ts` | FAQ queries + keyword search |
| `src/server/services/support-ai.ts` | Anthropic FAQ assist |
| `src/server/actions/support.ts` | Tickets + ask FAQ action |
| `src/components/support/*` | Widget, contact form, AI assistant |
| `src/app/(app)/support/*` | Support hub + FAQ pages |
| `src/app/(app)/platform/shops/page.tsx` | Remote ops dashboard |
| `prisma/data/faqs.ts` | FAQ seed content |
