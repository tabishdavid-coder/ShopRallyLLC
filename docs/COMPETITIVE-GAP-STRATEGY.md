# Competitive Gap Strategy — ShopRally CRM

**Last updated:** 2026-07-05  
**Audits:** 13 shop CRMs · 12+ forms platforms · ShopRally codebase inventory  
**Related:** [`competitive-gap-analysis.md`](./competitive-gap-analysis.md) · [`FORMS-HUB-TASK.md`](./FORMS-HUB-TASK.md) · [`BATCH-07-ESTIMATE-LAB-MERGE.md`](./BATCH-07-ESTIMATE-LAB-MERGE.md) · [`GROWTH-POSITIONING.md`](./GROWTH-POSITIONING.md) · [`SPRINT-ROADMAP-Q3-2026.md`](./SPRINT-ROADMAP-Q3-2026.md)

---

## Why shops switch (market pain)

Independent shops stack **4–6 vendors** because no SMS owns the full lifecycle:

| Stack layer | Typical cost | Gap |
|-------------|-------------|-----|
| Core SMS (Tekmetric / AutoLeap / Shopmonkey) | $179–439/mo | Contract lock-in (AutoLeap annual + 60-day notice); tier-gated text/labor |
| Marketing bolt-on | **+$314–345/mo** | Tekmetric Marketing, Shopmonkey CRM Essentials — not in base |
| AI receptionist | **+$99/mo** | AutoLeap AIR only |
| Website + SEO | $499+/mo or Wix | Kukui overlay; Tekmetric/AutoLeap have no native site |
| Forms (Jotform / Cognito / PandaDoc) | $50–150/mo | **No RO linkage** — manual re-entry |
| Labor data (MOTOR / Mitchell) | $134–265/mo extra | Stacked on SMS |

**ShopRally wedge:** One tenant, one customer record, one audit trail — CRM + Growth Engine + ShopSite + platform MSO tools, without the marketing tax.

---

## Top 10 exploitable gaps (ranked)

| # | Gap | Competitor weakness | ShopRally today | Sprint |
|---|-----|---------------------|--------------|--------|
| 1 | Marketing included, not $345 add-on | Tekmetric Marketing $345; Shopmonkey CRM $314 | ✅ Built | Claim now — [`GROWTH-POSITIONING.md`](./GROWTH-POSITIONING.md) |
| 2 | Forms → RO in one chain | Tekmetric/AutoLeap: booking + auth only | ❌ Forms Hub | Sprint 2 — [`FORMS-HUB-TASK.md`](./FORMS-HUB-TASK.md) |
| 3 | Website + CRM + RO unified | No native site in big three | ✅ ShopSite | Claim now |
| 4 | AutoLeap inline UX + Tekmetric matrix | No platform has both | 🟡 Lab only | Sprint 1 — [`BATCH-07-ESTIMATE-LAB-MERGE.md`](./BATCH-07-ESTIMATE-LAB-MERGE.md) |
| 5 | Platform operator console | Enterprise-priced or missing | ✅ Unique | Claim now — sales to MSO |
| 6 | Declined inspection → win-back | Manual everywhere | ✅ Automations | Polish trigger UX — Sprint 3 |
| 7 | TCPA dual consent + audit | Single checkbox on most CRMs | 🟡 `ConsentRecord` exists; wire all public forms | Sprint 1 quick win |
| 8 | Month-to-month, unlimited users | AutoLeap contracts | ✅ Plan model | Claim now |
| 9 | AI reception + notes + follow-up | Fragmented $99 bolt-ons | 🟡 Partial voice/SMS agents | Sprint 4 |
| 10 | Authorization UX (DVX + per-service) | Shop-Ware OR AutoLeap, not both | 🟡 Lab right rail | Sprint 1 merge |

---

## Five marketing pillars

See full copy and proof points in [`GROWTH-POSITIONING.md`](./GROWTH-POSITIONING.md).

| Pillar | Target buyer | Headline |
|--------|--------------|----------|
| **A — Growth included** | Shops paying SMS + Kukui/Tekmetric Marketing | "No $345 marketing subscription." |
| **B — Forms that create ROs** | Jotform + CRM double-entry shops | "One form, one RO, one audit trail." |
| **C — Built for operators** | MSO / franchise / platform investors | "Onboard, audit, and enter any shop remotely." |
| **D — AutoLeap speed, Tekmetric depth** | Service advisors | "Inline editing without annual lock-in." |
| **E — Membership native** | Oil plan / fleet shops | "BayCare subscriptions in the same CRM." |

---

## ShopRally strengths to lead with (code-backed today)

- Platform owner console — onboarding, tiers, MSA intake, enter-shop CRM
- Growth Engine — campaigns, automations, win-back, Inngest batch sends
- ShopSite — editor + public `/sites/[slug]` + platform websites pipeline
- Maintenance programs — BayCare schema, member portal, express redeem
- Public flows — `/book/[slug]`, `/approve/[token]`, `/invoice/[token]`
- Editable estimates — backend CRUD + matrix pricing (`src/server/actions/estimate.ts`)
- Job board DnD + `/workflow` split builder
- Two-way SMS + consent model (`ConsentRecord`, `customer-consent-checkboxes.tsx`)
- SEO Autopilot framework (GSC/crawl when keys set)

**Do not over-claim:** MOTOR labor, live PartsTech, time clock, inspection photos, production Clerk SSO, public API.

---

## Build priority matrix

| Priority | Work item | Doc | Effort | Switcher impact |
|:--:|-----------|-----|--------|-----------------|
| **P0** | Estimate Lab → production RO | BATCH-07 | Medium | High — daily advisor UX |
| **P0** | Forms Hub + ShopSite conversion (unified Sprint 2) | FORMS-HUB + WEBSITE-CREATION | Medium | High — website → RO |
| **P1** | TCPA on all public forms | FORMS-HUB Phase 0 | Small | Compliance differentiator |
| **P1** | Clerk + RBAC enforcement | BATCH-06 | Small (keys) | Production credibility |
| **P1** | PartsTech live flip | env + PO receive | Small | Bay trust |
| **P2** | Inspection photo upload | cloud-storage + editor | Medium | DVI parity |
| **P2** | Time clock MVP | replace placeholder | Medium | Tekmetric Grow gate |
| **P2** | Declined-line → campaign UI | automations polish | Small | Revenue on DVI |
| **P3** | AI receptionist hardening | premier-ai-roadmap | Large | vs AutoLeap AIR |
| **P3** | QuickBooks OAuth | beyond CSV | Medium | Back-office switchers |
| **Parked** | API & developer platform | API-PLATFORM-TASK | Large | ISV ecosystem |

---

## Sprint sequence (Q3 2026)

Detailed checklists: [`SPRINT-ROADMAP-Q3-2026.md`](./SPRINT-ROADMAP-Q3-2026.md)

| Sprint | Theme | Exit criteria |
|--------|-------|---------------|
| **S1** | Estimate UX + consent | Production RO uses lab inline rail; booking/work-request log `ConsentRecord` |
| **S2** | Forms Hub v1 | Work request → Estimate; embed on ShopSite; staff forms list |
| **S3** | Shop floor parity | PartsTech live; inspection photos; time clock MVP |
| **S4** | Growth polish | GBP reviews live; declined-work automation UI; pricing page pillars |

---

## Competitor quick reference

| Feature | Tekmetric | AutoLeap | Shopmonkey | ShopRally |
|---------|:---------:|:--------:|:----------:|:------:|
| Marketing in base | ❌ $345 | ⚠️ Elite | ❌ $314 | ✅ |
| Shop website | ❌ | ❌ | ❌ | ✅ |
| MSO platform console | ❌ | ❌ | ❌ | ✅ |
| Work request → RO | ❌ | ⚠️ | ✅ | ❌ → S2 |
| Form builder | ❌ | ❌ | ⚠️ | ❌ → S2 |
| Inline estimate | ⚠️ | ✅ | ⚠️ | 🟡 → S1 |
| Maintenance programs | ❌ | ❌ | ❌ | ✅ |
| Month-to-month | ✅ | ❌ | ✅ | ✅ |
| Public API | ❌ | ⚠️ Ent | ⚠️ | ❌ parked |

---

## Session handoff

When starting ShopRallyCRM agent work, paste from [`agents/ShopRallyCRM/CONTINUE.md`](../agents/ShopRallyCRM/CONTINUE.md) and pick the next unchecked item from [`agents/ShopRallyCRM/BUILD-STATE.md`](../agents/ShopRallyCRM/BUILD-STATE.md) sprint queue.
