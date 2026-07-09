# SEO Autopilot — merge guide

Branch: **`cursor/seo-autopilot-full-0d70`**  
Status: **feature complete** (2026-07-03)

Use this when merging into `main` while ShopRallyCRM `:3004` work continues in parallel.

---

## What ships

- 7-tab hub at `/marketing/seo-automation`
- GSC + GA4 analytics, CRM outcomes, CSV export
- Reports archive, setup wizard, Health recommendations (dismiss/snooze)
- Nightly GSC+GA4 cache (Inngest + cron)
- Stripe Checkout on Plan tab + webhook fulfillment
- Custom domain DNS UX on Sites tab

---

## Before you push or merge

Your repo may have **uncommitted ShopRallyCRM `:3004` work** in the same folder (Clerk, RO workspace, etc.). That is separate from SEO commits on this branch.

**Stash or commit ShopRallyCRM work first** so it does not get mixed into the SEO merge:

```bash
git stash push -m "shoprally-crm-wip" --include-untracked
# or commit on a different branch
```

Then push SEO only:

```bash
git push -u origin cursor/seo-autopilot-full-0d70
```

---

## Pre-merge (owner machine)

```bash
git fetch origin
git checkout cursor/seo-autopilot-full-0d70
git pull origin cursor/seo-autopilot-full-0d70

# Stop :3004 dev server if OneDrive locks Prisma engine
npx prisma migrate deploy
npx prisma generate
npx tsx scripts/smoke-seo-autopilot.ts
```

### Migrations applied (in order)

1. `20260703220000_seo_gsc_metrics_cache`
2. `20260703230000_seo_report_snapshots`
3. `20260703240000_seo_ga4_metrics_cache`
4. `20260703250000_seo_dismissed_recommendations`
5. `20260703260000_seo_checkout_snooze`

---

## Manual QA (:3004)

Open `http://localhost:3004/marketing/seo-automation` and verify:

| Tab | Check |
|-----|-------|
| Overview | Launch checklist, KPI tiles |
| Analytics | GSC charts; GA4 section (or reconnect banner) |
| Activity | Recent runs list |
| Health | Checklist + recommendations |
| Sites | GSC connect, custom domain, properties table |
| Reports | Empty state or archived reports |
| Plan | Service cards; Buy now if Stripe Price IDs set |

**GA4 charts empty?** Reconnect Google on Sites tab (Analytics scope added after initial GSC connect).

---

## Stripe (optional)

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_SEO_LAUNCH=price_...
STRIPE_PRICE_SEO_AUTOPILOT=price_...
```

Test: Plan tab → Buy now → Stripe test card → return URL grants SEO Autopilot.

Webhook path: `POST /api/webhooks/stripe` handles `checkoutKind: seo_addon`.

---

## Merge

```bash
git checkout main
git merge cursor/seo-autopilot-full-0d70
git push origin main
```

Resolve conflicts carefully in `prisma/schema.prisma` if ShopRallyCRM added migrations on `main` in parallel.

---

## Out of scope (post-merge)

- Production custom domain SSL termination
- ShopRallyCRM shell / sidebar changes (this branch avoided them)
