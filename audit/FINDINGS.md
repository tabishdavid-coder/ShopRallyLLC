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
| A1-001 | P0 | `/pricing` Ignition highlights footer | `src/components/pricing/pricing-page.tsx` | Listed **SMS** among Pro+/“coming later” tools. Ignition includes two-way SMS (`IGNITION_LAUNCH_HIGHLIGHTS`, `PLANS.STARTER`). | Fixed |
| A1-002 | P1 | Demo CTAs | Hero / `marketing-launch` / `/demo` | “Watch a 3-minute walkthrough” implied video. Superseded by **A3-001** (Watch→See). | Fixed |
| A1-003 | P1 | Hero board caption | `Hero.tsx` | “Try the live board” + “Live” pill → `/demo` (not a live board). Fixed in tree as Preview + “See the walkthrough” (cross-ref **A5-001**). | Fixed |
| A1-004 | P1 | Hero switch strip | `Hero.tsx` | “Free migration… full history” overclaim vs HOME_FAQ. Aligned to priority cutover help (cross-ref **A2-001** / **A5-002**). | Fixed |
| A1-005 | P1 | Meta feature lists | `page.tsx` home/pricing/compare/demo | Feature enumerations omit **Carfax + two-way SMS** (features page includes both). OG/Twitter reuse descriptions. | Fixed |
| A1-006 | P1 | `/compare` meta | `src/app/(marketing)/compare/page.tsx` | Competitor list omits **ARI** though `/compare/ari-alternative` exists. | Fixed |
| A1-007 | P1 | Home JSON-LD | `src/lib/marketing-seo.ts` | SoftwareApplication cited “Growth Engine marketing” (Pro+) and omitted Carfax/SMS. Cross-ref **A2-004**. | Fixed |
| A1-008 | P1 | Market positioning subhead | `src/lib/marketing-launch.ts` | Phase-one subhead omits Carfax + two-way SMS while tier bullets include them. | Fixed |
| A1-009 | P1 | Product vs marketing SMS gate | CRM `shop-capabilities` / share actions vs `plans.ts` marketing | **Needs product:** In-app still gates two-way SMS as Pro+/not Core while public Ignition marketing includes it. | Needs product |
| A1-010 | P2 | Bundle price comment | `src/lib/plans.ts:1251` | JSDoc example still `$139.98` / `$134.98`. Runtime is `$149.98` / `$144.98`. | Fixed |
| A1-011 | P2 | Home `#product` blurb | `home-page.tsx` | Feature enumeration omits Carfax + two-way SMS. | Fixed |
| A1-012 | P2 | Hero “Live” badge | `Hero.tsx` | Synthetic animation labeled Live (now Preview — see A1-003). | Fixed |
| A1-013 | P2 | Hero CSS / layout | `Hero.module.css` | Module-scoped (OK). Note for A2/A4: orbit motion may affect CLS; dusk caption contrast is polish. No trivial one-file P1 overflow. | Open |
| A1-014 | P3 | Dead `home-hero.tsx` | `home-hero.tsx` | Unused alternate hero; migration copy aligned to priority cutover (same as Hero). | Fixed |
| A1-015 | P0 | Meta / JSON-LD / plan cents | `plans.ts` STARTER cents; marketing meta; `marketing-seo.ts` | Branch HEAD still had Ignition **`$89.99` / `$84.99`** (`monthlyCents: 8999`) and JSON-LD `price: "84.99"`. Canonical **`$99.99` / `$94.99`**. | Fixed |
| A1-016 | P1 | Pricing FAQ integrate row | `plans.ts` `PRICING_FAQ` | FAQ said Twilio SMS was Pro+/not Ignition while packaging includes two-way SMS on Ignition. | Fixed |
| A2-001 | P1 | Home hero / switch strip | `Hero.tsx`; `home-hero.tsx` | Overclaims free migration / full history. Cross-ref **A1-004** / **A5-002**. Softened to priority cutover help. | Fixed |
| A2-002 | P1 | Legal metadata | `src/app/legal/*` | Double `— ShopRally` titles under root `%s — ShopRally` template. | Fixed `66f24b7` |
| A2-003 | P1 | Competitor price helper | `plans.ts` `COMPETITOR_BENCHMARK` | Shopmonkey crm $179 stale (live Basic $239/$215); Tekmetric $179 was annual-only. | Fixed `c514db1` |
| A2-004 | P2 | JSON-LD | `marketing-seo.ts` | Growth Engine in Ignition-phase SoftwareApplication description. Cross-ref **A1-007** (fixed). | Fixed |
| A2-005 | P2 | Docs vs UI scarcity | `GROWTH-POSITIONING.md` | Docs claimed public “50 founding seats”; UI retired seat-count urgency (`foundingSpotsTotal` internal-only). Docs aligned. | Fixed |
| A2-006 | P3 | Testimonials absent on WIP spine | Marketing home (simplified) | Simplified home spine has no testimonial block — OK. | Won't fix |
| A2-007 | P3 | Lighthouse SEO | — | Agent 4 later ran LH SEO **100** on `/` (`audit/_a4-lighthouse.json`). | Won't fix |
| A2-008 | P1 | Anonymous testimonials + metrics | `home-page.tsx` (committed spine) | Unverifiable “3× faster estimates” / “+28% approval rate” + ROI quote. Softened to qualitative themes. | Fixed `6e99481` |
| A5-001 | P1 | Hero board caption | `Hero.tsx` | Live board CTA honesty. Cross-ref **A1-003**. | Fixed |
| A5-002 | P1 | Hero switch strip vs FAQ | `Hero.tsx` | Migration overclaim. Cross-ref **A1-004**. | Fixed |
| A5-003 | P2 | CTA funnel | `home-page.tsx` | Mid-spine Reserve gap. | Open |
| A5-004 | P2 | Repetition | Home spine | Capability laundry restated ~3×. | Open |
| A5-005 | P3 | Website & SEO count | Home spine | Below consolidation threshold. | Open |
| A5-006 | P2 | Migration FAQ gap | `HOME_FAQ` | No cutover steps/timeline. Recommendation only. | Open |
| A5-007 | P3 | Testimonials | Home spine | Aligns with A2-006. | Won't fix |
| A5-008 | P2 | Tone | Home spine | Hype pockets cleared with Preview/walkthrough + cutover honesty. | Fixed |
| A5-009 | P3 | Section sequence | Positioning → `#product` | Soft bridge gap. No redesign. | Open |
| A4-001 | P1 | Waitlist form (compact) | `founding-waitlist-form.tsx` compact variant | Server/validation errors never rendered — compact homepage form had no `{error}` UI (full variant did). | Fixed |
| A4-002 | P1 | Forms double-submit | `founding-waitlist-form.tsx`, `demo-page.tsx` | Rapid double-click could fire two `useTransition` submits before `pending`/`disabled` applied — duplicate tickets possible. | Fixed |
| A4-003 | P1 | Open Graph image | `src/app/opengraph-image.tsx` | `GET /opengraph-image` returned empty reply (curl 52) under Turbopack edge + nested SVG. Switched to `nodejs` + div mark; now 200 PNG (~60KB). | Fixed |
| A4-004 | P2 | 404 page | no `src/app/not-found.tsx` | Unknown paths return Next default 404 (verified `/this-page-should-404` → 404). No branded marketing 404. | Open |
| A4-005 | P3 | Hero animation | `Hero.tsx` useEffect; `Hero.module.css` reduced-motion | Timeout/`raf` cleanup on unmount present; reduced-motion static stage + CSS `animation/transition: none`. No double-speed bug in code review. | Won't fix |
| A4-006 | P3 | Mega-menu Escape | `features-mega-menu.tsx`; `marketing-header.tsx` | Escape closes panel and refocuses trigger; mobile drawer Escape wired. No break found. | Won't fix |
| A4-007 | P3 | External noopener | marketing-site | No marketing `target="_blank"` external links (footer/compare internal/`mailto`). N/A. | Won't fix |
| A4-008 | P3 | Console / screenshots | audit tooling | Full Playwright console hunt skipped (browsers missing at first). Lighthouse on `/` succeeded later (Perf 78 / A11y 96 / SEO 100 → `audit/_a4-lighthouse.json`). Screenshots skipped. | Won't fix |

## Verified OK (Agent 1 spot-checks)

| Check | Result |
|-------|--------|
| Plan name Ignition | Consistent via `marketingName` / helpers |
| Runtime price helpers | `shoprallyStarterPricePairLabel()` → `$99.99 monthly · $94.99 annual` |
| Bundle math | `$149.98` monthly / `$144.98` annual-base (`$99.99+$49.99` / `$94.99+$49.99`) |
| Hero price silence | No `$99.99` price stack / no Skyline in `Hero.tsx` |
| Hero CSS scoped | `Hero.module.css` CSS module |
| Hero body CARFAX + two-way texting | Present |
| Compare body pages | `marketing-compare.ts` includes Carfax + two-way SMS + Ignition price helper |
| Legal pages | No public Ignition price claims found |
| Sitemap / robots | Marketing routes + robots CRM disallow present |
| No lorem / TODO in marketing-site | None found (form placeholders only) |
