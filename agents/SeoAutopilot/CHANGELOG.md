# SEO Autopilot branch changelog

Branch: `cursor/seo-autopilot-full-0d70`  
Commits ahead of `main`: 12 (as of 2026-07-03)

---

## Milestone 1 — Tabbed hub

- 7-tab IA: Overview, Analytics, Activity, Health, Sites, Reports, Plan
- Shared layout + `SeoAutopilotProvider` page loader
- GSC OAuth, property linking, live 28d analytics + cache

## Milestone 2 — Analytics depth

- CRM business impact (bookings, web customers, web ROs)
- Top queries/pages, period comparison
- CSV export

## Milestone 3–5 — Productization

- GA4 Data API (extended Google OAuth scope)
- Reports archive (`SeoReportSnapshot`)
- Setup wizard on Overview
- Health recommendations (dismiss + snooze 7d)
- Reconnect Google banner
- Custom domain DNS UX
- Nightly GSC + GA4 cache (Inngest)

## Milestone 6 — Billing

- Stripe Checkout on Plan tab (`seo-stripe-checkout.ts`)
- Webhook fulfillment (`checkoutKind: seo_addon`)
- `Shop.planFeatures.websiteSeo` grant on purchase

---

## Schema migrations (apply in order)

| Migration | Purpose |
|-----------|---------|
| `20260703220000_seo_gsc_metrics_cache` | GSC cache on `ShopSeoSettings` |
| `20260703230000_seo_report_snapshots` | Monthly report archive |
| `20260703240000_seo_ga4_metrics_cache` | GA4 cache + property ID |
| `20260703250000_seo_dismissed_recommendations` | Dismissed audit items |
| `20260703260000_seo_checkout_snooze` | Snooze, Stripe fulfillments, subscription ID |

---

## Key paths

```
src/app/(app)/marketing/seo-automation/
src/components/marketing/seo-automation/
src/server/seo-autopilot-page.ts
src/server/services/seo-stripe-checkout.ts
src/lib/seo-autopilot-nav.ts
scripts/smoke-seo-autopilot.ts
```

---

## Intentionally not changed

- CRM shell / sidebar / job board / RO workspace
- `globals.css` theme tokens
- Production deploy / Vercel
