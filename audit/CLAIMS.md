# Marketing claims ledger — 2026-07-21

Track every public product / pricing / competitive claim. Agents fill rows; verdicts are empty until verified.

**Verdict values (when filled):** `Verified` · `Needs source` · `Overclaim` · `Stale` · `OK with nuance` · `Not present` · `UNVERIFIED — needs human`

**Agent 2 research date:** 2026-07-21  
**Sources used:** `docs/COMPARE-ACCURACY.md`, `docs/GROWTH-POSITIONING.md`, `src/lib/plans.ts`, `src/lib/marketing-compare.ts`, `src/lib/marketing-launch.ts`, `src/lib/marketing-seo.ts`; live fetch [tekmetric.com/pricing](https://www.tekmetric.com/pricing), [shopmonkey.io/pricing](https://www.shopmonkey.io/pricing).

## Verdict counts

| Verdict | Count |
|---------|------:|
| Verified | 9 |
| OK with nuance | 10 |
| Overclaim → Fixed | 2 (migration; testimonials) |
| Stale → Fixed | 2 (benchmark; docs 50-seats → static-only) |
| Needs source | 0 |
| Not present | 1 (blanket $199 claim) |
| UNVERIFIED — needs human | 0 (founder + seat-cap resolved by owner) |
| **Total rows** | **26** |

## Claims

| claim | location | source | verdict |
|-------|----------|--------|---------|
| Ignition list price **$99.99/mo** · **$94.99/mo** annual | `plans.ts` STARTER cents; `/pricing`, home wedge, JSON-LD AggregateOffer | `PLANS.STARTER.monthlyCents=9999`, `annualMonthlyCents=9499`; `buildMarketingHomeJsonLd` low/high | **Verified** |
| Tekmetric Start **$199/mo** ($179 annual) | Compare Tekmetric page + `COMPARE-ACCURACY.md` | Live tekmetric.com/pricing 2026-07-21 | **Verified** |
| Tekmetric Grow ~$349/$309 · Scale ~$439/$409 · Marketing +$345/shop | `marketing-compare.ts` Tekmetric pricingNote | Live tekmetric.com/pricing | **Verified** |
| Tekmetric two-way texting = Scale (not Marketing add-on) | Compare Tekmetric rows | Live pricing matrix “Unlimited 2-Way Texting” on Scale | **Verified** |
| Shopmonkey Basic **$239/mo** ($215 annual) · Clever $399/$359 · Genius $499/$449 | `COMPARE-ACCURACY.md`; compare Shopmonkey | Live shopmonkey.io/pricing 2026-07-21 | **Verified** |
| Shopmonkey CRM Essentials ~$349/$314 | Compare Shopmonkey + accuracy matrix | Live shopmonkey.io/pricing add-on block | **Verified** |
| AutoLeap Essentials ~$179/$199 · Pro ~$309/$349 · Elite ~$409/$449 | `marketing-compare.ts` | `COMPARE-ACCURACY.md` (official pricing) | **OK with nuance** — re-verify before sales use; not re-fetched this pass |
| “Comparable shop platforms start at $199/mo” (blanket) | **Not found** in current marketing UI copy | N/A — Tekmetric Start is $199; Shopmonkey starts $239; Garage360 ~$79; ARI ~$40; Torque360 Starter ~$90 | **Not present** as public string. If reintroduced as blanket industry claim → **Overclaim**. Safe form: “Tekmetric Start lists at $199/mo” |
| `COMPETITOR_BENCHMARK` Shopmonkey / Tekmetric / AutoLeap entry CRM | `src/lib/plans.ts` | Live: SM Basic $239; Tek Start $199; AL Essentials ~$199 | **Stale** → Fixed (`c514db1`: 239 / 199 / 199) |
| PartsTech catalog & punchout on Ignition | Hero, features, pricing FAQ, compare | `plans.ts` bullets + GROWTH “UI ready; live when partner env” | **OK with nuance** — founding/launch packaging claim; do not imply live punchout on production today while `preLaunch` |
| CARFAX / Carfax service history on Ignition | Hero, features, compare, plans | `plans.ts` feature + product integrations path | **OK with nuance** — included on Ignition packaging; partner credentials / depth UNVERIFIED for prod go-live |
| Two-way SMS on Ignition | Hero, plans, compare | Product Twilio path + `SMS_ENABLED`; Tekmetric Scale contrast Verified | **OK with nuance** — ships with Ignition packaging; Twilio env required in prod |
| Google Reviews inbox (sync & reply) on Ignition; review-request campaigns Pro+ | Features, pricing FAQ, GROWTH | `googleReviews` on Core; campaigns Pro+ per GROWTH / plans FAQ | **Verified** (product packaging) |
| Free migration — “customers, vehicles, and full history come with you” | Was `Hero.tsx` / `home-hero.tsx` | Softened to priority cutover help (matches HOME_FAQ) | **Overclaim** → Fixed |
| “50 founding seats / spots” scarcity | `MARKETING_LAUNCH.foundingSpotsTotal=50`; GROWTH-POSITIONING | Owner: soft static “50 founding seats” OK once; **no** countdown / remaining / “X left”. Docs + helpers aligned. | **Fixed** (static-only policy) |
| Anonymous testimonials with metrics (3×, +28%) | Committed `home-page.tsx` testimonials | Softened to qualitative themes (`6e99481`); simplified WIP spine has no block | **Overclaim** → Fixed |
| Q4 2026 launch · reserve seat · not available yet | Hero, launch, marketing-launch `preLaunch: true` | `MARKETING_LAUNCH` + GROWTH | **Verified** (product/GTM config) |
| Founder narrative | `FOUNDER_SHOP_PROOF` / Hero | Owner: “built by a shop owner / built by an owner” only — no Skyline/Albany/named shop bio | **Fixed** (scrubbed) |
| Garage360 Basic ~$79 · Clever ~$119 · Genius ~$199 | Compare Garage360 + accuracy matrix | `COMPARE-ACCURACY.md` | **OK with nuance** — cite verify on their site |
| Torque360 Starter PartsTech/Carfax/DVI + one-way SMS · 5 co-users; Turbo two-way | Compare Torque360 | `COMPARE-ACCURACY.md` | **OK with nuance** |
| ARI Pro ~$39.99 · has PartsTech & Carfax · not GBP inbox clearly | Compare ARI | `COMPARE-ACCURACY.md` + ari.app | **OK with nuance** |
| Work Request → RO = ShopRally roadmap (not day-one) | Compare Shopmonkey honesty | GROWTH Pillar B | **Verified** (product honesty) |
| Elite includes dedicated onboarding / migration | `plans.ts` Elite / add-on migration $399 | GROWTH Elite row | **OK with nuance** — packaging intent; process UNVERIFIED until ops runbook |
| JSON-LD AggregateOffer prices = Ignition $94.99–$99.99 | `marketing-seo.ts` `buildMarketingHomeJsonLd` | Uses `shoprallyStarterMonthly(true/false)` | **Verified** |
| JSON-LD SoftwareApplication description mentions “Growth Engine marketing” | Same | Growth Engine campaigns are Pro+ per GROWTH | **OK with nuance** — soft; prefer Ignition-accurate wording |
| Unique per-route title/meta; no `ShopRally — … — ShopRally` | Marketing routes via `marketingPageMetadata` + absolute home | Home uses `absoluteTitle`; compare/features/pricing OK | Marketing primary OK. Legal aup/dpa/sms/payment/subprocessors + legal layout hardcode `— ShopRally` under root template → **double brand** (see A2 findings) |
| Sitemap + robots for marketing | `sitemap.ts`, `robots.ts`, `MARKETING_SITEMAP_ROUTES` | Includes compare/* (incl. ARI), pricing, features, demo, launch; disallows CRM paths + `/login` | **Verified** |
| One `<h1>` per marketing page | Hero, pricing, features, compare, demo, launch | Spot-check components | **OK with nuance** — primary surfaces use single h1; Lighthouse not run |
| Lighthouse SEO score | home `/` | Agent 4 `audit/_a4-lighthouse.json` SEO **100** | **Verified** (A4) |
