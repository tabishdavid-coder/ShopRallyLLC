# Website & SEO Service — RepairPilot

**Status:** Phase 1 (v1) — **advertised managed service** + builder infrastructure for paying customers  
**Last updated:** 2026-06-28

---

## AI SEO content (Premier — Phase 2E)

When a shop is on **Premier** (`aiSeoContent` plan gate), has **SEO Autopilot** enabled, and **`useAiContent`** is on in autopilot settings:

1. Bi-weekly content jobs (`runShopSeoContentGeneration`) build a **template baseline** from canned jobs + local keywords (same as before).
2. If `ANTHROPIC_API_KEY` is set, the shared AI client calls `suggestSeoContent()` to refine meta title, meta description, service blurbs, and keywords.
3. User-edited meta tags in `ShopWebsiteConfig` are **never overwritten** — AI only fills empty meta fields.
4. On LLM failure, the job completes with template content and logs `aiFallbackReason` in the run summary.
5. Non-Premier plans never invoke the LLM (template-only autopilot).

**Shop toggle:** SEO Autopilot → “AI content refinement” (maps to `ShopSeoSettings.useAiContent`).

**Env:** `SEO_CONTENT_AI_MODEL` (falls back to `AI_DEFAULT_MODEL` / `SUPPORT_AI_MODEL`).

**Test parse logic:** `npx tsx scripts/test-seo-content-parse.ts`

---

## Product concept (updated 2026-07-05)

RepairPilot **Website & SEO** is a **conversion hub**, not just a brochure:

1. **Managed service (v1 default)** — platform builds and launches shop-branded microsite
2. **ShopSite microsite** — `/sites/[slug]` with **Book** + **Request service** CTAs wired to CRM
3. **SEO optimization toolkit** — checklist, meta, JSON-LD, analytics
4. **Forms Hub integration** — work request submissions → Repair Order (ESTIMATE) on job board

**Rethought spec:** [`WEBSITE-CREATION-TASK.md`](./WEBSITE-CREATION-TASK.md)  
**Forms backend:** [`FORMS-HUB-TASK.md`](./FORMS-HUB-TASK.md)

### Industry context

| Platform | Approach | Gap ShopRally fills |
|----------|----------|------------------|
| Tekmetric | Marketing add-on booking embed | No native website; no work request → RO |
| Shopmonkey | Work Request Form → Estimate | No native ShopSite / SEO pipeline |
| Kukui | Website + CRM overlay on Tekmetric | Two systems, two bills |
| **ShopRally** | ShopSite + booking + work request → RO in one tenant | Unified funnel |

### Conversion paths (target)

| Visitor action | Route | CRM result |
|----------------|-------|------------|
| Book appointment | `/book/{slug}` | Appointment |
| Request service / quote | `/forms/{slug}/work-request` or embedded on contact | RO (ESTIMATE) |
| Call / visit | NAP on contact page | — |

---

## Product concept (legacy v1 notes)

---

## Architecture

### Data model

```prisma
model ShopWebsiteConfig {
  shopId                String   @unique
  published             Boolean  // false until RepairPilot team launches customer site
  heroHeadline          String?
  heroSubtext           String?
  aboutText             String?
  servicesJson          Json?    // [{ title, description }]
  metaTitle             String?
  metaDescription       String?
  keywords              String[]
  googleAnalyticsId     String?
  customDomain          String?  // future
  schemaEnabled         Boolean
  seoChecklistCompleted Json
  conversionSettings    Json?    // { primaryCta, workRequestEnabled, ... } — see WEBSITE-CREATION-TASK.md
}
```

Slug resolution: `Shop.bookingSlug` → fallback `Shop.code` (lowercase).

### Routes

| Route | Purpose |
|-------|---------|
| `/sites/[slug]` | Public home — only when `published: true` (404 otherwise) |
| `/sites/[slug]/services` | Services page |
| `/sites/[slug]/contact` | Contact + map link + book CTA |
| `/sites/[slug]/sitemap.xml` | XML sitemap (home, services, contact) |
| `/marketing/website` | CRM service marketing page + quote request form |

Public URLs use `publicUrl()` / `getAppUrl()` — never hardcoded localhost in server code.

### SEO features (post-purchase)

- Dynamic `<title>`, meta description, keywords
- Open Graph + Twitter card tags
- LocalBusiness (`AutoRepair`) JSON-LD when `schemaEnabled`
- Sitemap generation
- 12-item local SEO checklist with auto-detected completion
- SEO score % = checklist completion
- Optional GA4 measurement ID injection

### CRM marketing page (v1)

All shops see `/marketing/website` with:

- Hero: "Professional Website & Local SEO — done for you"
- What's included bullet list
- Pricing: "Additional cost — contact for quote"
- Primary CTA: **Get started** → `SupportTicket` with category `WEBSITE_BUILD`
- Collapsible **"Already subscribed? Manage your site"** — reveals editor only when shop has feature + published site

### Managed service flow

1. Shop owner opens **Marketing → Website & SEO**
2. Fills quote request form (name, email, goals, notes)
3. Creates `SupportTicket` with `category: WEBSITE_BUILD`, subject `[Website Build] {shop name}`
4. Platform team triages, quotes, and on purchase: builds site, sets `published: true`, enables subscriber editor

Quote requests are **not** gated by subscription tier — any shop can inquire.

---

## Code map

| Layer | Path |
|-------|------|
| Types & checklist | `src/lib/website-seo.ts` |
| Server queries | `src/server/website-seo.ts` |
| Server actions | `src/server/actions/website-seo.ts` |
| Server services | `src/server/services/seo-content-generation.ts` (template + AI) |
| AI parse + service | `src/lib/seo-content-ai.ts`, `src/server/services/ai/seo-content.ts` |
| Public UI | `src/components/website-seo/shop-site.tsx` |
| CRM service page | `src/components/website-seo/website-seo-service.tsx` |
| CRM subscriber editor | `src/components/website-seo/website-seo-editor.tsx` |
| Public pages | `src/app/sites/[slug]/` |
| CRM page | `src/app/(app)/marketing/website/page.tsx` |

---

## Demo shop (In & Out AutoHaus)

After seed:

- **Slug:** `in-and-out-autohaus`
- **Public URL:** `{APP_URL}/sites/in-and-out-autohaus` → **404** (`published: false`)
- **Admin:** Marketing → Website & SEO shows service marketing page (not a live demo site)
- Config row exists (unpublished) to preserve schema — no public marketing site for this shop

---

## Testing

```bash
npm run db:push
npm run db:seed   # optional — creates unpublished config for demo shop
npx tsc --noEmit
npm run dev
```

Verify:

1. `GET /sites/in-and-out-autohaus` → 404
2. `GET /marketing/website` → 200, service marketing page + quote form
3. Submit quote request → `SupportTicket` with `WEBSITE_BUILD` category
4. Marketing dashboard card links to `/marketing/website`
5. Settings → Billing & Plan mentions Website & SEO add-on

---

## Future (not in v1)

- Custom domain + DNS verification (DNS verify exists; full product flow TBD)
- Blog / landing page builder
- Automated GBP post sync
- A/B hero variants
- Stripe upsell SKU for managed website packages
- Self-serve builder tier (if product direction changes)

### Live SEO analytics dashboard (product requirement — 2026-07-02)

**Status:** Phase 3 shipped — tabbed SEO Autopilot IA with GSC + GA4 analytics, reports archive, setup wizard.

**Routes:**

| Tab | Path |
|-----|------|
| Overview | `/marketing/seo-automation` |
| Analytics | `/marketing/seo-automation/analytics` |
| Activity | `/marketing/seo-automation/activity` |
| Health | `/marketing/seo-automation/health` |
| Sites | `/marketing/seo-automation/sites` |
| Reports | `/marketing/seo-automation/reports` |
| Plan & services | `/marketing/seo-automation/plan` |

**Search analytics:** GSC daily clicks/impressions, period comparison, top queries & pages, 24h cache on `ShopSeoSettings.gscMetricsCache`.

**Site traffic (GA4):** Sessions + organic search sessions when shop has GA4 measurement ID and Google connected (same OAuth as GSC with `analytics.readonly` scope). Cached on `ShopSeoSettings.ga4MetricsCache`. Fallback: link to GA4 web UI.

**Reports:** Monthly email snapshots archived in `SeoReportSnapshot` — visible on Reports tab.

**Business impact:** Online bookings, web customers, web-sourced ROs (28d vs prior 28d) from CRM.

**Ops:** Nightly Inngest job refreshes GSC cache (`seo-gsc-cache-nightly`); manual trigger at `GET /api/cron/seo-gsc-cache` with `CRON_SECRET`.

**Verify:** `npx tsx scripts/smoke-seo-autopilot.ts`

**Stripe add-on checkout:** Plan tab **Buy now** → platform Stripe Checkout when env vars are set. Fulfillment grants `websiteSeo` on success redirect **and** via Stripe webhook (`checkout.session.completed` with `checkoutKind: seo_addon`).

| Env var | Product |
|---------|---------|
| `STRIPE_PRICE_SHOPSITE_LAUNCH` | ShopSite launch ($499 one-time) |
| `STRIPE_PRICE_SEO_LAUNCH` | SEO launch ($399 one-time) |
| `STRIPE_PRICE_WEB_SEO_BUNDLE` | Website + SEO bundle ($749) |
| `STRIPE_PRICE_SEO_AUTOPILOT` | SEO Autopilot ($49/mo) |
