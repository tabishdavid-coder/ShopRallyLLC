# Phased rollout — protect live shops

**Last updated:** 2026-07-19  
**Code:** `src/lib/release-flags.ts`, `src/lib/subscription.ts` (`isReleased` / `canUseReleasedFeature`)  
**Ops:** Platform → Shops → shop detail → **Release flags**  
**Ignition go-live:** [`docs/IGNITION-GO-LIVE.md`](./IGNITION-GO-LIVE.md) · server audit [`docs/CORE-SERVER-AUDIT.md`](./CORE-SERVER-AUDIT.md) · founding shops [`docs/PLATFORM-FOUNDING-SHOPS.md`](./PLATFORM-FOUNDING-SHOPS.md)

---

## Principle: deploy ≠ release

| Layer | Question | Mechanism |
|-------|----------|-----------|
| **Plan entitlement** | Did this shop pay for / get assigned this capability? | `Shop.plan` + `planFeatures` → `canUseFeature()` |
| **Release flag** | Is this module safe to turn on for this shop *today*? | `planFeatures._release` → `isReleased()` |
| **Global kill switch** | Emergency OFF for everyone? | Env vars (`SMS_ENABLED`, `MOTOR_ENABLED`, `RELEASE_KILL_*`) |

Both entitlement **and** release must pass for Phase 1+ modules. Core CRM has no release flag (always available when the shop can log in).

```
DEV / Preview ──merge──► Prod (code present, flags OFF)
                              │
                              ▼
                     Platform flips flag for pilot shop
                              │
                              ▼
                     Monitor → ramp → GA (then remove release flag later)
```

---

## Product phases

| Phase | Released to live | Still dark |
|-------|------------------|------------|
| **P0 — Live base** | Core CRM (job board, ROs/estimates, customers/vehicles, DVIs, email share/approve, Operations Daily Snapshot, Core billing) + Clerk/tenancy | Growth Engine, SMS, MOTOR, PartsTech live punchout, ShopSite/SEO, AI |
| **P1 — Pro soft launch** | Growth Engine + SMS for pilot Pro shops | MOTOR, ShopSite/SEO, AI |
| **P2 — Labor data** | MOTOR (included Pro+) per-shop | Full AI suite |
| **P3 — Presence** | ShopSite + Growth Engine SEO | — |
| **P4 — Elite AI** | Receptionist, review AI, campaign/SEO AI | — |

---

## Release modules (`ReleaseModule`)

| Key | Gates |
|-----|--------|
| `growthEngine` | `/marketing/**` campaigns, automations, booking UI |
| `sms` | Outbound `sendShopSms` + share-via-SMS |
| `motorLabor` | MOTOR labor catalog / Labor Book MOTOR path |
| `partsTech` | PartsTech punchout / live catalog actions |
| `shopSite` | ShopSite editor / public site tooling |
| `websiteSeo` | Growth Engine SEO / Local SEO tooling |
| `aiSuite` | AI receptionist, review replies, campaign/SEO AI |

Stored on the shop as:

```json
{
  "shopSite": true,
  "_release": {
    "growthEngine": true,
    "sms": false,
    "motorLabor": false
  }
}
```

`resolvePlanFeatures()` strips `_release` so it never pollutes plan booleans.

### Defaults

- **Production** (`VERCEL_ENV=production`): release flags default **OFF** (dark).
- **Local / Preview**: default **ON** for entitled shops so DEV keeps working (`RELEASE_FLAGS_OPEN=true` forces open; `RELEASE_FLAGS_OPEN=false` forces closed everywhere).

### Kill switches (env)

| Env | Effect |
|-----|--------|
| `SMS_ENABLED=false` | All SMS off |
| `MOTOR_ENABLED=false` | MOTOR catalog off |
| `RELEASE_KILL_GROWTH_ENGINE=1` | Growth Engine off |
| `RELEASE_KILL_SMS=1` | SMS release path off (in addition to SMS_ENABLED) |
| `RELEASE_KILL_MOTOR_LABOR=1` | MOTOR release off |
| `RELEASE_KILL_PARTS_TECH=1` | PartsTech release off |
| `RELEASE_KILL_SHOP_SITE=1` | ShopSite release off |
| `RELEASE_KILL_WEBSITE_SEO=1` | SEO release off |
| `RELEASE_KILL_AI_SUITE=1` | AI suite release off |

---

## Expand / contract migrations

See [`docs/MIGRATION-EXPAND-CONTRACT.md`](./MIGRATION-EXPAND-CONTRACT.md). Summary:

1. **Expand** — additive nullable columns/tables only.
2. **Dual-write / flag-gate** — new path behind `isReleased`; old path remains default.
3. **Backfill** — migrate data while both paths work.
4. **Ramp** — flip release flags for pilots → all entitled shops.
5. **Contract** — drop old columns only after soak; never in the same deploy that flips behavior.

**Never** `prisma db push` in production. Use `prisma migrate deploy`.

---

## Cursor workflow

1. One ShopRally repo on `main` (short-lived PRs OK) — **no live fork**.
2. Phase 2+ prompts must say: flag-first, expand-only schema, server gate.
3. Local `:3031` → Vercel Preview → prod.
4. One module per agent chat; update `agents/ShopRallyCRM/BUILD-STATE.md` after sessions.
5. Never use prod `DATABASE_URL` in Cursor agent `.env`.

Cursor rule: `.cursor/rules/phased-rollout.mdc`.

### Shop UX (hide vs lock)

- **Hide** whole modules from daily chrome when plan or release is off (Growth, Care Plans / Elite premium, Messages/SMS, ShopSite hub). Care Plans use plan feature `maintenancePrograms` (Core/Pro = OFF; Elite = ON) plus release module `growthEngine`.
- **Soft-land** deep links with `PlanUpgradePanel` (upgrade CTA) — not silent `/dashboard?access=denied`.
- **Lock** owner discoverability surfaces (Subscription, Stripe Connect wall, optional SMS row under Communications).
- Release OFF → “not available yet” (do not upsell unreleased modules). See gating canvas + `src/server/crm-access.ts`.

---

## P0 Core CRM go-live checklist

Before inviting the first paying founding shop:

### Auth & tenancy
- [ ] Clerk Organizations live (`CLERK_SECRET_KEY`, publishable key)
- [ ] `getShopId()` never trusts client-passed `shopId`
- [ ] Platform admin enter-shop CRM audited

### Core product smoke (Preview + prod)
- [ ] Create customer + vehicle
- [ ] Create RO → estimate → labor/part lines → totals
- [ ] DVI create + customer share link
- [ ] Email estimate / approval link (`/approve/[token]`)
- [ ] Job board columns + status move
- [ ] Operations Daily Snapshot loads

### Billing
- [ ] `APP_URL` set to production domain
- [ ] Plan assignment (Core / STARTER) on founding shops
- [ ] Stripe Connect **deferred** for Ignition (manual Record only) — see `docs/stripe-connect-shop-payments.md`
- [ ] Optional fast follow: `STRIPE_PRICE_IGNITION_MONTHLY` / `ANNUAL` + `STRIPE_PRICE_AI_PLUS_MONTHLY` (platform Checkout, not Connect)

### Release safety
- [ ] Confirm `VERCEL_ENV=production` → Phase 1+ modules dark by default
- [ ] Prod env: `RELEASE_FLAGS_OPEN=false` (or unset; production defaults dark)
- [ ] Kill switches in Vercel: `SMS_ENABLED=false`, `MOTOR_ENABLED=false`, `RELEASE_KILL_*` as needed
- [ ] Platform admin can open **Release flags** on a shop detail page
- [ ] SMS / MOTOR / PartsTech / Growth return clear “not released” / plan errors when dark (see `docs/CORE-SERVER-AUDIT.md`)

### Ops
- [ ] Neon prod backups / point-in-time recovery enabled
- [ ] `prisma migrate deploy` in CI/CD (never `db push` in prod)
- [ ] Resend configured for estimate/invoice/approve email (`RESEND_API_KEY`)
- [ ] Twilio webhooks point at prod domain only when SMS releases
- [ ] Support contact path works (`/support` + `PLATFORM_CONTACT_EMAIL`)

### Preview gate
- [ ] Last P0 PR passed Vercel Preview smoke above before merge to `main`
- [ ] Macuto + one freshly provisioned Core shop bay loop (see `docs/PLATFORM-FOUNDING-SHOPS.md`)
