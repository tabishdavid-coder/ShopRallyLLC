# ShopRally marketing site audit — 2026-07-21

**Branch:** `audit/site-20260721`  
**Orchestrator:** Agent 0 (setup only — Agents 1–5 not started)  
**Dev URL:** http://localhost:3031 (`npm run dev`)

---

## What changed today

Regression surface from recent commits (≈ last 2 days + recent marketing history). Working tree also has **uncommitted** marketing edits (Hero premium cleanup, compare hub, ARI page, features catalog, etc.) — treat dirty marketing files as in-flight surface for Agents 1–5.

### Git log (since 2026-07-19)

```
eb0cfe3 Ship CRM Google Reviews placement, Catalog/Admin nav IA, and inventory demo seed.
7f41171 Ship Macuto CRM polish: appointments calendar, dashboard KPIs/Shop Activity, and share dialogs.
b88c295 Add Garage360, Torque360, Shop-Ware, and RepairShopr compare pages.
c2e1227 Surface Compare pages in nav and money-page internal links.
d0c5a92 Fix AI Plus showcase bundleHint call for production typecheck.
c7dec08 Add marketing showcase modules required by features and pricing pages.
86bd1c0 Trigger production deploy after Vercel Pro upgrade.
ae1842f Ship SEO batch: compare pages, legal meta, FAQ, OG-ready sitemap.
c761219 Allow /opengraph-image through the marketing production gate.
7b222db Use the 1200x630 opengraph-image for marketing and root share previews.
8ca3ed3 Strengthen getShopRally.com content SEO on features, pricing, and FAQs.
185d004 Allow CANCELED in appointment status updates so production typecheck passes.
639c486 Add GA4 tracking for getShopRally.com marketing pages.
662027a Ship getShopRally.com sitemap/robots and unblock GSC fetch.
ed7856b Ship Ignition pricing card restyle with orange AI Plus icon.
```

### Known recent marketing changes (for audit focus)

| Change | Notes for later agents |
|--------|------------------------|
| Hero premium cleanup | No `$99.99` price table in Hero; no Skyline/Albany locale copy. Hero = orbit/circuit RO cycle visual + Ignition launch eyebrow. |
| Compare hub + ARI | `/compare` hub + `/compare/ari-alternative` (and other competitor alternatives). |
| Features catalog | Features page / mega-menu catalog work. |
| Google Reviews on Ignition | CRM Reviews placement shipped (`eb0cfe3`); pricing/Ignition surfacing to verify on marketing pages. |
| Homepage simplified spine | Shorter home: Hero → positioning → how-it-works → pricing wedge → FAQ → reserve. |
| Demo CTA mismatch | Watch-for: CTAs that imply live video/watch vs static `/demo` walkthrough page. |

---

## Route inventory

### `src/app/(marketing)/` (primary marketing)

| Route | File |
|-------|------|
| `/` | `src/app/(marketing)/page.tsx` |
| `/pricing` | `src/app/(marketing)/pricing/page.tsx` |
| `/features` | `src/app/(marketing)/features/page.tsx` |
| `/demo` | `src/app/(marketing)/demo/page.tsx` |
| `/launch` | `src/app/(marketing)/launch/page.tsx` |
| `/login` | `src/app/(marketing)/login/page.tsx` |
| `/signup` | `src/app/(marketing)/signup/page.tsx` |
| `/compare` | `src/app/(marketing)/compare/page.tsx` |
| `/compare/tekmetric-alternative` | `src/app/(marketing)/compare/tekmetric-alternative/page.tsx` |
| `/compare/autoleap-alternative` | `src/app/(marketing)/compare/autoleap-alternative/page.tsx` |
| `/compare/shopmonkey-alternative` | `src/app/(marketing)/compare/shopmonkey-alternative/page.tsx` |
| `/compare/ari-alternative` | `src/app/(marketing)/compare/ari-alternative/page.tsx` |
| `/compare/garage360-alternative` | `src/app/(marketing)/compare/garage360-alternative/page.tsx` |
| `/compare/torque360-alternative` | `src/app/(marketing)/compare/torque360-alternative/page.tsx` |
| `/compare/shop-ware-alternative` | `src/app/(marketing)/compare/shop-ware-alternative/page.tsx` |
| `/compare/repairshopr-alternative` | `src/app/(marketing)/compare/repairshopr-alternative/page.tsx` |

Layout: `src/app/(marketing)/layout.tsx`

### Related public marketing / legal / SEO surfaces

| Route / asset | File |
|---------------|------|
| `/legal/terms` | `src/app/legal/terms/page.tsx` |
| `/legal/privacy` | `src/app/legal/privacy/page.tsx` |
| `/legal/aup` | `src/app/legal/aup/page.tsx` |
| `/legal/dpa` | `src/app/legal/dpa/page.tsx` |
| `/legal/sms-addendum` | `src/app/legal/sms-addendum/page.tsx` |
| `/legal/payment-addendum` | `src/app/legal/payment-addendum/page.tsx` |
| `/legal/subprocessors` | `src/app/legal/subprocessors/page.tsx` |
| Sitemap | `src/app/sitemap.ts` → `/sitemap.xml` |
| Robots | `/robots.txt` (from build route list) |
| Open Graph image | `src/app/opengraph-image.tsx` → `/opengraph-image` |

---

## Homepage section inventory

Source: `src/components/marketing-site/home-page.tsx` + `Hero` (`src/components/marketing-site/Hero.tsx`).

**Post–premium-cleanup spine (do not list removed Hero price stack):**

| # | Section | id / component | Notes |
|---|---------|----------------|-------|
| 1 | Hero | `Hero` (`Hero.tsx` / `Hero.module.css`) | Premium orbit/circuit RO cycle. Eyebrow: Ignition · launching Q4 2026. **No** `$99.99` table; **no** Skyline/Albany. |
| 2 | Market positioning | `MarketPositioningSection` | Tier cards from `MARKET_POSITIONING`. |
| 3 | How it works / product | `#product` | `HOW_SHOPRALLY_WORKS` three-step grid + features link. |
| 4 | Pricing wedge | `#pricing-wedge` | Ignition name + `shoprallyStarterPricePairLabel()` + CTAs to `/pricing` and `/features`. |
| 5 | FAQ | `#faq` | `HOME_FAQ` + related links. |
| 6 | Reserve / CTA | `#reserve` | Pre-launch waitlist (`FoundingWaitlistForm`) or post-launch trial CTAs; `/launch` link when pre-launch. |

---

## Build baseline

| Field | Value |
|-------|-------|
| Command | `npm run build` |
| Result | **PASS** |
| Exit code | `0` |
| Duration | ~71s (compile ~23s, TypeScript ~36s, static pages 154/154) |
| Log | `audit/build-baseline.log` |

### Warnings (non-blocking — do not deep-fix in A0)

1. `npm warn Unknown env config "devdir"` — npmrc noise.
2. Next.js 16: `"middleware" file convention is deprecated` → use `proxy`.
3. Turbopack NFT warning: unexpected file traced via `next.config.ts` → `src/generated/prisma` → `custom-domain-routing` → `/api/sites/resolve-host`.
4. Edge runtime disables static generation for some page(s).

No TypeScript or page-generation failures. Marketing routes including `/compare/ari-alternative` appear in the build route list.

---

## Agent 1 — Copy / claims / CTAs

_(empty — Agent 1)_

---

## Agent 2 — Visual / UX / design bar

_(empty — Agent 2)_

---

## Agent 3 — SEO / metadata / links

_(empty — Agent 3)_

---

## Agent 4 — A11y / performance / technical

_(empty — Agent 4)_

---

## Agent 5 — Cross-page consistency

_(empty — Agent 5)_
