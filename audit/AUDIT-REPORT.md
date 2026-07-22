# ShopRally marketing site audit — 2026-07-21

**Branch:** `audit/site-20260721`  
**Orchestrator:** Agent 0 → Agents 1–5 → **Agent 6 closeout**  
**Dev URL:** http://localhost:3031 (`npm run dev`)  
**PR title:** Site audit — 2026-07-21

---

## What changed today (user-visible)

| Area | Change |
|------|--------|
| Price | Ignition restored to **$99.99 / $94.99** (was $89.99 / $84.99 on branch) |
| Packaging | Carfax + two-way SMS on Ignition in pricing/meta/JSON-LD/positioning/compare |
| Demo honesty | Watch → **See** walkthrough; login **See the walkthrough**; hero **Preview** + walkthrough CTA |
| Migration | “Free full history” → **priority cutover help** |
| Proof | Unverifiable testimonial metrics softened |
| Competitive | Shopmonkey/Tekmetric benchmark helpers corrected |
| Legal SEO | Double “— ShopRally” titles fixed |
| Forms / OG | Waitlist errors + double-submit guards; `/opengraph-image` PNG fixed |

Full plain-language list: root `CHANGELOG.md` → **Site audit 2026-07-21**.

### Pre-audit git context (since 2026-07-19)

```
eb0cfe3 Ship CRM Google Reviews placement, Catalog/Admin nav IA, and inventory demo seed.
7f41171 Ship Macuto CRM polish: appointments calendar, dashboard KPIs/Shop Activity, and share dialogs.
b88c295 Add Garage360, Torque360, Shop-Ware, and RepairShopr compare pages.
… (marketing SEO / OG / pricing history — see full log on branch)
```

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
| A0 baseline | **PASS** (~71s, 154 pages) — `audit/build-baseline.log` |
| A6 closeout | **PASS** (exit 0; compile ~28s, TypeScript ~51s, 155/155 pages) — `audit/build-closeout.log` |
| Tests | No dedicated marketing site test suite run; repo has motor/integration scripts only (`test:motor`, etc.) — not exercised this audit |

### Warnings (non-blocking — do not deep-fix in A0)

1. `npm warn Unknown env config "devdir"` — npmrc noise.
2. Next.js 16: `"middleware" file convention is deprecated` → use `proxy`.
3. Turbopack NFT warning: unexpected file traced via `next.config.ts` → `src/generated/prisma` → `custom-domain-routing` → `/api/sites/resolve-host`.
4. Edge runtime disables static generation for some page(s).

No TypeScript or page-generation failures. Marketing routes including `/compare/ari-alternative` appear in the build route list.

---

## Agent 1 — Section-by-section UI accuracy

**Scope:** Marketing routes + homepage spine; facts/links only (no redesign).  
**Findings:** `A1-001`…`A1-016` in `audit/FINDINGS.md`.

### Counts

| Severity | Count | Notes |
|----------|------:|-------|
| P0 | 2 | A1-001 SMS listed as Pro+ on `/pricing`; A1-015 stale `$89.99`/`$84.99` plan cents + meta/JSON-LD |
| P1 | 9 | Meta/feature lists, ARI omit, JSON-LD Growth Engine, positioning subhead, FAQ integrate row; Watch/live/migration overlapped A3/A5 |
| P2 | 4 | Bundle JSDoc `$134.98`, `#product` blurb, Hero CLS/contrast note, Live badge (fixed w/ A5) |
| P3 | 1 | Dead `home-hero.tsx` |
| Needs product | 1 | A1-009 CRM still gates SMS as Pro+ while marketing includes it on Ignition |

### Commits (this agent)

| Commit | Finding |
|--------|---------|
| `d222754` | A1-001 — drop SMS from Pro+ coming-later on pricing |
| `708d6e0` | A1-015 — restore `$99.99`/`$94.99` cents + Ignition SMS/Carfax packaging |
| `5dd8a75` | A1-005 / A1-007 — meta + JSON-LD price pair + Carfax/SMS |
| `91093e8` | A1-006 — ARI + Carfax/SMS on `/compare` meta |
| `d4a99c4` | A1-005 — demo meta honesty |
| `0195336` | A1-008 — MarketPositioning subhead |
| `2cf231f` | A1-016 — pricing FAQ Carfax+SMS on Ignition |
| `85be5bc` | FINDINGS + AUDIT-REPORT Agent 1 summary |

### Verified OK

- Hero intentional silence (no `$99.99` stack / no Skyline)
- Hero CSS module-scoped
- Bundle math `$149.98` / `$144.98` (JSDoc corrected)
- Compare body pages already used price helpers + Carfax/SMS
- Legal pages: no Ignition price claims

### Open for later agents

- **A1-009 Needs product** — CRM `customerSms` / share gates vs Ignition marketing
- **A1-013 / A1-014** — Hero CLS/contrast note; dead `home-hero.tsx`
- Home `#product` Carfax/SMS blurb may sit in uncommitted `home-page.tsx` Hero spine rewrite

---

## Agent 2 — Claims research & visibility

**Scope:** Factual / numeric / competitive claims + SEO visibility (titles, meta, OG/Twitter, JSON-LD, sitemap/robots). No redesign.  
**Ledger:** `audit/CLAIMS.md` (26 rows). **Findings:** `A2-001`…`A2-008` in `audit/FINDINGS.md`.

### CLAIMS verdict counts

| Verdict | Count |
|---------|------:|
| Verified | 9 |
| OK with nuance | 10 |
| Overclaim → Fixed | 2 |
| Stale → Fixed | 2 |
| Not present | 1 |
| UNVERIFIED — needs human | 2 |
| Needs source | 0 |

### Priority claim outcomes

| Claim | Verdict | Action |
|-------|---------|--------|
| “Comparable shop platforms start at $199/mo” (blanket) | **Not present** on UI | Tekmetric Start **$199** Verified (live tekmetric.com/pricing). Shopmonkey starts **$239**. Do not reintroduce blanket industry claim. |
| Competitor capability / prices on compare pages | Mostly **Verified** / **OK with nuance** vs `COMPARE-ACCURACY.md` | Softened packaging already in `marketing-compare.ts`. |
| Anonymous testimonials 3× / +28% | **Overclaim** on committed home spine | Softened (**A2-008** `6e99481`). |
| “50 spots” scarcity | **Stale** in GROWTH-POSITIONING vs UI | Docs aligned (**A2-005**); UI already retired seat meters. |
| CARFAX / two-way SMS / PartsTech / free migration | Packaging **OK with nuance**; migration was **Overclaim** | Migration → priority cutover (**A2-001**). PartsTech punchout = launch packaging, not live-today guarantee. |

### Visibility

| Check | Result |
|-------|--------|
| Unique title + meta | Marketing routes via `marketingPageMetadata`; home `absoluteTitle` |
| No `ShopRally — … — ShopRally` | Legal hardcodes fixed (**A2-002** `66f24b7`) |
| One h1 | Primary marketing surfaces OK |
| OG / Twitter | Set per marketing page; prices via helpers |
| JSON-LD AggregateOffer | **$94.99–$99.99** current Ignition pair; description Ignition-accurate (**A1-007** / **A2-004**) |
| sitemap.xml + robots.txt | Present; compare/* incl. ARI; CRM paths disallowed |
| Lighthouse SEO | **100** on `/` (Agent 4 `audit/_a4-lighthouse.json`) |

### Commits (this agent)

| Commit | Finding |
|--------|---------|
| `66f24b7` | A2-002 — legal title template doubles |
| `6e99481` | A2-008 — unverifiable testimonial metrics |
| `c514db1` | A2-003 — Tekmetric/Shopmonkey benchmark prices |
| `67579f2` | A2-005 + CLAIMS/FINDINGS/AUDIT-REPORT trail |

### Open / deferred

- Competitor AutoLeap / Garage360 / Torque360 / ARI prices: rely on `COMPARE-ACCURACY.md`; re-verify before sales use
- Founder-shop narrative + founding-seat cap size: **UNVERIFIED — needs human**

---

## Agent 3 — UX psychology

**Persona:** 45-year-old independent shop owner, phone, skeptical, ~30s patience, on Tekmetric or paper.  
**Scope:** Homepage spine + `/pricing` `/demo` `/features` `/launch` `/compare`. Minimal code — P0/P1 Demo CTA honesty only.  
**Findings:** `A3-001`…`A3-013` in `audit/FINDINGS.md`.

### Verdict (one line)

Positioning and pre-launch honesty are strong; the **Demo path was overpromising “Watch” without video** (fixed), and trust still rests on founder voice + product peeks rather than peer proof.

### Homepage (section-by-section)

#### 1. Hero (`Hero.tsx`)

| Lens | Assessment |
|------|------------|
| **5-second test** | Pass for category: “auto repair software… one board” + Ignition Q4 2026 eyebrow. Owner knows *what* and *when*. Orbit board reads as product theater, not a price table (good — Hero price stack correctly absent). |
| **Cognitive load / jargon** | Sub packs PartsTech / CARFAX / two-way texting / DVI / appointments / payments — shop words mostly, but **dense for 30s**. “Built by a shop owner” is the clearest trust line above the fold. |
| **CTA psychology** | Clear primary: **Reserve a founding seat**. Secondary was **Watch the 3-min walkthrough** + play icon → video schema (**A3-001**, fixed → **See**). Microcopy (“Free to reserve · no card…”) supports loss-aversion honesty. |
| **Contradiction hunt** | Watch≠video (fixed). Switching strip names Tekmetric/Shopmonkey/Mitchell — good for switchers; migration promise must stay claim-accurate (Agent 1). |
| **Trust arc** | Founder line OK. Skyline/Albany scrubbed — **intentional**; don’t re-add fake locale. No logos/reviews here → thin social proof (**A3-007**). |
| **Mobile gravity** | Copy + CTAs stack before board (`Hero.module.css` ≤960px) — primary survives. Board still costs a scroll for “is the UI real?” (**A3-008**). |

#### 2. Market positioning

| Lens | Assessment |
|------|------------|
| **5-second test** | “Where ShopRally fits” + three tiers (legacy / budget / premium) — readable competitive map. |
| **Cognitive load** | Price bands + bullet lists — moderate; matches skeptic’s comparison habit. |
| **CTA psychology** | Section is educational, not a CTA fork — good. Defers action to later wedges. |
| **Trust** | Positions vs stacks without naming every rival in the hero — honest framing. |

#### 3. How it works (`#product`)

| Lens | Assessment |
|------|------------|
| **5-second test** | Three steps (estimate → yes → one board) — clear job story. |
| **Jargon** | PartsTech punchout, Live Operations Daily Snapshot — insider terms (**A3-009**). Outcomes still land for paper shops. |
| **CTA** | Soft “See features” only — doesn’t fight Hero primary. |

#### 4. Pricing wedge (`#pricing-wedge`)

| Lens | Assessment |
|------|------------|
| **5-second test** | Ignition name + price pair visible fast — good for price-seekers. |
| **CTA** | Dual outline/navy: pricing vs features — secondary path, OK. |
| **Psychology** | Inserts **evaluate-dollars** before `#reserve` waitlist (**A3-011**) — extra hop for “just get me on the list” owners. |

#### 5. FAQ (`#faq`)

| Lens | Assessment |
|------|------------|
| **5-second test** | Objections (what is it / seat / billing / PartsTech) — high value for skeptics. |
| **CTA** | Related links include “Product walkthrough” → `/demo` — consistent after honesty fix. |

#### 6. Reserve (`#reserve`)

| Lens | Assessment |
|------|------------|
| **5-second test** | Pre-launch: reserve ≠ access today — **strong honesty** (builds trust). |
| **CTA** | One primary to `/launch` + waitlist form — correct singularity. |

---

### Key routes

#### `/pricing`

| Lens | Assessment |
|------|------------|
| **5-second test** | Launch window + Ignition thesis + CRM/Website tabs — clear “what am I buying?” |
| **Cognitive load** | Plan card + comparison + AI Plus + Website tab = long page; tabs help. |
| **CTA** | Primary reserve vocabulary shared via `marketingPrimaryCta` — consistent. Secondary inherits See-walkthrough after A3-001. |
| **Trust** | Transparent inclusions (PartsTech, Carfax, SMS) help; “coming later” honesty reduces betrayal risk. |

#### `/demo` — **critical honesty surface**

| Lens | Assessment |
|------|------------|
| **5-second test** | Was: H1 “Watch a 3-minute walkthrough” + Play badge → expect **video**. Actual: optional call form + static moment cards. **P0 trust break** (**A3-001**, copy fixed). Body already said “product moments… scan in about 3 minutes” — good; H1 contradicted it. |
| **Cognitive load** | Moments are scannable; form fields add friction before reward. |
| **CTA** | Form titled “Book a call (optional)” is honest; hero H1 was not. Nav label still “Demo” (**A3-003**). |
| **Contradiction** | Nav Demo · CTA Watch/See walkthrough · no video · form-first layout (**A3-010**). |
| **Trust** | “Honest scope — Ignition at launch” bullet is excellent for skeptics. |
| **Mobile** | Long navy hero + form before moments — moments (the real “walkthrough”) land late. |

#### `/features`

| Lens | Assessment |
|------|------------|
| **5-second test** | Catalog framing (“everything in the Features menu”) — clear for deep evaluators; heavy for 30s browsers. |
| **Jargon / load** | High — many cards + Soon/AI Plus badges. Honesty labels help. |
| **CTA** | Hero dual CTAs OK; footer **three** CTAs dilute primary (**A3-006**). “watch how…” soft video cue toned to “see how” with A3-001. |

#### `/launch`

| Lens | Assessment |
|------|------------|
| **5-second test** | Reserve founding seat + Q4 — singular job. Matches Hero primary. |
| **Psychology** | Easy Start friction picker = endowment/reciprocity (good). Outcome metrics strip may feel unproven if numbers aren’t sourced (**A3-013** → Agent 1). |
| **CTA** | Primary path coherent; walkthrough as soft alternate in form footers. |

#### `/compare` (+ hub)

| Lens | Assessment |
|------|------------|
| **5-second test** | “Compare ShopRally with other shop management software” — switcher intent clear. |
| **Cognitive load** | Competitor grid + credibility hub — appropriate for evaluation mode. |
| **CTA** | Reserve primary + secondary walkthrough — one primary. Footer “3-minute walkthrough” (no “Watch”) was already safer. |
| **Trust** | Honest Pro+/roadmap labeling on hub copy supports skeptic trust. |

---

### Cross-cutting CTA map (post-fix)

| Surface | Primary | Secondary | Honesty |
|---------|---------|-----------|---------|
| Hero | Reserve a founding seat | **See** the 3-min walkthrough | Fixed A3-001 |
| Nav | — | Demo | Label still sales-flavored (A3-003) |
| `/demo` H1 | — | **See** a 3-minute walkthrough | Fixed; still no video |
| Login (mkt-only) | Reserve… | **See the walkthrough** | Fixed A3-002 (was Book a demo) |
| Features footer | View pricing (red) | See walkthrough + Reserve | Three-way split (A3-006) |

### Fixes shipped (Agent 3)

1. `audit(ux): prefer See over Watch for demo CTAs [A3-001, P0]` — `marketing-launch` secondary CTA, Hero, demo H1/meta, signup, features soft copy.  
2. `audit(ux): replace Book a demo with See the walkthrough on login [A3-002, P1]`.

No layout redesign. No Hero price table re-added. No Skyline re-intro.

---

## Agent 4 — A11y / performance / technical

**Persona:** Functional QA / bug hunt — no redesign.  
**Scope:** Marketing routes on `:3031`, Hero animation, waitlist/demo forms, links/404, mega-menu Escape, Lighthouse/screenshots if env allows.  
**Findings:** `A4-001`…`A4-008` in `audit/FINDINGS.md`.

### Verdict (one line)

Marketing routes are mostly healthy; three P1 functional bugs were fixed (compact waitlist errors, form double-submit, broken `/opengraph-image`).

### Checks

| Check | Result |
|-------|--------|
| Route smoke (curl GET) | `/`, `/pricing`, `/features`, `/demo`, `/launch`, `/compare`, compare alternatives, `/legal/*`, `/login`, `/signup`, `/sitemap.xml`, `/robots.txt` → **200**. `/this-page-should-404` → **404**. |
| `/opengraph-image` | Was empty reply (P1 **A4-003**). After fix: **200** `image/png` ~60KB. |
| Console errors | Playwright script failed initially (Chromium missing). Lighthouse Chromium later available — see scores. HTML smoke: no `Application error` string on `/`, `/demo`, `/launch`. |
| Hero animation | Timeout + `raf` cleanup on unmount; `prefers-reduced-motion` JS static path + CSS kill-switch. **No double-speed bug** found (**A4-005** Won't fix / verified OK). |
| Forms | Compact waitlist missing error UI (**A4-001** Fixed). Double-submit race on waitlist + demo (**A4-002** Fixed). Server zod + try/catch error paths OK. |
| External `noopener` | N/A on marketing-site (no `target="_blank"` externals) (**A4-007**). |
| Mega-menu Escape | Document + panel handlers close + refocus trigger; mobile menu Escape OK (**A4-006**). |
| Branded 404 | Missing `not-found.tsx` — default Next 404 only (**A4-004** Open / P2). |
| Lighthouse (`/`) | **Ran** (headless Chrome via LH CLI): Performance **78**, Accessibility **96**, SEO **100**. JSON: `audit/_a4-lighthouse.json`. |
| Screenshots / cross-viewport | **SKIPPED** — no dedicated screenshot pass. Note: Hero stacks copy before board ≤960px (existing CSS). |

### Commits (this agent)

| Commit | Finding |
|--------|---------|
| `466d091` | `audit(qa): show waitlist compact form errors [A4-001, P1]` |
| `64990c3` | `audit(qa): guard marketing forms against double-submit [A4-002, P1]` |
| `bc0dfd0` | `audit(qa): fix opengraph-image empty reply in dev [A4-003, P1]` |

### Attachments

- Lighthouse: `audit/_a4-lighthouse.json` (home `/` — Perf 78 / A11y 96 / SEO 100).
- Screenshots: **SKIPPED** (no visual capture pass this agent).
- Console Playwright: `audit/_a4-console-check.mjs` (requires `npx playwright install` for full console hunt).
---

## Agent 5 — Flow & narrative

**Persona:** Homepage as one argument — does each section answer the question the previous one raised?  
**Scope:** Simplified home spine (Hero → MarketPositioning → How it works → pricing wedge → FAQ → reserve). Small copy-only P0/P1 fixes. No redesign / no new sections. Migration FAQ depth = recommendation only.  
**Findings:** `A5-001`…`A5-009` in `audit/FINDINGS.md` (cross-refs A2-001, A3-001).

### Verdict (one line)

The spine **holds as a pre-launch argument** (fit → day loop → dollars → objections → reserve); the only hard narrative breaks were **live-board / video cues** and a **migration overclaim** (latter already aligned in Hero; live-board fixed this pass).

### Flow map (question → answer)

| # | Section | Reader question entering | Section answers | Hands off to |
|---|---------|--------------------------|-----------------|--------------|
| 1 | **Hero** | “What is this, and is it for my shop?” | Category + Ignition Q4 2026 + one-board RO cycle; Reserve / See walkthrough; switcher strip | “Why not the cheap stack / my legacy CRM?” |
| 2 | **MarketPositioning** | “Where do you sit vs what I already know?” | Legacy vs budget bolt-ons vs Ignition price/capability map | “OK — what’s a day in the product?” |
| 3 | **How it works** (`#product`) | “How does work actually move?” | Estimate → approval → one board (3 steps) + features link | “What’s the deal / founding price?” |
| 4 | **Pricing wedge** (`#pricing-wedge`) | “Can I afford / evaluate dollars?” | Ignition name + price pair + AI Plus note → `/pricing` / `/features` | “Still worried about seat / billing / switch?” |
| 5 | **FAQ** (`#faq`) | Remaining objections | What / seat / billing / PartsTech / switch honesty | “Ready to act?” |
| 6 | **Reserve** (`#reserve`) | “How do I get on the list?” | Pre-launch honesty + waitlist / `/launch` | Done |

**Soft gaps (P2/P3, no redesign):** Positioning → How-it-works bridge is thin (**A5-009**). Mid-spine Reserve path thin until `#reserve` (**A5-003**).

### CTA funnel (scroll depth → Reserve)

| Depth | Reserve path | Notes |
|-------|--------------|-------|
| Above fold (Hero) | **Primary** → `/launch` “Reserve a founding seat” | Strong; microcopy honest (no card, invite at Q4) |
| Hero secondary | → `/demo` “See the 3-min walkthrough” | Aligned after A3-001; play icon removed with **A5-001** |
| Board caption | → `/demo` “See the walkthrough” | Was “Try the live board” (**A5-001** fixed) |
| Positioning | None | Educational by design |
| How it works | Soft → `/features` only | OK |
| Pricing wedge | → `/pricing`, `/features` — **no Reserve** | Mid-funnel evaluate-then-reserve hop (**A5-003** P2) |
| FAQ related links | features / pricing / demo / compare | No `#reserve` / `/launch` |
| `#reserve` | Form + `/launch` | Correct close |

### Repetition counts (home spine)

| Theme | Count | Verdict |
|-------|------:|---------|
| ShopRally “Website & SEO separate” disclaimer | **0** | No consolidation needed (**A5-005**) |
| Competitor website/SEO stack pain (positioning cards) | **3** | Intentional contrast, not duplicate ShopRally disclaimers |
| Roadmap / “later” honesty | **1** (FAQ migration) | Under threshold |
| Capability laundry (PartsTech / DVI / SMS / Reviews / board) | **~3** (Hero + How + FAQ) | **A5-004** P2 — consolidate later |

### Tone

Honest-operator baseline is strong: Q4 2026, founding seat ≠ access, no card, FAQ refuses fake one-click import. Hype pockets were “Live” / “live board” and (historically) free full-history migration — cleared (**A5-001**, **A5-002** / **A2-001**). Anonymous testimonials remain off home (**A5-007** / **A2-006**).

### Known suspects

| Suspect | Status |
|---------|--------|
| Demo walkthrough “Watch” ≠ video | Fixed by Agent 3 (**A3-001**); residual play icon + live-board CTA fixed here (**A5-001**) |
| Anonymous testimonials on home | Confirmed **off** spine — no action |
| Migration FAQ depth | **Recommendation only** (**A5-006**): keep FAQ short; add compare/launch migration note when package is product-owned |

### Fixes shipped (Agent 5)

1. `audit(flow): honest Preview + walkthrough CTA on hero board [A5-001, P1]` — Hero `Live` → `Preview`; `Try the live board` → `See the walkthrough`; drop secondary play icon (code on branch; trail commit below).

**A5-002 / A2-001:** Hero switch strip already uses priority cutover / no invented one-click language (aligned with HOME_FAQ) — marked Fixed, no separate code commit.

No new sections. No migration FAQ expansion.

---

## Agent 6 — Fix & trail keeper (closeout)

**Role:** Reconcile P0/P1, finalize trail, verification gate, push PR (do not merge).

### Findings summary by severity

| Severity | Fixed | Open | Needs product / human | Won't fix |
|----------|------:|-----:|----------------------:|----------:|
| P0 | 3 | 0 | 0 | 0 |
| P1 | 18 | 0 | 2 | 0 |
| P2 | 6 | 11 | 0 | 0 |
| P3 | 1 | 3 | 0 | 7 |

P0 fixed: **A1-001**, **A1-015**, **A3-001**.  
P1 needs human/product: **A1-009** (Needs product), **A3-010** (Needs human — `/demo` form-first layout).

### Claims verdict counts (`audit/CLAIMS.md`)

| Verdict | Count |
|---------|------:|
| Verified | 9 |
| OK with nuance | 10 |
| Overclaim → Fixed | 2 |
| Stale → Fixed | 2 |
| Not present | 1 |
| UNVERIFIED — needs human | 2 |
| **Total rows** | **26** |

### Lighthouse (Agent 4 — home `/`)

| Category | Score |
|----------|------:|
| Performance | **78** |
| Accessibility | **96** |
| SEO | **100** |

Source: `audit/_a4-lighthouse.json`.

### Open items for the human

1. **A1-009 — CRM SMS gate vs marketing Ignition** — Public Ignition packaging includes two-way SMS; in-app still gates SMS as Pro+/not Core. Product decision required before go-live (align CRM gates **or** soften marketing).
2. **50 founding spots — UNVERIFIED** — Cap size (`foundingSpotsTotal=50`) is internal-only; confirm real seat inventory before any public scarcity copy returns. (CLAIMS ledger)
3. **Founder-shop narrative — UNVERIFIED** — “Founder still runs a real repair shop” needs human confirmation if used in sales.
4. **A3-010 — `/demo` form-first layout (P1)** — Copy honesty fixed (See, not Watch); moments still sit after the optional call form. Layout redesign intentionally out of audit scope.
5. **P2 polish backlog** — Mid-spine Reserve gap (A5-003), capability repetition (A5-004), branded 404 (A4-004), Hero CLS/contrast note (A1-013), nav “Demo” label (A3-003), features footer CTA dilution (A3-006).

### Verification gate

| Check | Result |
|-------|--------|
| `npm run build` | **PASS** (A6 closeout) |
| Scope discipline | No redesign; trail + missing A3 FINDINGS rows only |
| Marketing tests | None dedicated — not run |

### Closeout commit

`audit(trail): finalize site audit report — Agent 6 closeout [A6-CLOSE, P3]`
