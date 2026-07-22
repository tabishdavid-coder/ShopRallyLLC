# Site audit findings — 2026-07-21

Findings-first trail for Agents 1–5. **Do not redesign here** — log issues only.

## ID scheme

| Prefix | Owner agent | Focus |
|--------|-------------|--------|
| `A1-NNN` | Agent 1 | Copy, claims, CTA consistency, pricing language |
| `A2-NNN` | Agent 2 | Claims research, competitive accuracy, SEO visibility |
| `A3-NNN` | Agent 3 | UX psychology / Demo CTA honesty (see AUDIT-REPORT) |
| `A4-NNN` | Agent 4 | Accessibility, performance, technical |
| `A5-NNN` | Agent 5 | Flow & narrative (homepage argument, CTA funnel, tone) |

Number sequentially within each prefix (`A1-001`, `A1-002`, …). Severity: `P0` blocker · `P1` high · `P2` medium · `P3` low / polish. Status starts as `Open`; set `Fixed` / `Won't fix` / `Needs product` when resolved.

## Findings

| ID | Severity | Section | File:line | Issue | Status |
|----|----------|---------|-----------|-------|--------|
| A2-001 | P1 | Home hero / switch strip | `src/components/marketing-site/Hero.tsx` (~388–389); also `home-hero.tsx` (~94–95) | Overclaims “Founding shops get free migration — your customers, vehicles, and full history come with you.” Contradicts HOME_FAQ / PRICING_FAQ (priority hands-on help; no invented one-click imports; white-glove later / Elite). Cross-ref **A5-002**. | Open |
| A2-002 | P1 | Legal metadata | `src/app/legal/layout.tsx`; `aup`, `dpa`, `sms-addendum`, `payment-addendum`, `subprocessors` pages | Titles hardcode `— ShopRally` while root template is `%s — ShopRally`, producing `… — ShopRally — ShopRally`. Privacy/terms already use `marketingPageMetadata` correctly. | Open |
| A2-003 | P1 | Competitor price helper | `src/lib/plans.ts` `COMPETITOR_BENCHMARK` (~463–464) | Shopmonkey `crm: 179` is wrong vs live Basic $239/$215. Tekmetric `crm: 179` is annual-only without label. Not rendered on `/pricing` today but is the marketing helper for stack math — stale source for any “~$199 comparable” reuse. | Open |
| A2-004 | P2 | JSON-LD | `src/lib/marketing-seo.ts` SoftwareApplication description (~155) | Description says “Growth Engine marketing” while Ignition-phase public packaging keeps Growth Engine campaigns on Pro+. Prices in AggregateOffer are correct ($94.99–$99.99). | Open |
| A2-005 | P2 | Docs vs UI scarcity | `docs/GROWTH-POSITIONING.md` (~29); `MARKETING_LAUNCH.foundingSpotsTotal` | Docs claim public site says “50 founding seats”; UI retired seat-count urgency (`getFoundingSpotMessaging` / comments). Cap remains internal-only. Do not reintroduce fake scarcity meters. | Open |
| A2-006 | P3 | Testimonials | Marketing site | Anonymous 3× / +28% testimonials not present on current marketing surfaces — no action. Flag if reintroduced without named source. | Won't fix |
| A2-007 | P3 | Lighthouse SEO | — | Lighthouse SEO audit skipped this pass (no CI Chrome run). Manual meta/sitemap/JSON-LD review completed instead. | Won't fix |
| A5-001 | P1 | Hero board caption | `Hero.tsx:488-499` | “Live” pill + “Try the live board” → `/demo` implies interactive live CRM. Destination is static product moments; also fights pre-launch honesty. Residual play icon on secondary CTA still cues video after A3-001 Watch→See. | Open |
| A5-002 | P1 | Hero switch strip vs FAQ | `Hero.tsx:388-389` vs `marketing-launch.ts` HOME_FAQ | Same overclaim as **A2-001**: “free migration” + “full history come with you” vs FAQ hands-on / no one-click / white-glove later. Narrative break in the homepage argument. | Open |
| A5-003 | P2 | CTA funnel | `home-page.tsx` `#pricing-wedge` → `#faq` → `#reserve` | After Hero, next Reserve affordance is `#reserve` at bottom. Mid-spine only offers `/pricing`, `/features`, `/demo`, `/compare`. Pricing wedge is the natural mid-scroll Reserve insert (no redesign this pass). | Open |
| A5-004 | P2 | Repetition | Hero sub + `HOW_SHOPRALLY_WORKS` + HOME_FAQ “What is ShopRally?” | Capability laundry (PartsTech, inspections, SMS, Reviews, job board…) restated ~3×. Consolidate: Hero = outcome; How-it-works = day loop; FAQ = short definition + link. | Open |
| A5-005 | P3 | Website & SEO / roadmap count | Home spine | ShopRally “Website & SEO separate” on home = **0**. Competitor framing mentions website/SEO stack pain **3×** in `MARKET_POSITIONING` (intentional). Roadmap disclaimer on home = **1** (FAQ migration). Below consolidation threshold. | Open |
| A5-006 | P2 | Migration FAQ gap | `HOME_FAQ` switch Q | FAQ honesty is good but does not spell cutover steps, data scope, or timeline. **Recommendation only** — do not expand FAQ here; own a migration note on `/compare` or `/launch` when package is real. | Open |
| A5-007 | P3 | Testimonials | Home spine | Anonymous / locale testimonials off simplified home (`home-page.tsx`). Aligns with A2-006. | Won't fix |
| A5-008 | P2 | Tone | Home spine | Mostly honest-operator (Q4 2026, no card, reserve ≠ access). Hype pockets = A5-001/002 (and residual play icon). | Open |
| A5-009 | P3 | Section sequence | Positioning → `#product` | Argument mostly holds. Soft gap: competitive price frames don’t bridge “so what’s a day look like?” into How-it-works (subhead carries it). No redesign. | Open |
