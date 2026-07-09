# Sprint Roadmap — Q3 2026 (Competitive Gap Execution)

**Last updated:** 2026-07-05  
**Strategy:** [`COMPETITIVE-GAP-STRATEGY.md`](./COMPETITIVE-GAP-STRATEGY.md)  
**Track progress in:** [`agents/ShopRallyCRM/BUILD-STATE.md`](../agents/ShopRallyCRM/BUILD-STATE.md)

---

## Sprint 1 — Estimate UX + consent (2 weeks)

**Goal:** Production RO estimate tab matches Estimate Building Lab; all public intake logs consent.

| ID | Task | Owner doc | Done |
|----|------|-----------|:----:|
| S1-01 | Merge `EstimateLabRightRail` → production RO layout | BATCH-07 | ☐ |
| S1-02 | Merge `EstimateLabOdometerBar` — remove duplicate odometer from right rail | BATCH-07 | ☐ |
| S1-03 | Inline customer/RO fields (`estimate-lab-customer-ro-section`) blur-save | BATCH-07 | ☐ |
| S1-04 | Default `variant="lab"` behavior on prod estimate (inline edit, not Edit-button-first) | BATCH-07 | ☐ |
| S1-05 | Wire `/workflow` as promoted path OR redirect estimate tab to workflow builder | BATCH-07 | ☐ |
| S1-06 | Verify `CustomerConsentCheckboxes` on all public intake surfaces | FORMS-HUB Phase 0 | ☐ |
| S1-07 | Extend `ConsentRecord.source` with `work_request_form` when S2 ships | FORMS-HUB | ☐ |
| S1-08 | Smoke-test :3004 estimate + job board + approval flow | BUILD-STATE | ☐ |

**Exit criteria:** Advisor can edit phone/email/plate/advisor/odometer inline on `/repair-orders/[id]/estimate` without opening full dialog; right rail shows auth counts + financial rollup.

---

## Sprint 2 — Forms Hub + ShopSite conversion (2–3 weeks)

**Goal:** Shopmonkey Work Request parity **embedded on every published ShopSite**.

| ID | Task | Owner | Done |
|----|------|-------|:----:|
| S2-01 | Prisma `ShopForm` + `ShopFormSubmission` | ShopRallyCRM | ☐ |
| S2-02 | Work Request → Customer + Vehicle + RO (ESTIMATE) | ShopRallyCRM | ☐ |
| S2-03 | `PublicWorkRequestForm` + `ensureDefaultWorkRequestForm` | ShopRallyCRM | ☐ |
| S2-04 | `ShopWebsiteConfig.conversionSettings` + migration | Website Code | ☐ |
| S2-05 | ShopSite hero dual CTAs + contact embed | Website Code | ☐ |
| S2-06 | Editor Conversion tab | Website Code | ☐ |
| S2-07 | Staff UI `/marketing/forms` | ShopRallyCRM | ☐ |
| S2-08 | Platform launch checklist (conversion required) | Website Code | ☐ |
| S2-09 | RO source `website_work_request` | ShopRallyCRM | ☐ |
| S2-10 | Webhook ingress (optional / Premier) | ShopRallyCRM | ☐ |

**Docs:** `FORMS-HUB-TASK.md` + `WEBSITE-CREATION-TASK.md`

**Exit criteria:** Submit from `/sites/{slug}/contact` → RO on job board; editor toggles work request on/off.

**Deferred to Sprint 3+:** Drop-off intake, NPS, fleet templates, webhook HMAC (unless S2-10 pulled in).

---

## Sprint 3 — Shop floor parity (2–3 weeks)

**Goal:** Close day-one bay trust gaps vs Tekmetric Grow.

| ID | Task | Done |
|----|------|:----:|
| S3-01 | PartsTech live provider (env + smoke test on estimate) | ☐ |
| S3-02 | PO receive → inventory qty adjust | ☐ |
| S3-03 | Inspection photo upload (Vercel Blob in `cloud-storage.ts`) | ☐ |
| S3-04 | Time clock MVP — clock in/out, link to RO job | ☐ |
| S3-05 | Declined inspection line → automation trigger UI on inspection editor | ☐ |
| S3-06 | Clerk keys wired + RBAC on all mutations (BATCH-06) | ☐ |

**Exit criteria:** DVI photos persist; tech can clock time; parts order flow works with real credentials.

---

## Sprint 4 — Growth polish + GTM (2 weeks)

**Goal:** Pricing page and sales materials match shipped product.

| ID | Task | Done |
|----|------|:----:|
| S4-01 | `/pricing` page with pillars from GROWTH-POSITIONING.md | ☐ |
| S4-02 | GBP OAuth live for reviews (or clear "connect" CTA) | ☐ |
| S4-03 | AI voice/SMS after-hours — beta flag + settings toggle | ☐ |
| S4-04 | QuickBooks OAuth spike (beyond CSV) | ☐ |
| S4-05 | Update competitive-gap-analysis.md + CLAUDE.md status | ☐ |
| S4-06 | Sales one-pager PDF/export from GROWTH-POSITIONING | ☐ |

---

## Parallel / parked

| Item | Doc | When |
|------|-----|------|
| API & developer platform | API-PLATFORM-TASK | After Forms Hub webhook proves event model |
| MOTOR labor partnership | BUILD_PLAN M7 | External license |
| **ShopRally for Techs** (iOS + Android) | [`MOBILE-TECH-APP-REQUIREMENTS.md`](./MOBILE-TECH-APP-REQUIREMENTS.md) · `agents/ShopRallyTechApp/` | After S3 time clock + DVI photos |
| Heavy-duty / fleet module | — | After light-duty parity |

---

## Definition of done (all sprints)

- Typecheck clean (`npm run typecheck` or equivalent)  
- Dev 3004 smoke on affected routes  
- No new secrets committed  
- CLAUDE.md "Current status" updated if user-facing feature ships  
- Tekmetric legal rule preserved — no copied trade dress
