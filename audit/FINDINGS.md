# Site audit findings — 2026-07-21

Findings-first trail for Agents 1–5. **Do not redesign here** — log issues only.

## ID scheme

| Prefix | Owner agent | Focus |
|--------|-------------|--------|
| `A1-NNN` | Agent 1 | Copy, claims, CTA consistency, pricing language |
| `A2-NNN` | Agent 2 | Visual / UX / design-bar / wow-bar |
| `A3-NNN` | Agent 3 | SEO, metadata, sitemap, internal links |
| `A4-NNN` | Agent 4 | Accessibility, performance, technical |
| `A5-NNN` | Agent 5 | Flow & narrative (homepage argument, CTA funnel, tone) |

Number sequentially within each prefix (`A1-001`, `A1-002`, …). Severity: `P0` blocker · `P1` high · `P2` medium · `P3` low / polish. Status starts as `Open`; set `Fixed` / `Won't fix` / `Needs product` when resolved.

## Findings

| ID | Severity | Section | File:line | Issue | Status |
|----|----------|---------|-----------|-------|--------|
| A5-001 | P1 | Hero → /demo | `Hero.tsx:371-376`; `marketing-launch.ts:45-46` | Secondary CTA “Watch the/a 3-min walkthrough” + play icon implies a video. `/demo` is ungated static product moments (scan ~3 min), not a video player. Narrative break: promise ≠ destination. | Open |
| A5-002 | P1 | Hero board caption | `Hero.tsx:489-498` | “Live” pill + “Try the live board” → `/demo` implies an interactive live job board. Destination is static moments; also fights pre-launch honesty (product not live for customers today). | Open |
| A5-003 | P1 | Hero switch strip vs FAQ | `Hero.tsx:388-389` vs `marketing-launch.ts:347-348` | Hero: “Founding shops get free migration — … full history come with you.” FAQ: no one-click import yet; priority hands-on help; formal white-glove packages on later roadmap. Overclaim vs honest-operator voice. | Open |
| A5-004 | P2 | CTA funnel | `home-page.tsx:103-134`, `#faq` | After Hero, next Reserve affordance is `#reserve` at page bottom. Positioning / How-it-works / Pricing wedge / FAQ only deep-link to `/features`, `/pricing`, `/demo`, `/compare` — mid-scroll Reserve path is thin (pricing wedge is the natural insert point). | Open |
| A5-005 | P2 | Repetition | Hero sub + `HOW_SHOPRALLY_WORKS` + `HOME_FAQ` “What is ShopRally?” | Same capability laundry (PartsTech, inspections, SMS, Reviews, job board…) restated ~3× on the simplified spine. Consolidate: Hero = outcome; How-it-works = day loop; FAQ = short definition + link. | Open |
| A5-006 | P3 | Website & SEO / roadmap count | Home spine | ShopRally “Website & SEO separate” disclaimers on home = **0**. Competitor framing mentions website/SEO stack pain **3×** in `MARKET_POSITIONING` tiers (legacy/budget) — intentional contrast, not duplicate ShopRally disclaimers. Roadmap disclaimer on home = **1** (FAQ migration). Below consolidation threshold for ShopRally voice; no P2 consolidation required. | Open |
| A5-007 | P2 | Migration FAQ gap | `HOME_FAQ` switch Q | FAQ answers “can I switch?” at honesty level but does not spell cutover steps, data scope, or timeline. **Recommendation only** (do not expand FAQ in this pass): add a short compare/launch migration note or `/demo` call CTA when product owns a migration package. | Open |
| A5-008 | P3 | Testimonials | Home spine | Anonymous / locale testimonials (Skyline/Albany-era) are **off** the simplified home spine — no testimonial section in `home-page.tsx`. Residual risk only if reintroduced without attribution. | Won't fix |
| A5-009 | P2 | Tone | Hero visual vs copy | Overall spine reads honest-operator (Q4 2026, no card, founding seat ≠ access). Hype pockets are A5-001/002/003 (“Watch”, “Live” board, free full-history migration). Fix those and tone holds. | Open |
| A5-010 | P3 | Section sequence | Home spine | Argument mostly holds (fit → how → price → objections → reserve). Soft gap: MarketPositioning ends on competitive price frames with no “so what’s a day look like?” bridge into `#product` (How-it-works subhead carries the load). No redesign. | Open |
