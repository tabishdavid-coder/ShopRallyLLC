# Growth Positioning — ShopRally vs Shop CRM Market

**Last updated:** 2026-07-05  
**Use for:** `/pricing`, sales one-pagers, onboarding deck, website hero copy  
**Strategy context:** [`COMPETITIVE-GAP-STRATEGY.md`](./COMPETITIVE-GAP-STRATEGY.md)

---

## Positioning statement

**Today:** Cloud shop CRM with a built-in Growth Engine — estimates, job board, digital approvals, online booking, SMS campaigns, shop websites, and multi-location platform tools in one stack.

**After Sprint 1–2:** The only shop CRM where every customer touchpoint creates a repair order, every declined inspection can trigger a win-back, and your website, campaigns, and bays share one customer record — without a separate marketing subscription or annual lock-in.

---

## Pillar A — Growth included (not bolted on)

**Target:** Shops paying Tekmetric ($349) + Tekmetric Marketing ($345) or Shopmonkey + CRM Essentials ($314).

| Claim | Proof in ShopRally | Competitor gap |
|-------|-----------------|----------------|
| SMS campaigns & automations in base | `/marketing/campaigns`, Inngest batch sends | Tekmetric Marketing separate product |
| Win-back for lapsed customers | `/marketing/campaigns/winback` | Often manual or Kukui overlay |
| Online booking on your domain | `/book/[slug]`, ShopSite embed | Tekmetric booking beta in Marketing tier |
| Google Reviews hub | `/marketing/reviews` | Shopmonkey CRM Essentials gate |
| SEO toolkit | `/marketing/seo-automation` | Not in Tekmetric/AutoLeap core |

**Hero copy:** *"Run your shop and grow it — without a $345 marketing add-on."*

**Subhead:** *Campaigns, automations, booking, reviews, and two-way texting included. No second subscription."*

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
| Canned jobs + concerns | ✅ | — |
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
| Base price (2026) | ~$349/mo | ~$309/mo | ~$399/mo | TBD |
| Marketing module | +$345/mo | Elite tier | +$314/mo | **Included** |
| Shop website | ❌ | ❌ | ❌ | **Included** |
| MSO platform console | ❌ | ❌ | ❌ | **Included** |
| Maintenance programs | ❌ | ❌ | ❌ | **Premier** |
| Work request → RO | ❌ | ⚠️ | ✅ | **Sprint 2** |
| Annual contract | No | **Yes** | No | **No** |
| Unlimited users | ✅ | ⚠️ 5 on Pro | ⚠️ tiered | **✅** |

*Verify competitor pricing before live sales use.*

---

## Objection handling

| Objection | Response |
|-----------|----------|
| "We already use Tekmetric." | ShopRally includes marketing, website, and MSO tools Tekmetric charges extra for — plus platform onboarding if you operate multiple locations. |
| "AutoLeap has better estimate UX." | Sprint 1 merges our Estimate Building Lab to production; you get inline editing **and** matrix depth, month-to-month. |
| "Shopmonkey Work Request is great." | Forms Hub Sprint 2 matches work-request → Estimate; plus native campaigns without CRM Essentials pricing. |
| "We need MOTOR labor times." | Quick Labor AI today; MOTOR partnership on roadmap — honest about gap. |
| "Is PartsTech live?" | UI ready; live when partner credentials configured — don't claim until env flipped. |

---

## /pricing page sections (recommended)

1. **Hero** — Pillar A headline + "Growth included" badge  
2. **Compare** — Table above (3 competitors max)  
3. **Growth Engine** — Campaigns, automations, booking, reviews, ShopSite screenshots  
4. **Platform** — MSO console screenshot (unique)  
5. **Plans** — Starter / Professional / Premier from `src/lib/plans.ts`  
6. **FAQ** — Contract, migrations, integrations honesty  

---

## What NOT to put on marketing site yet

- MOTOR / Mitchell licensed labor guide  
- Live PartsTech ordering (unless env verified)  
- Time clock / tech efficiency reports  
- Inspection photo gallery  
- Public REST API / Zapier  
- "AI receptionist" as production-ready (say "coming" or "beta")
