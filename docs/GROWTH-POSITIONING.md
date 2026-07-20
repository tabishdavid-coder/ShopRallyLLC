# Growth Positioning — ShopRally vs Shop CRM Market

**Last updated:** 2026-07-09  
**Use for:** `/pricing`, sales one-pagers, onboarding deck, website hero copy  
**Canonical prices & bullets:** `src/lib/plans.ts` (`PLANS`, `pricingCard.bullets`) + `src/lib/billing-shared.ts` (`BILLING_PLAN_FEATURES`)

---

## Positioning statement

**Today:** Cloud shop CRM with a built-in Growth Engine — estimates, job board, digital approvals, online booking, SMS campaigns, shop websites, and multi-location platform tools in one stack.

**After Sprint 1–2:** The only shop CRM where every customer touchpoint creates a repair order, every declined inspection can trigger a win-back, and your website, campaigns, and bays share one customer record — without a separate marketing subscription or annual lock-in.

---

## Public plan card (canonical — Jul 2026)

Annual rates shown on `/pricing` (list / monthly billing in parentheses):

| Plan | Annual /mo | Monthly /mo | Headline offer |
|------|------------|-------------|----------------|
| **Core** | **$84.99** | $89.99 | Unlimited users & ROs, job board + RO workspace, **PartsTech catalog & punchout**, canned jobs & shop labor library, digital estimates/approvals/invoices (email), digital vehicle inspections, **Live Operations Daily Snapshot**, appointments, payment tracking, **unlimited NHTSA VIN decode**, inventory basics; **no SMS**, **no Stripe Connect**, **no licensed MOTOR** |
| **Pro** | **$239** | $279 | Everything in Core, plus licensed MOTOR, **unlimited VIN & plate decode** (Auto.dev), OEM specs & fluid capacities, PartsTech, **two-way SMS**, **Stripe Connect**, online booking, Growth Engine (automations & win-back), Google review management |
| **Elite** | **$409** | $479 | Everything in Pro, plus AI receptionist + review replies, ShopSite & Local SEO included ($228/mo value), maintenance programs, AI SEO/campaign drafting, dedicated onboarding · migration included |

**Ignition (public):** Core marketed as **Ignition** at **$89.99/mo** ($84.99/mo annual) with **PartsTech included**. Optional **AI Plus $49.99/mo** (Core-only).

**Launch (pre-GA):** Public site says **launching Q4 2026**, **50 founding seats**, **not available yet** — CTAs reserve a seat (waitlist), not instant software access. Flip when `MARKETING_LAUNCH.preLaunch = false`.

**Web presence add-ons (Core/Pro):** ShopSite **$99/mo**, Local SEO **$129/mo**, bundle **$199/mo** (+ launch setup). Included on Elite.

---

## Pillar A — Growth included (not bolted on)

**Target:** Shops paying Tekmetric ($349) + Tekmetric Marketing ($345) or Shopmonkey + CRM Essentials ($314).

| Claim | Proof in ShopRally | Competitor gap |
|-------|-----------------|----------------|
| SMS campaigns & automations in base Pro | `/marketing/campaigns`, Inngest batch sends | Tekmetric Marketing separate product |
| Win-back for lapsed customers | `/marketing/campaigns/winback` | Often manual or Kukui overlay |
| Online booking on your domain | `/book/[slug]`, ShopSite embed | Tekmetric booking beta in Marketing tier |
| Google Reviews hub | `/marketing/reviews` | Shopmonkey CRM Essentials gate |
| SEO toolkit | `/marketing/seo-automation` | Not in Tekmetric/AutoLeap core |

**Hero copy:** *"Run your shop and grow it — without a $345 marketing add-on."*

**Subhead:** *Campaigns, automations, booking, reviews, and two-way texting on Pro. No second subscription."*

---

## Pillar B — Forms that create repair orders

**Target:** Shops using Jotform + Tekmetric with manual copy-paste; Shopmonkey refugees who love Work Request Form.

| Claim | Proof today | After Forms Hub (Sprint 2) |
|-------|-------------|---------------------------|
| Booking creates customer + appt | ✅ `submitIntakeForm` | — |
| Digital estimate approval + signature | ✅ `/approve/[token]` | — |
| TCPA consent audit trail | ✅ `ConsentRecord` on booking | All public forms |
| Work request → new Estimate | ❌ | ✅ Shopmonkey parity |
| Fleet / waiver / NPS templates | ❌ | ✅ 5 opinionated templates |

**Hero copy:** *"Stop copying customer info from Jotform into your RO."*

**Subhead:** *One form, one repair order, one compliance audit trail."*

---

## Pillar C — Built for operators (MSO / franchise)

**Target:** Multi-shop groups, franchise operators, platform investors — no Tekmetric equivalent.

| Claim | Proof |
|-------|-------|
| Remote shop onboarding with MSA | `/platform/onboarding`, `/onboard/shop/[token]` |
| Plan tiers & feature gates | `/platform/billing`, `src/lib/plans.ts` |
| Enter any shop CRM | Cookie `rp_active_shop`, shop switcher |
| Website build pipeline | `/platform/websites` |
| Audit trail | `PlatformAuditEvent`, `ShopAuditEvent` |

**Hero copy:** *"Onboard shops, assign plans, and walk into any location's CRM — from one console."*

---

## Pillar D — AutoLeap speed, Tekmetric depth

**Target:** Service advisors who live in the estimate tab 8 hours/day.

| Claim | Proof today | After Sprint 1 |
|-------|-------------|----------------|
| Matrix parts/labor pricing | ✅ Settings + job cards | — |
| Per-service authorization counts | 🟡 Estimate Building Lab | Production RO right rail |
| Inline odometer + customer fields | 🟡 Lab components | Merged to `/repair-orders/[id]/estimate` |
| Canned jobs & concerns | ✅ | — |
| Month-to-month (vs AutoLeap annual) | ✅ | — |

**Hero copy:** *"Edit estimates inline — with Tekmetric-class matrix pricing and no annual contract."*

**Avoid until S1 ships:** "AutoLeap-class estimate building" on production RO URL.

---

## Pillar E — Membership & retention native

**Target:** Shops selling oil plans, prepaid maintenance, fleet programs.

| Claim | Proof |
|-------|-------|
| Maintenance plan builder | `/maintenance-programs` |
| Subscriber management | Schema + admin UI |
| Member self-service portal | `/member/[token]` |
| Express visit redeem | `/maintenance-programs/visit` |

**Hero copy:** *"Sell and manage membership plans in the same CRM as your repair orders."*

---

## Comparison table (sales sheet)

| | Tekmetric Grow | AutoLeap Pro | Shopmonkey Std | **ShopRally Pro** |
|---|:---:|:---:|:---:|:---:|
| Base price (annual shown) | ~$349/mo | ~$309/mo | ~$399/mo | **$239/mo** |
| Marketing / Growth Engine | +$345/mo | Elite tier | +$314/mo | **Included** |
| Licensed MOTOR labor | Partnership add-on | Varies | Varies | **Included on Pro** |
| Shop website | ❌ | ❌ | ❌ | **Elite / $99 add-on** |
| MSO platform console | ❌ | ❌ | ❌ | **Included** |
| Maintenance programs | ❌ | ❌ | ❌ | **Elite** |
| Work request → RO | ❌ | ⚠️ | ✅ | **Sprint 2** |
| Annual contract | No | **Yes** | No | **No** |
| Unlimited users | ✅ | ⚠️ 5 on Pro | ⚠️ tiered | **✅** |

*Verify competitor pricing before live sales use.*

---

## Objection handling

| Objection | Response |
|-----------|----------|
| "We already use Tekmetric." | ShopRally Pro includes Growth Engine (booking, SMS, win-back, reviews) Tekmetric charges as Marketing — plus platform onboarding if you operate multiple locations. |
| "AutoLeap has better estimate UX." | Sprint 1 merges our Estimate Building Lab to production; you get inline editing **and** matrix depth, month-to-month. |
| "Shopmonkey Work Request is great." | Forms Hub Sprint 2 matches work-request → Estimate; plus native campaigns without CRM Essentials pricing. |
| "We need MOTOR labor times." | Licensed MOTOR is included on Pro & Elite. |
| "Is PartsTech live?" | UI ready; live when partner credentials configured — don't claim until env flipped. |

---

## /pricing page sections (recommended)

1. **Hero** — Pillar A headline + plan cards from `PLANS`  
2. **Compare** — Feature matrix (`COMPARISON_ROWS`)  
3. **Growth Engine** — Campaigns, automations, booking, reviews  
4. **Platform** — MSO console (unique)  
5. **Plans** — Core / Pro / Elite from `src/lib/plans.ts`  
6. **FAQ** — MOTOR, ShopSite/SEO, migrations, integrations honesty  

---

## What NOT to put on marketing site yet

- Live PartsTech ordering (unless env verified)  
- Time clock / tech efficiency reports  
- Inspection photo gallery as shipping  
- Public REST API / Zapier  
- Claim "AI receptionist" as production-ready without beta label  

---

## Sync rule

When pricing cards change, update in this order:

1. `PLANS[].pricingCard.bullets` + cents in `src/lib/plans.ts`  
2. `BILLING_PLAN_FEATURES` in `src/lib/billing-shared.ts`  
3. FAQ / comparison rows / `LABOR_PLAN_COPY` / `DASHBOARD_PLAN_COPY`  
4. Marketing: home, features, pricing hero, drip, `marketing-launch.ts`, this doc  
5. CRM surfaces that hardcode web-presence dollars (subscription, SEO actions)  
