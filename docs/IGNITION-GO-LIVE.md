# Ignition (Core) — market go-live checklist

**Last updated:** 2026-07-19  
**Plan:** Ignition = Core = `STARTER` · $89.99/mo · $84.99/mo annual · PartsTech included · AI Plus $49.99/mo  
**Code:** `PHASE_ONE_LAUNCH` in [`src/lib/plans.ts`](../src/lib/plans.ts)  
**Product gates:** [`docs/CORE-PLAN-FIDELITY.md`](./CORE-PLAN-FIDELITY.md) · [`docs/PHASED-ROLLOUT.md`](./PHASED-ROLLOUT.md)  
**Marketing CTAs:** “Start now” vocabulary in [`src/lib/marketing-launch.ts`](../src/lib/marketing-launch.ts) · flip checklist [`docs/MARKETING-GO-LIVE-FLIP.md`](./MARKETING-GO-LIVE-FLIP.md)

Pro / Elite stay **dark** for public GTM. Founding shops are platform-provisioned first; Stripe Ignition Checkout is wired as a fast follow.

---

## A. Product fidelity (code)

- [x] PartsTech / free-type YMM / Finances tab gated on Core (merged)
- [x] MOTOR fail-closed via `motorEnabledForShop`
- [x] Growth section + `/marketing/**` denied on Core (except payment-account wall)
- [x] Payments hub + Labor Book (`/quick-labor`) hidden/gated on Core
- [x] Lead Sources (`/settings/marketing`) remains on Core
- [x] SMS share / Stripe Collect fail-closed on Core
- [ ] Macuto smoke: enter `shop_macuto` → bay loop (customer → RO → email approve → manual pay)

QA enter URL:

```
/platform/enter?shop=shop_macuto&next=/job-board
```

If nested `/platform/*` 404s locally: clear `.next` and restart (OneDrive reparse / stale route cache).

---

## B. Production ops (Vercel + Neon)

**Marketing-first path:** ship the site without Clerk first — see [`MARKETING-SITE-GO-LIVE.md`](./MARKETING-SITE-GO-LIVE.md). Prod middleware locks `/dashboard` + `/platform` until Clerk keys exist. Add Clerk + optional `app.getshoprally.com` in this section when CRM opens.

| Item | Env / action |
|------|----------------|
| Canonical URL (marketing phase) | `APP_URL=https://getshoprally.com` |
| Canonical URL (CRM phase) | `APP_URL=https://app.getshoprally.com` (same Vercel project) |
| Clerk | `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (Orgs) — unlocks prod CRM gate |
| Email | `RESEND_API_KEY` (+ shop From verified) — see `docs/SHOP-EMAIL.md` |
| Release defaults | Prod: Phase 1+ modules dark (`VERCEL_ENV=production`); optional `RELEASE_FLAGS_OPEN=false` |
| Kill switches | `RELEASE_KILL_*`, `SMS_ENABLED=false`, `MOTOR_ENABLED=false` until those modules launch |
| DB | Neon PITR on; CI `prisma migrate deploy` only (never `db push` in prod) |
| Support | `/support` + `PLATFORM_CONTACT_EMAIL` |

### Stripe Ignition / AI Plus (fast follow)

Create Products + Prices in Stripe, then set:

```
STRIPE_PRICE_IGNITION_MONTHLY=price_...
STRIPE_PRICE_IGNITION_ANNUAL=price_...
STRIPE_PRICE_AI_PLUS_MONTHLY=price_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Webhook endpoint: `{APP_URL}/api/webhooks/stripe`  
Events: at least `checkout.session.completed` (metadata `checkoutKind=shop_plan`).

Shop UI: **Settings → Subscription / Billing** → Subscribe monthly/annual · Add AI Plus · Manage billing (Customer Portal).

---

## C. Master CRM launch ops

1. Platform → Shops → **Add shop** (or edit) → plan **Core / STARTER**, billing Active or Trial  
2. Complete legal acceptances (compliance gate)  
3. **Enter shop CRM** → run bay-loop smoke  
4. Confirm **Release flags** stay off for Growth / SMS / MOTOR / PartsTech / AI in production  
5. Do **not** sell Pro/Elite on `/pricing` while `PHASE_ONE_LAUNCH=true`

Seed QA tenant: **Macuto Auto Repair** (`shop_macuto`).

---

## D. Explicitly deferred

Licensed MOTOR · SMS · Stripe Connect · Growth Engine · ShopSite / SEO · Elite AI receptionist

---

## Done when (engineering readiness)

- [x] Core nav/route gates + server fail-closed audit documented  
- [x] `/pricing` sells Ignition only (`PHASE_ONE_LAUNCH`); Pro/Elite stay dark publicly  
- [x] Platform provision + Macuto enter paths documented (`PLATFORM-FOUNDING-SHOPS.md`)  
- [x] Ignition + AI Plus Checkout code path ready (needs Stripe Price IDs in env)  
- [x] P0 ops checklist expanded in `PHASED-ROLLOUT.md`  

## Still operator / prod (before inviting paying shops)

- [ ] Macuto + one new Core shop bay loop on Preview/prod  
- [ ] Clerk Orgs + `APP_URL` + Resend on Vercel prod  
- [ ] Release flags / kill switches set dark in production  
- [ ] Stripe Price IDs created and wired (if selling self-serve Ignition)  
